import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';
import { canGenerateAiReportDraft, canUpsertAiDraft } from '@/lib/bookingWorkflow';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const AI_MODEL = 'gemini-2.5-flash';

export async function POST(request) {
  try {
    const auth = await requireAuth(['coach', 'admin']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: '系統未設定 GEMINI_API_KEY，無法使用 AI 功能。' }, { status: 500 });
    }

    const { bookingId, observation, suggestions } = await request.json();

    if (!observation && !suggestions) {
      return NextResponse.json({ error: '請至少填寫觀察或建議的關鍵字，AI 才有辦法幫您擴寫喔！' }, { status: 400 });
    }

    if (!bookingId) {
      return NextResponse.json({ error: '缺少 bookingId' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();
    const { data: booking, error: bookingError } = await adminSupabase
      .from('bookings')
      .select('id, coach_id, status')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: '找不到該預約記錄。' }, { status: 404 });
    }

    const draftPermission = canGenerateAiReportDraft(booking, auth.user);
    if (!draftPermission.ok) {
      return NextResponse.json({ error: draftPermission.error }, { status: draftPermission.status });
    }

    const { data: existingReport, error: existingReportError } = await adminSupabase
      .from('learning_reports')
      .select('id, completed_items')
      .eq('booking_id', bookingId)
      .maybeSingle();

    if (existingReportError) throw existingReportError;

    const draftUpsertPermission = canUpsertAiDraft(existingReport);
    if (!draftUpsertPermission.ok) {
      return NextResponse.json({ error: draftUpsertPermission.error }, { status: draftUpsertPermission.status });
    }

    const prompt = `
你是一位專業且充滿熱情的大學運動與技能指導教練。
你的任務是幫其他的教練將他們隨手寫下的「課堂觀察」與「下堂建議」關鍵字，擴寫成一段給學員看的、語氣專業、正向且鼓勵人的「學習紀錄卡評語」。

教練提供的原始內容如下：
- 教練觀察：${observation || '(無)'}
- 下堂建議：${suggestions || '(無)'}

請根據上述關鍵字，輸出最終的評語。
要求：
1. 輸出為兩段文字，第一段是「教練觀察」，第二段是「下堂建議」。
2. 中間空一行。
3. 不需要包含「教練觀察：」這類的標題前綴，直接講述內容即可。
4. 語氣要像是一位真誠關心學員的好教練，給予具體的鼓勵與方向。
5. 不要自己發明原始內容沒有提到的技術細節，盡量圍繞教練給的關鍵字去潤飾與擴寫。
    `;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${AI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API Error:', errorData);
      return NextResponse.json({ error: 'AI 生成失敗，請稍後再試。' }, { status: 500 });
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Split the generated text into observation and suggestions
    // The prompt asks for two paragraphs separated by a blank line.
    const paragraphs = generatedText.split('\n\n').map(p => p.trim()).filter(Boolean);
    
    let expandedObservation = paragraphs[0] || observation;
    let expandedSuggestions = paragraphs[1] || suggestions || '';

    // Fallback if AI didn't split well
    if (paragraphs.length === 1) {
       expandedObservation = paragraphs[0];
       expandedSuggestions = '';
    }

    const promptSnapshot = JSON.stringify({
      source_observation: observation || '',
      source_suggestions: suggestions || '',
      model: AI_MODEL,
      generated_at: new Date().toISOString(),
    });

    const { data: draftReport, error: draftError } = await adminSupabase
      .from('learning_reports')
      .upsert({
        booking_id: bookingId,
        coach_id: booking.coach_id,
        completed_items: '__AI_DRAFT__',
        focus_score: 1,
        cooperation_score: 1,
        completion_score: 1,
        understanding_score: 1,
        observation: '',
        suggestions: '',
        progress_level: 'none',
        ai_draft_observation: expandedObservation,
        ai_draft_suggestions: expandedSuggestions,
        ai_generated_at: new Date().toISOString(),
        ai_model: AI_MODEL,
        ai_prompt_snapshot: promptSnapshot,
      }, { onConflict: 'booking_id' })
      .select('id, ai_draft_observation, ai_draft_suggestions, ai_generated_at, ai_model')
      .single();

    if (draftError) throw draftError;

    await adminSupabase.from('audit_logs').insert([{
      actor_id: auth.user.id,
      actor_role: auth.user.role,
      action: 'GENERATE_AI_REPORT_DRAFT',
      target_id: bookingId,
      details: promptSnapshot,
    }]);

    return NextResponse.json({ 
      success: true, 
      draftId: draftReport.id,
      draft: {
        observation: draftReport.ai_draft_observation,
        suggestions: draftReport.ai_draft_suggestions,
        generatedAt: draftReport.ai_generated_at,
        model: draftReport.ai_model,
      }
    });

  } catch (error) {
    console.error('Generate report error:', error);
    return NextResponse.json({ error: '伺服器內部錯誤' }, { status: 500 });
  }
}
