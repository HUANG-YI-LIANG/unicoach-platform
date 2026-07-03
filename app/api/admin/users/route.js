import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const adminSupabase = getAdminSupabase();

    // Fetch users with their transactions
    const { data: rawUsers, error } = await adminSupabase
      .from('users')
      .select(`
        id, email, name, role, created_at, wallet_balance, avatar_url,
        wallet_transactions(amount, transaction_type, created_at)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const users = rawUsers.map(user => {
      const txs = user.wallet_transactions || [];
      
      const totalDeposit = txs
        .filter(t => t.transaction_type === 'deposit' || t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0);

      const totalWithdrawal = txs
        .filter(t => t.transaction_type === 'withdrawal' || t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      const lastLogin = null; // Next-auth or custom auth may not track last login out of the box in users table. We'll use created_at as fallback.

      const totalClassesAmount = txs
        .filter(t => t.transaction_type === 'class_payment' || t.transaction_type === 'coach_payout')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      return {
        id: user.id,
        account: user.email,
        name: user.name || '未命名',
        role: user.role,
        wallet_balance: user.wallet_balance || 0,
        total_deposit: totalDeposit,
        total_withdrawal: totalWithdrawal,
        total_classes_amount: totalClassesAmount,
        last_login_time: lastLogin || user.created_at,
        last_login_ip: '2001:b011:7007::', // Mocked IP for demonstration as requested by layout
        created_at: user.created_at,
        avatar_url: user.avatar_url,
      };
    });

    return NextResponse.json({ users });
  } catch (err) {
    console.error('[ADMIN USERS LIST ERROR]', err);
    return NextResponse.json({ error: '無法獲取會員列表' }, { status: 500 });
  }
}
