import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const resolvedParams = await params;
    const userId = resolvedParams.id;
    if (!userId) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    const adminSupabase = getAdminSupabase();

    // 1. Fetch current warning count
    const { data: warningSetting } = await adminSupabase
      .from('platform_settings')
      .select('value')
      .eq('key', `user_warnings_${userId}`)
      .single();

    let count = 0;
    if (warningSetting?.value) {
      count = parseInt(warningSetting.value, 10) || 0;
    }

    count += 1;

    // 2. Update warning count
    await adminSupabase
      .from('platform_settings')
      .upsert({
        key: `user_warnings_${userId}`,
        value: count.toString()
      });

    // 3. Send message to support chat
    const warningMessage = `【系統警告】您已嚴重違反平台規範（第 ${count} 次）。請立刻停止違規行為。若集滿 3 次警告，您的帳號將會被永久停用。`;
    
    await adminSupabase
      .from('support_messages')
      .insert({
        user_id: userId,
        admin_id: auth.user.id,
        message: warningMessage,
        is_from_admin: true,
        is_system: true,
        is_read_by_admin: true,
        is_read_by_user: false,
      });

    // 4. If count >= 3, freeze user
    let isFrozen = false;
    if (count >= 3) {
      await adminSupabase
        .from('users')
        .update({ is_frozen: true })
        .eq('id', userId);
      isFrozen = true;
    }

    return NextResponse.json({ success: true, count, is_frozen: isFrozen });
  } catch (err) {
    console.error('[ADMIN WARNING ERROR]', err);
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 });
  }
}
