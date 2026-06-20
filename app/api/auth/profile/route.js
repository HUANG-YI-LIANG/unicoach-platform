export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';
import { getCoachPerformanceByUserId } from '@/lib/coachPerformance';
import { SAFE_USER_PROFILE_FIELDS, sanitizeUserProfile } from '@/lib/securityRules';

function clampDiscountPercent(value) {
  const discount = Number(value);
  if (!Number.isFinite(discount)) return 0;
  return Math.min(100, Math.max(0, discount));
}

function normalizeCoupon(coupon) {
  if (!coupon || typeof coupon !== 'object') return null;
  const discount = clampDiscountPercent(coupon.discount);
  return {
    code: typeof coupon.code === 'string' ? coupon.code : '',
    discount,
    source: typeof coupon.source === 'string' ? coupon.source : undefined,
    expires_at: typeof coupon.expires_at === 'string' ? coupon.expires_at : undefined,
  };
}

function normalizeCoupons(coupons) {
  if (!Array.isArray(coupons)) return [];
  return coupons.map((coupon) => normalizeCoupon(coupon)).filter(Boolean);
}

export async function GET(request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const adminSupabase = getAdminSupabase();
    
    // 1. 讀取用戶資料 (users 表)
    const { data: user, error } = await adminSupabase
      .from('users')
      .select(SAFE_USER_PROFILE_FIELDS.join(', '))
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
    const claimedCoupons = normalizeCoupons(userMetadata.coupons);
    const activeCoupon = normalizeCoupon(userMetadata.active_coupon);

    // 3. 讀取教練資料 (coaches 表) 與動態績效欄位
    let coachData = null;
    if (user.role === 'coach') {
      const [{ data: coach }, performance] = await Promise.all([
        adminSupabase
          .from('coaches')
          .select('user_id, university, location, service_areas, languages, experience, philosophy, teaching_features, communication_style, policy_rules, trust_badges, base_price, available_times, approval_status, commission_rate, referral_code')
          .eq('user_id', user.id)
          .single(),
        getCoachPerformanceByUserId(user.id, adminSupabase)
      ]);

      coachData = coach ? {
        ...coach,
        level: performance.currentLevel,
        commission_rate: performance.currentCommission,
        base_commission_rate: performance.baseCommission,
        personal_commission_discount: performance.personalDiscount,
        performance_metrics: performance.metrics,
        performance_thresholds: performance.thresholds
      } : null;
    }


    // 4. 讀取等級折扣設定
    const { data: settings } = await adminSupabase
      .from('platform_settings')
      .select('key, value')
      .like('key', 'level_%_discount');
      
    const settingsObj = (settings || []).reduce((acc, curr) => {
      acc[curr.key] = Number(curr.value);
      return acc;
    }, {});

    // 5. 計算總折扣
    let baseDiscount = 0; // 預設 0%
    const levelKey = `level_${user.level || 1}_discount`;
    
    if (userMetadata.custom_discount !== undefined && userMetadata.custom_discount !== null) {
      baseDiscount = clampDiscountPercent(userMetadata.custom_discount);
    } else if (settingsObj[levelKey] !== undefined) {
      baseDiscount = clampDiscountPercent(settingsObj[levelKey]);
    } else {
      // 如果還沒有全域設定，使用預設值：Lv1=0, Lv2=5, Lv3=10, Lv4=12
      const defaultDiscounts = { 1: 0, 2: 5, 3: 10, 4: 12 };
      baseDiscount = defaultDiscounts[user.level || 1] ?? 12;
    }

    const totalDiscount = clampDiscountPercent(baseDiscount + (activeCoupon ? activeCoupon.discount : 0));

    return NextResponse.json({ 
      profile: { 
        ...sanitizeUserProfile(user), 
        base_discount: baseDiscount, 
        total_discount: totalDiscount,
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
    
    if (body.email && body.email.trim() !== '') {
      const newEmail = body.email.trim();
      const { data: userRecord } = await adminSupabase.from('users').select('email').eq('id', userId).single();
      
      if (userRecord && userRecord.email !== newEmail) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
          return NextResponse.json({ error: '信箱格式不正確' }, { status: 400 });
        }
        const { data: existingUser } = await adminSupabase.from('users').select('id').eq('email', newEmail).maybeSingle();
        if (existingUser && existingUser.id !== userId) {
          return NextResponse.json({ error: '此信箱已被其他帳號使用' }, { status: 400 });
        }
        const { error: authError } = await adminSupabase.auth.admin.updateUserById(userId, { email: newEmail });
        if (authError) throw authError;
        userUpdates.email = newEmail;
      }
    }

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
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
