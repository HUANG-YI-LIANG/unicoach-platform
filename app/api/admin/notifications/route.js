import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';

export async function POST(request) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const body = await request.json();
    const { title, content, discount_code, discount_percent, user_id } = body;
    const normalizedTitle = title?.trim();
    const normalizedContent = content?.trim();
    const normalizedCode = discount_code ? String(discount_code).trim().toUpperCase() : null;
    const normalizedPercent =
      discount_percent === null || discount_percent === undefined || discount_percent === ''
        ? null
        : Number(discount_percent);

    if (!normalizedTitle || !normalizedContent) {
      return NextResponse.json({ error: '請填寫通知標題與內容' }, { status: 400 });
    }

    if (normalizedPercent !== null && (!Number.isInteger(normalizedPercent) || normalizedPercent < 1 || normalizedPercent > 100)) {
      return NextResponse.json({ error: '折扣百分比必須介於 1 到 100 之間' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();
    const { error } = await adminSupabase
      .from('user_notifications')
      .insert([{
        title: normalizedTitle,
        content: normalizedContent,
        discount_code: normalizedCode,
        discount_percent: normalizedPercent,
        user_id: user_id || null,
      }]);

    if (error) throw error;

    try {
      await adminSupabase.from('audit_logs').insert([{
        action: 'SEND_NOTIFICATION',
        actor_id: auth.user.id,
        actor_role: 'admin',
        details: JSON.stringify({
          title: normalizedTitle,
          global: !user_id,
          discount_code: normalizedCode,
          discount_percent: normalizedPercent,
        }),
      }]);
    } catch (auditError) {
      console.warn('[SEND NOTIFICATION AUDIT WARNING]', auditError);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[SEND NOTIFICATION ERROR]', err);
    return NextResponse.json({ error: '發送通知失敗' }, { status: 500 });
  }
}
