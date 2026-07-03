export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { getAdminSupabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { canSubmitLearningReport } from "@/lib/bookingWorkflow";
import { maskIdentifier, safeErrorDetails } from "@/lib/safeLogging";

const REPORT_DETAIL_SELECT = [
  'id',
  'booking_id',
  'user_id',
  'coach_id',
  'completed_items',
  'focus_score',
  'cooperation_score',
  'completion_score',
  'understanding_score',
  'observation',
  'suggestions',
  'progress_level',
  'ai_applied_at',
  'created_at',
  'coach:users!learning_reports_coach_id_fkey(name)',
  'student:users!learning_reports_user_id_fkey(name)',
].join(', ');

function isDuplicateLearningReportError(error) {
  const text = [error?.code, error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(' ');
  return /23505|duplicate key|learning_reports.*booking_id|booking_id.*unique/i.test(text);
}

function toReportDetailDto(report) {
  return {
    id: report.id,
    booking_id: report.booking_id,
    user_id: report.user_id,
    coach_id: report.coach_id,
    completed_items: report.completed_items,
    focus_score: report.focus_score,
    cooperation_score: report.cooperation_score,
    completion_score: report.completion_score,
    understanding_score: report.understanding_score,
    observation: report.observation,
    suggestions: report.suggestions,
    progress_level: report.progress_level,
    ai_applied_at: report.ai_applied_at,
    created_at: report.created_at,
    coach: report.coach ? { name: report.coach.name ?? null } : null,
    student: report.student ? { name: report.student.name ?? null } : null,
  };
}

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

    if (completedItems === '__AI_DRAFT__') {
      return NextResponse.json({ error: '正式學習報告內容不合法。' }, { status: 400 });
    }

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
        console.warn('[SECURITY ALERT] 越權報告提交嘗試', {
          userId: maskIdentifier(auth.user.id),
          bookingId: maskIdentifier(bookingId),
        });
      }
      return NextResponse.json({ error: reportPermission.error }, { status: reportPermission.status });
    }

    // 2. 檢查是否已存在報告（防止重複提交）
    const { data: existing, error: existingError } = await adminSupabase
      .from('learning_reports')
      .select('id, completed_items, ai_draft_observation, ai_draft_suggestions')
      .eq('booking_id', bookingId)
      .maybeSingle();

    if (existingError) throw existingError;

    const isDraftOnly = existing?.completed_items === '__AI_DRAFT__';
    if (existing && !isDraftOnly) {
      return NextResponse.json({ error: '此預約已提交過學習報告。' }, { status: 409 });
    }

    const reportPayload = {
      booking_id: bookingId,
      user_id: booking.user_id,
      coach_id: booking.coach_id,
      completed_items: completedItems,
      focus_score: focusScore,
      cooperation_score: cooperationScore,
      completion_score: completionScore,
      understanding_score: understandingScore,
      observation,
      suggestions,
      progress_level: progressLevel,
      ...(applyAiDraft ? { ai_applied_at: new Date().toISOString() } : {}),
    };

    // 3. 執行插入或將 AI 草稿轉為正式報告；用 affected-row 檢查避免 stale draft 被正式報告取代後仍覆蓋
    const { data: savedReport, error: insertError } = existing
      ? await adminSupabase
          .from('learning_reports')
          .update(reportPayload)
          .eq('id', existing.id)
          .eq('completed_items', '__AI_DRAFT__')
          .select('id')
          .maybeSingle()
      : await adminSupabase
          .from('learning_reports')
          .insert([{
            booking_id: bookingId,
            user_id: booking.user_id,
            coach_id: booking.coach_id,
            completed_items: completedItems,
            focus_score: focusScore,
            cooperation_score: cooperationScore,
            completion_score: completionScore,
            understanding_score: understandingScore,
            observation,
            suggestions,
            progress_level: progressLevel,
            ...(applyAiDraft ? { ai_applied_at: reportPayload.ai_applied_at } : {}),
          }])
          .select('id')
          .maybeSingle();

    if (insertError) {
      if (isDuplicateLearningReportError(insertError)) {
        return NextResponse.json({ error: '此預約已提交過學習報告，請重新整理後再試。' }, { status: 409 });
      }
      throw insertError;
    }

    if (!savedReport) {
      return NextResponse.json({ error: '此預約報告已被其他操作更新，請重新整理後再試。' }, { status: 409 });
    }

    // 4. Update Student Warnings logic
    const averageScore = (focusScore + cooperationScore + completionScore + understandingScore) / 4;
    const { data: studentUser, error: studentError } = await adminSupabase
      .from('users')
      .select('warnings_count, consecutive_excellent_ratings')
      .eq('id', booking.user_id)
      .single();

    if (!studentError && studentUser) {
      let newConsecutive = studentUser.consecutive_excellent_ratings || 0;
      let newWarnings = studentUser.warnings_count || 0;

      if (averageScore >= 4.8) {
        newConsecutive += 1;
        if (newConsecutive >= 3 && newWarnings > 0) {
          newWarnings -= 1;
          newConsecutive = 0; // Reset after redemption
        }
      } else {
        newConsecutive = 0; // Reset if below 4.8
      }

      if (newConsecutive !== studentUser.consecutive_excellent_ratings || newWarnings !== studentUser.warnings_count) {
        await adminSupabase
          .from('users')
          .update({
            warnings_count: newWarnings,
            consecutive_excellent_ratings: newConsecutive
          })
          .eq('id', booking.user_id);
      }
    }

    await adminSupabase.from('audit_logs').insert([{
      actor_id: auth.user.id,
      actor_role: auth.user.role,
      action: applyAiDraft ? 'APPLY_AI_REPORT_DRAFT' : 'SUBMIT_LEARNING_REPORT',
      target_id: bookingId,
      details: JSON.stringify({ report_id: savedReport.id }),
    }]);

    return NextResponse.json({ success: true, message: '學習報告提交成功。' });
  } catch (err) {
    console.error("[REPORT POST ERROR]", safeErrorDetails(err));
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
      .select(REPORT_DETAIL_SELECT)
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

    return NextResponse.json({ report: toReportDetailDto(report) });
  } catch (err) {
    console.error("[REPORT GET ERROR]", safeErrorDetails(err));
    return NextResponse.json({ error: '伺服器內部錯誤' }, { status: 500 });
  }
}
