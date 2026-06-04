export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const adminSupabase = getAdminSupabase();
    
    const { data: requests, error } = await adminSupabase
      .from('point_topup_requests')
      .select('*, users(name, email)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('List topups error:', error);
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
