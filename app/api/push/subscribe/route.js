export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';

export async function POST(request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const rawBody = await request.json();
    const subscription = rawBody.subscription || rawBody;
    const userAgent = rawBody.userAgent || request.headers.get('user-agent') || null;

    if (
      !subscription ||
      typeof subscription.endpoint !== 'string' ||
      !subscription.endpoint.startsWith('https://') ||
      !subscription.keys ||
      typeof subscription.keys.p256dh !== 'string' ||
      typeof subscription.keys.auth !== 'string'
    ) {
      return NextResponse.json({ error: 'Invalid subscription object' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();

    const { data: existingSubscription, error: existingError } = await adminSupabase
      .from('push_subscriptions')
      .select('user_id')
      .eq('endpoint', subscription.endpoint)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existingSubscription && existingSubscription.user_id !== auth.user.id) {
      return NextResponse.json({ error: 'Subscription endpoint already belongs to another user' }, { status: 409 });
    }

    // Upsert subscription based on endpoint
    const { error } = await adminSupabase.from('push_subscriptions').upsert({
      user_id: auth.user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      user_agent: userAgent,
      revoked_at: null,
      failure_count: 0,
      last_error: null,
      last_seen_at: new Date().toISOString(),
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
