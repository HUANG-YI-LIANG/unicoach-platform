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
    const { status: newStatus, cancelReason } = await request.json(); 
    
    const adminSupabase = getAdminSupabase();
    
    // 1. 讀取預約現況並驗證身份
    const { data: booking, error: bError } = await adminSupabase
      .from('bookings')
      .select('*, users!bookings_user_id_fkey(referred_by, referral_completed)')
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
    
    if (newStatus === 'completed') {
      updateData.completed_at = new Date().toISOString();
    } else if (newStatus === 'cancelled') {
      updateData.cancelled_at = new Date().toISOString();
      // 加入取消原因
      if (cancelReason) {
        updateData.cancel_reason = cancelReason;
      }
    } else if (newStatus === 'refunded') {
      updateData.refunded_at = new Date().toISOString();
    }

    const { error: updateError } = await adminSupabase
      .from('bookings')
      .update(updateData)
      .eq('id', id);

    if (updateError) throw updateError;

    // 4. 防作弊機制：推薦獎勵處理
    if (newStatus === 'completed') {
      const student = booking.users;
      // 規則 2 & 3：有推薦人且是首次完課
      if (student && student.referred_by && student.referral_completed === false) {
        // 更新學員標記，避免後續重複發放
        await adminSupabase.from('users').update({ referral_completed: true }).eq('id', booking.user_id);
        
        // 規則 4 & 8：產生 pending 狀態日誌，24小時後發放，記錄 IP
        const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
        const suspiciousFlags = { ip };
        const releaseTime = new Date();
        releaseTime.setHours(releaseTime.getHours() + 24);
        
        await adminSupabase.from('reward_logs').insert([{
          referrer_user_id: student.referred_by,
          referred_user_id: booking.user_id,
          order_id: id,
          reward_type: 'referral_bonus',
          reward_amount: 100, // 暫定推薦獎金 100，可後續從設定讀取
          status: 'pending',
          release_time: releaseTime.toISOString(),
          suspicious_flags: suspiciousFlags
        }]);
      }
    } else if (newStatus === 'cancelled' || newStatus === 'refunded') {
      // 規則 5：退款追回機制
      const { data: logs } = await adminSupabase.from('reward_logs').select('id, status').eq('order_id', id);
      if (logs && logs.length > 0) {
        for (const log of logs) {
          if (log.status === 'pending') {
            await adminSupabase.from('reward_logs')
              .update({ status: 'cancelled', cancelled_reason: `Order ${newStatus}` })
              .eq('id', log.id);
          } else if (log.status === 'released') {
            await adminSupabase.from('reward_logs')
              .update({ status: 'reversed', cancelled_reason: `Order ${newStatus} after release` })
              .eq('id', log.id);
          }
        }
      }
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
