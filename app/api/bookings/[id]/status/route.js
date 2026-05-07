export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { getAdminSupabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import {
  canCompleteBooking,
  canTransitionBookingStatus,
  buildExpiredPendingPaymentUpdate,
  getPendingPaymentExpirationState,
} from "@/lib/bookingWorkflow";

// ============================================================
// 預約狀態機：精確定義每個角色可執行的轉換
// 注意：實際驗證由 lib/bookingWorkflow.js 執行；此表保留作為 route 層文件化規則。
// ============================================================
const STATUS_TRANSITION_RULES = {
  // 目前狀態: { 角色: [允許轉換到的目標狀態] }
  pending_payment: {
    student: ["cancelled"],
  },
  scheduled: {
    student: ["cancelled"],
    coach: ["in_progress", "cancelled"],
  },
  in_progress: {
    coach: ["pending_completion"],
  },
  pending_completion: {
    student: ["completed"], // 學生確認完課
  },
  completed: {},  // 終態
  cancelled: {},  // 終態
  refunded: {},   // 終態
};

function mapCompletionRpcError(error) {
  const text = [error?.code, error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(' ');

  if (/booking_completion_conflict|409|P0001/i.test(text)) {
    return { status: 409, error: '預約狀態已被其他操作更新，請重新整理後再試。' };
  }
  if (/booking_not_paid/i.test(text)) {
    return { status: 400, error: '預約尚未完成付款，不能標記為完成。' };
  }
  if (/booking_not_ended/i.test(text)) {
    return { status: 400, error: '課程尚未結束，不能標記為完成。' };
  }
  if (/missing_final_learning_report/i.test(text)) {
    return { status: 400, error: '必須先填寫正式學習報告，才能將課程標記為完成。' };
  }
  return null;
}

export async function POST(request, { params }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return NextResponse.json(auth, { status: auth.status });
    
    const { id } = await params;
    const { status: newStatus, cancel_reason: cancelReason } = await request.json();
    
    const adminSupabase = getAdminSupabase();
    
    // 1. 讀取預約現況並驗證身份
    const { data: booking, error: bError } = await adminSupabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single();

    if (bError || !booking) return NextResponse.json({ error: '找不到該預約記錄' }, { status: 404 });

    const expiration = getPendingPaymentExpirationState(booking);
    if (expiration.expired) {
      await adminSupabase
        .from('bookings')
        .update(buildExpiredPendingPaymentUpdate())
        .eq('id', id)
        .eq('status', 'pending_payment');

      return NextResponse.json({ error: expiration.error }, { status: expiration.status });
    }

    // 2. 角色判定與狀態機驗證
    let hasFinalReport = false;
    if (newStatus === 'completed') {
      const { data: report } = await adminSupabase
        .from('learning_reports')
        .select('id')
        .eq('booking_id', id)
        .neq('completed_items', '__AI_DRAFT__')
        .maybeSingle();
      hasFinalReport = Boolean(report);

      const completionCheck = canCompleteBooking(booking, { hasFinalReport });
      if (!completionCheck.ok) {
        return NextResponse.json({ error: completionCheck.error }, { status: completionCheck.status });
      }
    }

    const transition = canTransitionBookingStatus({
      actor: auth.user,
      booking,
      newStatus,
      hasFinalReport,
    });

    if (!transition.ok) {
      return NextResponse.json({
        error: transition.error,
        role: transition.role,
      }, { status: transition.status });
    }

    const role = transition.role;
    const isCoachCancellation = role === 'coach' && newStatus === 'cancelled';
    const isStudentCancellation = role === 'student' && newStatus === 'cancelled';

    // 3. 執行更新；completed 需由 DB Transaction RPC 一次完成狀態更新與推薦獎勵發放
    if (newStatus === 'completed') {
      const { error: completeError } = await adminSupabase.rpc('complete_booking_with_referral', {
        p_booking_id: id,
        p_actor_id: auth.user.id,
        p_previous_status: booking.status,
      });

      if (completeError) {
        const mapped = mapCompletionRpcError(completeError);
        if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
        throw completeError;
      }
    } else {
      const updateData = { status: newStatus };
      if (newStatus === 'cancelled') {
        updateData.cancelled_at = new Date().toISOString();
        if (typeof cancelReason === 'string' && cancelReason.trim()) {
          updateData.cancel_reason = cancelReason.trim().slice(0, 500);
        }
        if (isCoachCancellation) {
          updateData.cancel_fault_party = 'coach_pending_review';
        } else if (isStudentCancellation) {
          updateData.cancel_fault_party = 'student_fault';
        }
      }
      const { error: updateError } = await adminSupabase
        .from('bookings')
        .update(updateData)
        .eq('id', id)
        .eq('status', booking.status);

      if (updateError) throw updateError;
    }

    // 6. 管理員審計日誌
    if (role === 'admin') {
      try {
        await adminSupabase.from('audit_logs').insert([{
          actor_id: auth.user.id,
          actor_role: 'admin',
          action: 'UPDATE_BOOKING_STATUS',
          target_id: id,
          details: `From ${booking.status} to ${newStatus}`
        }]);
      } catch (auditError) {
        console.warn('[BOOKING STATUS AUDIT LOG ERROR]', auditError);
      }
    }

    return NextResponse.json({ success: true, newStatus });
  } catch (err) {
    console.error("[BOOKING STATUS ERROR]", err);
    return NextResponse.json({ error: '伺服器內部錯誤' }, { status: 500 });
  }
}
