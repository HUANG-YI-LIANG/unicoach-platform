import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const adminSupabase = getAdminSupabase();
    const { data: settings, error } = await adminSupabase
      .from('platform_settings')
      .select('key, value')
      .like('key', 'bank_%');

    if (error) throw error;

    const paymentSettings = (settings || []).reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    return NextResponse.json({ settings: paymentSettings });
  } catch (err) {
    console.error('[PAYMENT SETTINGS GET ERROR]', err);
    return NextResponse.json({ error: '無法獲取付款設定' }, { status: 500 });
  }
}
