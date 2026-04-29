import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';

export async function POST(request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const { couponId } = await request.json();
    const adminSupabase = getAdminSupabase();

    const { data: authUser } = await adminSupabase.auth.admin.getUserById(auth.user.id);
    const metadata = authUser?.user?.user_metadata || {};
    const currentCoupons = metadata.coupons || [];

    const couponToUse = currentCoupons.find(c => c.id === couponId);
    if (!couponToUse) {
      return NextResponse.json({ error: '找不到該優惠券或尚未領取' }, { status: 400 });
    }

    const { error: updateAuthError } = await adminSupabase.auth.admin.updateUserById(auth.user.id, {
      user_metadata: { ...metadata, active_coupon: couponToUse }
    });

    if (updateAuthError) throw updateAuthError;

    return NextResponse.json({ success: true, message: `已成功套用：${couponToUse.label}！` });
  } catch (error) {
    console.error('[USE COUPON ERROR]', error);
    return NextResponse.json({ error: '系統發生錯誤' }, { status: 500 });
  }
}
