import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';

export async function POST(request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const { code } = await request.json();
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: '請輸入代碼' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();
    const adminSupabase = getAdminSupabase();

    // 1. 檢查是否為推廣碼 (promotion_code)
    const { data: referrer } = await adminSupabase
      .from('users')
      .select('id, name')
      .eq('promotion_code', cleanCode)
      .maybeSingle();

    if (referrer) {
      if (referrer.id === auth.user.id) {
        return NextResponse.json({ error: '不能輸入自己的推廣碼' }, { status: 400 });
      }

      // 確認該用戶是否已經綁定推薦人
      const { data: currentUser } = await adminSupabase
        .from('users')
        .select('referred_by')
        .eq('id', auth.user.id)
        .single();

      if (currentUser.referred_by) {
        return NextResponse.json({ error: '您已經綁定過推薦人了，無法重複綁定。' }, { status: 400 });
      }

      // 綁定推薦人
      const { error: updateError } = await adminSupabase
        .from('users')
        .update({ referred_by: referrer.id })
        .eq('id', auth.user.id);

      if (updateError) throw updateError;

      return NextResponse.json({ success: true, type: 'referral', message: `成功綁定推薦人：${referrer.name || '未知使用者'}` });
    }

    // 2. 檢查是否為一般優惠碼
    const VALID_COUPONS = {
      'UNICOACH': {
        id: 'unicoach-10',
        label: '開學典禮折扣',
        discount: 10,
        expires: '2026-12-31'
      }
    };

    if (VALID_COUPONS[cleanCode]) {
      const coupon = VALID_COUPONS[cleanCode];

      // Fetch user metadata
      const { data: authUser } = await adminSupabase.auth.admin.getUserById(auth.user.id);
      const metadata = authUser?.user?.user_metadata || {};
      const currentCoupons = metadata.coupons || [];

      // Check if already claimed
      if (currentCoupons.find(c => c.id === coupon.id)) {
        return NextResponse.json({ error: '您已經領取過此優惠碼了' }, { status: 400 });
      }

      // Add to metadata
      const newCoupons = [...currentCoupons, coupon];
      const { error: updateAuthError } = await adminSupabase.auth.admin.updateUserById(auth.user.id, {
        user_metadata: { ...metadata, coupons: newCoupons }
      });

      if (updateAuthError) throw updateAuthError;

      return NextResponse.json({ success: true, type: 'coupon', message: `成功領取優惠券：${coupon.label} ${coupon.discount}% OFF！` });
    }

    // 若輸入的不是推廣碼也不是系統已知的優惠碼
    return NextResponse.json({ error: '無效的優惠碼或推廣碼' }, { status: 400 });

  } catch (error) {
    console.error('[APPLY CODE ERROR]', error);
    return NextResponse.json({ error: '系統發生錯誤' }, { status: 500 });
  }
}
