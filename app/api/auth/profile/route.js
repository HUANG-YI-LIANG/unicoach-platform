import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';
import { calcBaseDiscount } from '@/lib/discountRules';

export async function GET(request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const adminSupabase = getAdminSupabase();
    
    // 1. 讀取用戶資料 (users 表)
    const { data: user, error } = await adminSupabase
      .from('users')
      .select('*')
      .eq('id', auth.user.id)
      .single();

    if (error) throw error;

    let referredByName = null;
    if (user.referred_by) {
      const { data: referrer } = await adminSupabase
        .from('users')
        .select('name')
        .eq('id', user.referred_by)
        .maybeSingle();
      if (referrer) {
        referredByName = referrer.name;
      }
    }

    // 2. 讀取 Auth metadata (for coupons)
    const { data: authUser } = await adminSupabase.auth.admin.getUserById(auth.user.id);
    const userMetadata = authUser?.user?.user_metadata || {};
    const claimedCoupons = userMetadata.coupons || [];
    const activeCoupon = userMetadata.active_coupon || null;

    // 3. 讀取教練資料 (coaches 表)
    let coachData = null;
    if (user.role === 'coach') {
      const { data: coach } = await adminSupabase
        .from('coaches')
        .select('*')
        .eq('user_id', user.id)
        .single();
      coachData = coach;
    }


    // 4. 計算基礎折扣百分比 (base_discount)
    const { count: bookingsCount } = await adminSupabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', auth.user.id);

    const isFirst = (bookingsCount || 0) === 0;
    const baseDiscount = calcBaseDiscount(user.level || 1, isFirst);
    const totalDiscount = baseDiscount + (activeCoupon ? activeCoupon.discount : 0);

    return NextResponse.json({ 
      profile: { 
        ...user, 
        base_discount: totalDiscount, 
        referred_by_name: referredByName, 
        coupons: claimedCoupons,
        active_coupon: activeCoupon
      }, 
      coach: coachData 
    });
  } catch (err) {
    console.error('Profile fetch error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const body = await request.json();
    const adminSupabase = getAdminSupabase();
    const userId = auth.user.id;

    // 1. 動態構建更新物件 (users 表)，避免 null/undefined 覆蓋現有資料
    const userUpdates = {};
    if (body.name !== undefined) userUpdates.name = body.name?.trim();
    if (body.phone !== undefined) userUpdates.phone = body.phone;
    if (body.address !== undefined) userUpdates.address = body.address;
    if (body.language !== undefined) userUpdates.language = body.language;
    if (body.learning_goals !== undefined) userUpdates.learning_goals = body.learning_goals;
    if (body.grade !== undefined) userUpdates.grade = body.grade;
    if (body.gender !== undefined) userUpdates.gender = body.gender;
    if (body.frequent_addresses !== undefined) {
      userUpdates.frequent_addresses = body.frequent_addresses ? JSON.stringify(body.frequent_addresses) : null;
    }

    if (Object.keys(userUpdates).length > 0) {
      const { error: userError } = await adminSupabase
        .from('users')
        .update(userUpdates)
        .eq('id', userId);
      if (userError) throw userError;
    }

    // 2. 如果是教練，更新教練特定欄位 (coaches 表)
    if (auth.user.role === 'coach') {
      const coachUpdates = { user_id: userId };
      if (body.university !== undefined) coachUpdates.university = body.university;
      if (body.location !== undefined) coachUpdates.location = body.location;
      if (body.service_areas !== undefined) coachUpdates.service_areas = body.service_areas?.trim() || '';
      if (body.languages !== undefined) coachUpdates.languages = body.languages;
      if (body.experience !== undefined) coachUpdates.experience = body.experience?.trim();
      if (body.philosophy !== undefined) coachUpdates.philosophy = body.philosophy?.trim();
      if (body.teaching_features !== undefined) coachUpdates.teaching_features = body.teaching_features?.trim();
      if (body.communication_style !== undefined) coachUpdates.communication_style = body.communication_style?.trim();
      if (body.policy_rules !== undefined) coachUpdates.policy_rules = body.policy_rules?.trim();
      if (body.trust_badges !== undefined) coachUpdates.trust_badges = body.trust_badges;
      if (body.base_price !== undefined) coachUpdates.base_price = parseInt(body.base_price) || 1000;
      if (body.available_times !== undefined) coachUpdates.available_times = body.available_times;

      if (Object.keys(coachUpdates).length > 1) { // 至少要有 user_id 以外的欄位
        const { error: coachError } = await adminSupabase
          .from('coaches')
          .upsert(coachUpdates);
        if (coachError) throw coachError;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: '資料更新成功' 
    });
  } catch (err) {
    console.error('Profile update error:', err);
    return NextResponse.json({ error: err.message || '伺服器錯誤' }, { status: 500 });
  }
}
