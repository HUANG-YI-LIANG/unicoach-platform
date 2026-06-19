export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';

export async function GET(request) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const adminSupabase = getAdminSupabase();

    // Fetch manual topup records (from wallet_transactions where description LIKE '%客服儲值%')
    const { data: topups, error } = await adminSupabase
      .from('wallet_transactions')
      .select('*, users(full_name, phone_number)')
      .eq('transaction_type', 'top_up')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[FETCH TOPUP HISTORY ERROR]', error);
      throw error;
    }

    // Format the response
    const formatted = topups.map(tx => ({
      id: tx.id,
      student_name: tx.users?.full_name || '未知學員',
      phone_number: tx.users?.phone_number || '',
      amount: tx.amount,
      description: tx.description,
      created_at: tx.created_at
    }));

    return NextResponse.json({ success: true, history: formatted });
  } catch (error) {
    return NextResponse.json({ error: '內部伺服器錯誤' }, { status: 500 });
  }
}
