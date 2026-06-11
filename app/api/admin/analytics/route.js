import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const adminSupabase = getAdminSupabase();

    // 取得所有使用者，計算 24 小時與 7 天內登入過的活躍數
    const { data: { users }, error: usersError } = await adminSupabase.auth.admin.listUsers({ perPage: 1000 });
    if (usersError) throw usersError;

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let dau = 0;
    let wau = 0;

    users.forEach(user => {
      if (user.last_sign_in_at) {
        const lastSignIn = new Date(user.last_sign_in_at);
        if (lastSignIn >= oneDayAgo) dau++;
        if (lastSignIn >= sevenDaysAgo) wau++;
      }
    });

    return NextResponse.json({ success: true, dau, wau, totalUsers: users.length });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: '無法取得分析資料' }, { status: 500 });
  }
}
