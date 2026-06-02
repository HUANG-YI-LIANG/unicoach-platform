export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';
import { safeErrorDetails } from '@/lib/safeLogging';

function mapEarningAction(status) {
  switch (status) {
    case 'confirmed':
      return '收益已確認';
    case 'pending':
      return '等待結算確認';
    case 'frozen':
      return '收益暫時凍結';
    case 'cancelled':
      return '收益已取消';
    default:
      return '收益紀錄';
  }
}

export async function GET(request) {
  try {
    const auth = await requireAuth(['ambassador', 'admin']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const adminSupabase = getAdminSupabase();

    // 1. Get Ambassador Profile & Level
    const { data: ambassador, error: ambError } = await adminSupabase
      .from('ambassadors')
      .select(`
        *,
        level:ambassador_levels(name, commission_rate)
      `)
      .eq('user_id', auth.user.id)
      .maybeSingle();

    if (ambError) throw ambError;
    if (!ambassador) {
      return NextResponse.json({ error: '您尚未成為推廣大使' }, { status: 403 });
    }

    const { data: levels, error: levelsError } = await adminSupabase
      .from('ambassador_levels')
      .select('name, commission_rate')
      .order('commission_rate', { ascending: true });

    if (levelsError) throw levelsError;

    // 2. Get Referrals (Invited Students & Coaches)
    // We can join with `users` to check their role.
    const { data: referrals, error: refError } = await adminSupabase
      .from('referral_bindings')
      .select(`
        created_at,
        referee:users!referee_id ( role )
      `)
      .eq('ambassador_id', auth.user.id);

    if (refError) throw refError;

    let studentCount = 0;
    let coachCount = 0;
    let todaySignups = 0;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    for (const ref of (referrals || [])) {
      if (ref.referee?.role === 'coach') coachCount++;
      else studentCount++;

      const refDate = new Date(ref.created_at).getTime();
      if (refDate >= startOfToday) todaySignups++;
    }

    // 3. Get Earnings Stats
    const { data: earnings, error: earnError } = await adminSupabase
      .from('ambassador_earnings')
      .select('id, amount, status, created_at, confirmed_at')
      .eq('ambassador_id', auth.user.id)
      .order('created_at', { ascending: false });

    if (earnError) throw earnError;

    let completedClassesCount = 0;
    let todayCompletedClasses = 0;
    let thisMonthEarnings = 0;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    for (const earn of (earnings || [])) {
      if (earn.status === 'confirmed') {
        completedClassesCount++;
        const confDate = new Date(earn.confirmed_at || earn.created_at).getTime();
        
        if (confDate >= startOfToday) todayCompletedClasses++;
        if (confDate >= startOfMonth) thisMonthEarnings += earn.amount;
      }
    }

    const conversionRate = referrals && referrals.length > 0 
      ? Math.round((completedClassesCount / referrals.length) * 100) 
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        profile: {
          code: ambassador.code,
          status: ambassador.status,
          levelName: ambassador.level?.name || 'Bronze',
          commissionRate: ambassador.custom_commission_rate || ambassador.level?.commission_rate || 20
        },
        levels: (levels || []).map((level) => ({
          name: level.name,
          commissionRate: level.commission_rate,
        })),
        financials: {
          totalEarnings: ambassador.total_earnings,
          pendingEarnings: ambassador.pending_earnings,
          availableEarnings: ambassador.available_earnings,
          thisMonthEarnings,
        },
        stats: {
          studentCount,
          coachCount,
          completedClassesCount,
          conversionRate,
          todaySignups,
          todayCompletedClasses
        },
        recentEarnings: (earnings || []).slice(0, 3).map((earning) => ({
          id: earning.id,
          name: 'UniCoach',
          action: mapEarningAction(earning.status),
          amount: earning.amount,
          status: earning.status,
          createdAt: earning.confirmed_at || earning.created_at,
        }))
      }
    });

  } catch (error) {
    console.error('[AMBASSADOR DASHBOARD ERROR]', safeErrorDetails(error));
    return NextResponse.json({ error: '讀取數據失敗' }, { status: 500 });
  }
}
