export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

export async function POST(request) {
  try {
    const auth = await requireAuth(['user']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const { amount } = await request.json();
    
    if (!Number.isInteger(amount) || amount <= 0 || amount > 100000) {
      return NextResponse.json({ error: '儲值金額無效' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();
    
    // For mock testing, we just use a read-modify-write pattern.
    const { data: user, error: fetchError } = await adminSupabase
      .from('users')
      .select('wallet_balance')
      .eq('id', auth.user.id)
      .single();

    if (fetchError || !user) {
      return NextResponse.json({ error: '找不到使用者資料' }, { status: 404 });
    }

    const newBalance = (user.wallet_balance || 0) + amount;

    const { error: updateError } = await adminSupabase
      .from('users')
      .update({ wallet_balance: newBalance })
      .eq('id', auth.user.id);

    if (updateError) {
      throw updateError;
    }

    // Log the transaction
    await adminSupabase.from('audit_logs').insert([{
      action: 'MOCK_TOPUP',
      actor_id: auth.user.id,
      actor_role: 'user',
      details: JSON.stringify({ amount, new_balance: newBalance })
    }]);

    return NextResponse.json({ success: true, newBalance });
  } catch (error) {
    console.error('Topup error:', error);
    return NextResponse.json({ error: '伺服器內部錯誤' }, { status: 500 });
  }
}
