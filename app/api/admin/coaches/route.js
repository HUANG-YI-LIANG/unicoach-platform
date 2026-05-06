import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';

/**
 * GET: 管理員取得所有教練列表及其審核狀態
 */
export async function GET(request) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const adminSupabase = getAdminSupabase();
    const { data: coaches, error } = await adminSupabase
      .from('coaches')
      .select(`
        *,
        user:users(id, name, email, avatar_url)
      `);

    if (error) throw error;

    const { getCoachPerformance } = require('@/lib/coachPerformance');
    
    // 計算每位教練的當前動態績效與最終抽成
    const coachesWithPerformance = await Promise.all(
      coaches.map(async (coach) => {
        const perf = await getCoachPerformance(coach.id, adminSupabase);
        return {
          ...coach,
          performance: perf
        };
      })
    );

    return NextResponse.json({ coaches: coachesWithPerformance });
  } catch (err) {
    console.error('[ADMIN COACH LIST ERROR]', err);
    return NextResponse.json({ error: '無法獲取教練列表' }, { status: 500 });
  }
}
