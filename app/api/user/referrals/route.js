export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';

export async function GET(request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return NextResponse.json(auth, { status: auth.status });
    
    const adminSupabase = getAdminSupabase();

    // Fetch referral rewards where this user is the referrer
    const { data: rewards, error } = await adminSupabase
      .from('referral_rewards')
      .select(`
        id,
        reward_points,
        reward_rate,
        status,
        created_at,
        release_at,
        referee:users!referral_rewards_referee_id_fkey(name)
      `)
      .eq('referrer_id', auth.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ rewards: rewards || [] });
  } catch (err) {
    console.error('[API USER REFERRALS GET ERROR]', err);
    return NextResponse.json({ error: '無法取得推廣明細' }, { status: 500 });
  }
}
