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
    
    // Fetch all transactions for the user
    const { data: transactions, error } = await adminSupabase
      .from('wallet_transactions')
      .select('id, amount, transaction_type, description, created_at')
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }

    // Fetch user balances
    const { data: userData, error: userError } = await adminSupabase
      .from('users')
      .select('wallet_balance, monthly_bonus_balance')
      .eq('id', auth.user.id)
      .single();

    if (userError) {
      console.error('Error fetching user balances:', userError);
      throw userError;
    }

    const balance = userData?.wallet_balance || 0;
    const bonusBalance = userData?.monthly_bonus_balance || 0;

    // Fetch bank settings
    const { data: bankSettingsData } = await adminSupabase
      .from('platform_settings')
      .select('key, value')
      .in('key', ['bank_code', 'bank_account_number']);

    let bankInfo = null;
    if (bankSettingsData && bankSettingsData.length > 0) {
      const code = bankSettingsData.find(s => s.key === 'bank_code')?.value;
      const account = bankSettingsData.find(s => s.key === 'bank_account_number')?.value;
      if (code && account) {
        bankInfo = { bank_code: code, bank_account_number: account };
      }
    }

    return NextResponse.json({ 
      success: true,
      balance,
      bonusBalance,
      transactions: transactions || [],
      bankInfo
    });

  } catch (err) {
    console.error('Wallet fetch error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
