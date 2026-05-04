import { getAdminSupabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { canTransitionBookingStatus, buildExpiredPendingPaymentUpdate, getPendingPaymentExpirationState } from "@/lib/bookingWorkflow";

// ============================================================
// 預約狀態機：精確定義每個角色可執行的轉換
// ============================================================
const STATUS_TRANSITION_RULES = {
  // 目前狀態: { 角色: [允許轉換到的目標狀態] }
  pending_payment: {
    student: ["cancelled"],
    coach: ["cancelled"],
  },
  scheduled: {
    student: ["cancelled"],
    coach: ["in_progress", "completed", "cancelled"],
  },
  in_progress: {
    coach: ["pending_completion", "completed"],
  },
  pending_completion: {
    student: ["completed"], // 學生確認完課
  },
  completed: {},  // 終態
  cancelled: {},  // 終態
  refunded: {},   // 終態
};

export async function POST(request, { params }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return NextResponse.json(auth, { status: auth.status });
    
    const { id } = await params;
    const { status: newStatus } = await request.json(); 
    
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

    // 3. 執行更新
    const updateData = { status: newStatus };
    if (newStatus === 'completed') updateData.completed_at = new Date().toISOString();

    const { error: updateError } = await adminSupabase
      .from('bookings')
      .update(updateData)
      .eq('id', id);

    if (updateError) throw updateError;

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
