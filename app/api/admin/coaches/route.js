import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';

/**
 * GET: 管理員取得所有教練列表及其審核狀態
 */
export async function GET(request) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const adminSupabase = getAdminSupabase();
    const { data: coaches, error } = await adminSupabase
      .from('coaches')
      .select(`
        *,
        user:users(id, name, email, avatar_url)
      `);

    if (error) throw error;
    return NextResponse.json({ coaches });
  } catch (err) {
    console.error('[ADMIN COACH LIST ERROR]', err);
    return NextResponse.json({ error: '無法獲取教練列表' }, { status: 500 });
  }
}
