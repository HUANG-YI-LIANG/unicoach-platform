export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';

export async function POST(request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const subscription = await request.json();
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json({ error: 'Invalid subscription object' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();

    // Upsert subscription based on endpoint
    const { error } = await adminSupabase.from('push_subscriptions').upsert({
      user_id: auth.user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'endpoint' });

    if (error) {
      console.error('[PUSH SUBSCRIBE DB ERROR]', error);
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[PUSH SUBSCRIBE ERROR]', err);
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
  }
}
