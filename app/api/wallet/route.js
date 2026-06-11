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

    // Calculate sum for balance
    const balance = transactions ? transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0) : 0;

    return NextResponse.json({ 
      success: true,
      balance,
      transactions: transactions || []
    });

  } catch (err) {
    console.error('Wallet fetch error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
