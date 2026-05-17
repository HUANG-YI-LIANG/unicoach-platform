export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const adminSupabase = getAdminSupabase();

    const { data, error } = await adminSupabase
      .from('push_subscriptions')
      .select('id, created_at, updated_at, last_seen_at, user_agent')
      .eq('user_id', auth.user.id)
      .is('revoked_at', null)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      enabled: Boolean(data?.length),
      count: data?.length || 0,
      subscriptions: data || [],
    });
  } catch (error) {
    console.error('[PUSH STATUS ERROR]', error);
    return NextResponse.json({ error: '讀取推播狀態失敗' }, { status: 500 });
  }
}
