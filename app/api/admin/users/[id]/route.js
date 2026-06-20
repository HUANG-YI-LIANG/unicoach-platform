import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const resolvedParams = await params;
    const userId = resolvedParams.id;
    if (!userId) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    const adminSupabase = getAdminSupabase();

    // Fetch user with their transactions
    const { data: user, error } = await adminSupabase
      .from('users')
      .select(`
        *,
        wallet_transactions(*),
        coaches(*),
        student_bookings:bookings!user_id(*),
        coach_bookings:bookings!coach_id(*)
      `)
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const txs = user.wallet_transactions || [];
    
    const totalDeposit = txs
      .filter(t => t.transaction_type === 'deposit' || t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);

    const totalWithdrawal = txs
      .filter(t => t.transaction_type === 'withdrawal' || t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const totalClassesAmount = txs
      .filter(t => t.transaction_type === 'class_payment' || t.transaction_type === 'coach_payout')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const { data: bankSetting } = await adminSupabase
      .from('platform_settings')
      .select('value')
      .eq('key', `user_bank_${userId}`)
      .single();

    const { data: warningSetting } = await adminSupabase
      .from('platform_settings')
      .select('value')
      .eq('key', `user_warnings_${userId}`)
      .single();

    let bank_info = null;
    if (bankSetting?.value) {
      try {
        bank_info = JSON.parse(bankSetting.value);
      } catch (e) {}
    }

    let warning_count = 0;
    if (warningSetting?.value) {
      warning_count = parseInt(warningSetting.value, 10) || 0;
    }

    const responseData = {
      id: user.id,
      account: user.email,
      name: user.name || '未命名',
      role: user.role,
      level: user.role === 'coach' ? '認證教練' : '標準學員',
      phone: user.phone || '無',
      email: user.email,
      coach_info: user.coaches?.[0] || null,
      wallet_balance: user.wallet_balance || 0,
      total_deposit: totalDeposit,
      total_withdrawal: totalWithdrawal,
      total_classes_amount: totalClassesAmount,
      created_at: user.created_at,
      is_frozen: user.is_frozen,
      warning_count,
      student_bookings: user.student_bookings || [],
      coach_bookings: user.coach_bookings || [],
      transactions: txs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)), // Latest first
      bank_info
    };

    return NextResponse.json({ user: responseData });
  } catch (err) {
    console.error('[ADMIN USER DETAIL ERROR]', err);
    return NextResponse.json({ error: '無法獲取會員詳細資料' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const resolvedParams = await params;
    const userId = resolvedParams.id;
    if (!userId) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    const body = await request.json();
    const { name, phone, bank_info } = body;

    const adminSupabase = getAdminSupabase();

    if (name !== undefined || phone !== undefined) {
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (phone !== undefined) updateData.phone = phone;

      const { error } = await adminSupabase
        .from('users')
        .update(updateData)
        .eq('id', userId);

      if (error) {
        console.error('Update user error:', error);
        return NextResponse.json({ error: '更新失敗: ' + error.message }, { status: 500 });
      }
    }

    if (bank_info !== undefined) {
      const { error: bankError } = await adminSupabase
        .from('platform_settings')
        .upsert({
          key: `user_bank_${userId}`,
          value: JSON.stringify(bank_info)
        });
      
      if (bankError) {
        console.error('Update bank error:', bankError);
        return NextResponse.json({ error: '更新銀行帳戶失敗: ' + bankError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[ADMIN USER UPDATE ERROR]', err);
    return NextResponse.json({ error: '發生未預期錯誤' }, { status: 500 });
  }
}
