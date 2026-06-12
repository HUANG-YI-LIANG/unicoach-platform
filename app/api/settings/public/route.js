export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';

export async function GET(request) {
  try {
    const supabase = getAdminSupabase();
    const { data: settings, error } = await supabase
      .from('platform_settings')
      .select('key, value');

    if (error) throw error;
    
    // 轉換為 Object 格式方便前端使用
    const settingsObj = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    // Parse JSON strings to objects
    const parseIfJSON = (val) => {
      try {
        return JSON.parse(val);
      } catch (e) {
        return val;
      }
    };

    const publicSettings = {
      commission_rate: settingsObj.commission_rate || '45',
      referral_commission_rate: settingsObj.referral_commission_rate || '3',
      double_referral_commission_rate: settingsObj.double_referral_commission_rate || '2.5',
      user_rebate_discount: settingsObj.user_rebate_discount || '5',
      coach_tier_rates: parseIfJSON(settingsObj.coach_tier_rates) || [],
      user_tier_discounts: parseIfJSON(settingsObj.user_tier_discounts) || [],
      top_coach_settings: parseIfJSON(settingsObj.top_coach_settings) || { top_n: 50, bonus_discount: 5 },
      deposit_bonus_tiers: parseIfJSON(settingsObj.deposit_bonus_tiers) || [],
    };

    return NextResponse.json({ settings: publicSettings });
  } catch (err) {
    console.error('[PUBLIC SETTINGS GET ERROR]', err);
    return NextResponse.json({ error: '無法獲取設定' }, { status: 500 });
  }
}
