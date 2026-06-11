export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';
import { safeErrorDetails } from '@/lib/safeLogging';

function supportMessageDto(row) {
  return {
    id: row.id,
    message: row.message || null,
    imageUrl: row.image_url || null,
    imagePath: row.image_path || null,
    isFromAdmin: Boolean(row.is_from_admin),
    isSystem: Boolean(row.is_system),
    createdAt: row.created_at,
  };
}

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const adminSupabase = getAdminSupabase();
    const { data, error } = await adminSupabase
      .from('support_messages')
      .select('id, message, image_url, image_path, is_from_admin, is_system, created_at')
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: true })
      .limit(200);

    if (error) throw error;

    await adminSupabase
      .from('support_messages')
      .update({ is_read_by_user: true })
      .eq('user_id', auth.user.id)
      .eq('is_from_admin', true)
      .eq('is_read_by_user', false);

    return NextResponse.json({ messages: (data || []).map(supportMessageDto) });
  } catch (error) {
    console.error('[SUPPORT HISTORY ERROR]', safeErrorDetails(error));
    return NextResponse.json({ error: '客服紀錄讀取失敗' }, { status: 500 });
  }
}
