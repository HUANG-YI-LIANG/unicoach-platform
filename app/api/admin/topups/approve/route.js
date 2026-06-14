export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

export async function POST(request) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const { requestId } = await request.json();
    if (!requestId) {
      return NextResponse.json({ error: '缺少儲值申請 ID' }, { status: 400 });
    }
    const adminSupabase = getAdminSupabase();

    // 1. Fetch topup request
    const { data: requestRow, error: reqError } = await adminSupabase
      .from('point_topup_requests')
      .select('user_id, amount, status')
      .eq('id', requestId)
      .single();

    if (reqError || !requestRow) {
      return NextResponse.json({ error: '找不到該筆申請' }, { status: 400 });
    }

    const userId = requestRow.user_id;
    const amount = requestRow.amount;

    // 2. Fetch user's level and platform settings
    const [userRes, settingsRes] = await Promise.all([
      adminSupabase.from('users').select('level').eq('id', userId).single(),
      adminSupabase.from('platform_settings').select('key, value').in('key', ['deposit_bonus_tiers', 'user_tier_discounts'])
    ]);

    const userLevel = userRes.data?.level || 1;
    let baseBonus = 0;
    let multiplier = 1.0;

    if (settingsRes.data) {
      const getJSONSetting = (key) => {
        const item = settingsRes.data.find(s => s.key === key);
        if (item && item.value) {
          try { return typeof item.value === 'string' ? JSON.parse(item.value) : item.value; } catch (e) { return []; }
        }
        return [];
      };

      const depositTiers = getJSONSetting('deposit_bonus_tiers').sort((a, b) => b.deposit - a.deposit);
      const userTiers = getJSONSetting('user_tier_discounts');

      // Find base bonus
      const matchedTier = depositTiers.find(t => amount >= t.deposit);
      if (matchedTier) baseBonus = matchedTier.bonus;

      // Find multiplier
      const matchedUserTier = userTiers.find(t => Number(t.level) === Number(userLevel));
      if (matchedUserTier && matchedUserTier.bonus_multiplier !== undefined) {
        multiplier = Number(matchedUserTier.bonus_multiplier);
      }
    }

    const finalBonus = Math.floor(baseBonus * multiplier);

    // 3. Grant bonus if any
    if (finalBonus > 0) {
      await adminSupabase.rpc('grant_wallet_points_from_support', {
        p_user_id: userId,
        p_admin_id: auth.user.id,
        p_amount: finalBonus,
        p_note: `儲值滿額贈加碼 (LV${userLevel} x${multiplier})`
      });
    }

    // 4. Approve main topup
    const { data, error } = await adminSupabase.rpc('approve_point_topup_request', {
      p_request_id: requestId,
      p_admin_id: auth.user.id,
    });

    if (error) {
      const text = [error.code, error.message, error.details, error.hint].filter(Boolean).join(' ');
      if (/approve_point_topup_request|Could not find the function|PGRST202/i.test(text)) {
        return NextResponse.json({ error: '請先執行錢包補強 SQL migration 後再核准儲值' }, { status: 500 });
      }
      if (/topup_request_not_found|topup_request_already_processed/i.test(text)) {
        return NextResponse.json({ error: '該申請不存在或已被處理' }, { status: 400 });
      }
      throw error;
    }

    return NextResponse.json(data || { success: true });
  } catch (error) {
    console.error('Approve topup error:', error);
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
