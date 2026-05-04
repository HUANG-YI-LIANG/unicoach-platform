import { getAdminSupabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { canSubmitLearningReport } from "@/lib/bookingWorkflow";

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
      progressLevel,
      applyAiDraft = false,
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

    // ✅ 核心防護：驗證負責教練/管理員與報告建立時機
    const reportPermission = canSubmitLearningReport(booking, auth.user);
    if (!reportPermission.ok) {
      if (reportPermission.status === 403) {
        console.warn(`[SECURITY ALERT] 越權報告提交嘗試: UserID: ${auth.user.id}, BookingID: ${bookingId}`);
      }
      return NextResponse.json({ error: reportPermission.error }, { status: reportPermission.status });
    }

    // 2. 檢查是否已存在報告（防止重複提交）
    const { data: existing } = await adminSupabase
      .from('learning_reports')
      .select('id, completed_items, ai_draft_observation, ai_draft_suggestions')
      .eq('booking_id', bookingId)
      .maybeSingle();

    const isDraftOnly = existing?.completed_items === '__AI_DRAFT__';
    if (existing && !isDraftOnly) {
      return NextResponse.json({ error: '此預約已提交過學習報告。' }, { status: 400 });
    }

    const reportPayload = {
      booking_id: bookingId,
      coach_id: booking.coach_id,
      completed_items: completedItems,
      focus_score: focusScore,
      cooperation_score: cooperationScore,
      completion_score: completionScore,
      understanding_score: understandingScore,
      observation,
      suggestions,
      progress_level: progressLevel,
    };

    if (applyAiDraft) {
      reportPayload.ai_applied_at = new Date().toISOString();
    }

    // 3. 執行插入或將 AI 草稿轉為正式報告
    const query = existing
      ? adminSupabase
          .from('learning_reports')
          .update(reportPayload)
          .eq('id', existing.id)
      : adminSupabase
          .from('learning_reports')
          .insert([{
            ...reportPayload,
          }]);

    const { error: insertError } = await query;

    if (insertError) throw insertError;

    await adminSupabase.from('audit_logs').insert([{
      actor_id: auth.user.id,
      actor_role: auth.user.role,
      action: applyAiDraft ? 'APPLY_AI_REPORT_DRAFT' : 'SUBMIT_LEARNING_REPORT',
      target_id: bookingId,
      details: JSON.stringify({ report_id: existing?.id || null }),
    }]);

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
      .neq('completed_items', '__AI_DRAFT__')
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
