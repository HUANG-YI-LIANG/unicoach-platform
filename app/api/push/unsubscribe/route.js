export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';

export async function POST(request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const { endpoint } = await request.json();

    if (!endpoint || typeof endpoint !== 'string') {
      return NextResponse.json({ error: '缺少 endpoint' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();

    const { error } = await adminSupabase
      .from('push_subscriptions')
      .update({
        revoked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', auth.user.id)
      .eq('endpoint', endpoint);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[PUSH UNSUBSCRIBE ERROR]', error);
    return NextResponse.json({ error: '取消推播訂閱失敗' }, { status: 500 });
  }
}
