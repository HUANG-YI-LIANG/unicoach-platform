import { unstable_cache } from 'next/cache';
import { getAdminSupabase } from '@/lib/supabase';
import LevelsClient from './LevelsClient';

const getCachedSettings = unstable_cache(
  async () => {
    const supabase = getAdminSupabase();
    const { data: rows, error } = await supabase.from('platform_settings').select('key, value');
    
    if (error || !rows) return {};

    const settingsObj = {};
    rows.forEach(row => { settingsObj[row.key] = row.value; });

    const parseIfJSON = (val) => {
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch(e) { return val; }
      }
      return val;
    };

    return {
      user_rebate_discount: settingsObj.user_rebate_discount || '5',
      user_tier_discounts: parseIfJSON(settingsObj.user_tier_discounts) || [],
      top_coach_settings: parseIfJSON(settingsObj.top_coach_settings) || { top_n: 50, bonus_discount: 5 },
      coach_tier_rates: parseIfJSON(settingsObj.coach_tier_rates) || [],
      ambassador_tiers: parseIfJSON(settingsObj.ambassador_tiers) || [],
      deposit_bonus_tiers: parseIfJSON(settingsObj.deposit_bonus_tiers) || []
    };
  },
  ['platform-settings-key'],
  { tags: ['platform-settings'] }
);

export default async function LevelsPage() {
  const settings = await getCachedSettings();
  
  return <LevelsClient settings={settings} />;
}
