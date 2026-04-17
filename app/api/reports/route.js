import { getAdminSupabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";

// ============================================================
// POST：提交學習報告
// ============================================================
export async function POST(request) {
  try {
    const auth = await requireAuth(['coach', 'admin']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const body = await request.json();
    const { 
      bookingId, 
      completedItems, 
      focusScore, 
      cooperationScore, 
      completionScore, 
      understandingScore, 
      observation, 
      suggestions, 
      progressLevel 
    } = body;

    const adminSupabase = getAdminSupabase();
    
    // 1. 驗證權限：教練必須是該預約的負責教練
    const { data: booking, error: bError } = await adminSupabase
      .from('bookings')
      .select('coach_id, status, user_id')
      .eq('id', bookingId)
      .single();

    if (bError || !booking) {
      return NextResponse.json({ error: '找不到該預約記錄。' }, { status: 404 });
    }

    // ✅ 核心防護：非管理員必須是該預約的教練
    if (auth.user.role !== 'admin' && booking.coach_id !== auth.user.id) {
      console.warn(`[SECURITY ALERT] 越權報告提交嘗試: UserID: ${auth.user.id}, BookingID: ${bookingId}`);
      return NextResponse.json({ error: '您不是此預約的負責教練，無法提交報告。' }, { status: 403 });
    }

    // 2. 檢查是否已存在報告（防止重複提交）
    const { data: existing } = await adminSupabase
      .from('learning_reports')
      .select('id')
      .eq('booking_id', bookingId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: '此預約已提交過學習報告。' }, { status: 400 });
    }

    // 3. 執行插入
    const { error: insertError } = await adminSupabase
      .from('learning_reports')
      .insert([{
        booking_id: bookingId,
        coach_id: booking.coach_id,
        completed_items: completedItems,
        focus_score: focusScore,
        cooperation_score: cooperationScore,
        completion_score: completionScore,
        understanding_score: understandingScore,
        observation,
        suggestions,
        progress_level: progressLevel
      }]);

    if (insertError) throw insertError;

    return NextResponse.json({ success: true, message: '學習報告提交成功。' });
  } catch (err) {
    console.error("[REPORT POST ERROR]", err);
    return NextResponse.json({ error: '伺服器內部錯誤' }, { status: 500 });
  }
}

// ============================================================
// GET：取得學習報告
// ============================================================
export async function GET(request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('bookingId');
    if (!bookingId) return NextResponse.json({ error: '缺少 bookingId' }, { status: 400 });

    const adminSupabase = getAdminSupabase();

    // 1. 讀取報告並做權限驗證
    const { data: report, error } = await adminSupabase
      .from('learning_reports')
      .select(`
        *,
        coach:users!learning_reports_coach_id_fkey(name),
        student:users!learning_reports_user_id_fkey(name)
      `)
      .eq('booking_id', bookingId)
      .maybeSingle();

    if (error) throw error;
    if (!report) return NextResponse.json({ error: '找不到報告' }, { status: 404 });

    // ✅ 核心防護：只有管理員、相關教練或相關學員可讀
    const isAuthorized = 
      auth.user.role === 'admin' || 
      auth.user.id === report.coach_id || 
      auth.user.id === report.user_id;

    if (!isAuthorized) {
      return NextResponse.json({ error: '您無權讀取此報告。' }, { status: 403 });
    }

    return NextResponse.json({ report });
  } catch (err) {
    console.error("[REPORT GET ERROR]", err);
    return NextResponse.json({ error: '伺服器內部錯誤' }, { status: 500 });
  }
}
