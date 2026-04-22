import { getAdminSupabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";

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
    coach: ["completed", "cancelled"],
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

    // 2. 角色判定與權限檢查
    let role = null;
    if (auth.user.role === 'admin') role = 'admin';
    else if (auth.user.id === booking.coach_id) role = 'coach';
    else if (auth.user.id === booking.user_id) role = 'student';

    if (!role) {
      console.warn(`[SECURITY ALERT] 越權預約更新嘗試: UserID: ${auth.user.id}, BookingID: ${id}`);
      return NextResponse.json({ error: "您無權操作此預約。" }, { status: 403 });
    }

    // 3. 狀態機驗證 (Admin 排除在狀態機限制外)
    if (role !== 'admin') {
      const allowedTransitions = STATUS_TRANSITION_RULES[booking.status]?.[role] || [];
      if (!allowedTransitions.includes(newStatus)) {
        return NextResponse.json({ 
          error: `非法的操作：暫時不允許從 ${booking.status} 轉換為 ${newStatus}。`,
          role 
        }, { status: 400 });
      }
    }

    // 4. 特殊邏輯：完課前檢查學習報告
    if (newStatus === 'completed') {
      const { data: report } = await adminSupabase
        .from('learning_reports')
        .select('id')
        .eq('booking_id', id)
        .neq('completed_items', '__AI_DRAFT__')
        .single();
      if (!report) {
        return NextResponse.json({ error: '必須先填寫學習報告，才能將課程標記為完成。' }, { status: 400 });
      }
    }

    // 5. 執行更新
    const updateData = { status: newStatus };
    if (newStatus === 'completed') updateData.completed_at = new Date().toISOString();

    const { error: updateError } = await adminSupabase
      .from('bookings')
      .update(updateData)
      .eq('id', id);

    if (updateError) throw updateError;

    // 6. 管理員審計日誌
    if (role === 'admin') {
      await adminSupabase.from('audit_logs').insert([{
        admin_id: auth.user.id, 
        action: 'UPDATE_BOOKING_STATUS', 
        target_id: id, 
        details: `From ${booking.status} to ${newStatus}`
      }]);
    }

    // 7. 教練獎勵邏輯 (如果是完課)
    if (newStatus === 'completed' && role === 'coach') {
      const { count: completedCount } = await adminSupabase
        .from('bookings')
        .select('id', {count: 'exact', head: true})
        .eq('coach_id', booking.coach_id)
        .eq('status', 'completed');
      
      let newCommission = 45;
      if (completedCount >= 10) newCommission = 15;
      else if (completedCount >= 5) newCommission = 20;
      else if (completedCount >= 2) newCommission = 25;
      else if (completedCount >= 1) newCommission = 35;

      const { data: currentCoach } = await adminSupabase.from('coaches').select('commission_rate').eq('user_id', booking.coach_id).single();
      if (currentCoach && currentCoach.commission_rate !== newCommission) {
        await adminSupabase.from('coaches').update({ commission_rate: newCommission }).eq('user_id', booking.coach_id);
      }
    }

    return NextResponse.json({ success: true, newStatus });
  } catch (err) {
    console.error("[BOOKING STATUS ERROR]", err);
    return NextResponse.json({ error: '伺服器內部錯誤' }, { status: 500 });
  }
}
