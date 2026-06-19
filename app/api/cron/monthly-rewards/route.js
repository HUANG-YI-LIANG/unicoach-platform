export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';
import { safeErrorDetails } from '@/lib/safeLogging';

export async function GET(request) {
  try {
    const authorization = request.headers.get('authorization');
    if (!process.env.CRON_SECRET || authorization !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminSupabase = getAdminSupabase();

    // 1. Reset all monthly_bonus_balance to 0
    const { error: resetError } = await adminSupabase
      .from('users')
      .update({ monthly_bonus_balance: 0 })
      .neq('monthly_bonus_balance', 0); // Only update those that have >0 to save DB work

    if (resetError) {
      console.error('[CRON MONTHLY BONUS RESET ERROR]', safeErrorDetails(resetError));
      // Continue anyway or throw? Throwing is safer
      throw resetError;
    }

    // 2. Fetch platform settings for user_tier_discounts
    const { data: settingsData, error: settingsError } = await adminSupabase
      .from('platform_settings')
      .select('key, value')
      .eq('key', 'user_tier_discounts')
      .single();

    if (settingsError && settingsError.code !== 'PGRST116') {
      throw settingsError;
    }

    const tiers = settingsData?.value || [];

    // 3. Grant monthly bonuses for eligible tiers
    let totalGranted = 0;
    
    for (const tier of tiers) {
      const bonusAmount = Number(tier.monthly_bonus) || 0;
      const tierLevel = Number(tier.level) || 1;
      
      if (bonusAmount > 0) {
        // Find users with this level
        const { error: grantError } = await adminSupabase
          .from('users')
          .update({ monthly_bonus_balance: bonusAmount })
          .eq('level', tierLevel);
          
        if (grantError) {
          console.error(`[CRON MONTHLY BONUS GRANT ERROR] Level ${tierLevel}:`, safeErrorDetails(grantError));
        } else {
          totalGranted++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Monthly bonuses reset and granted successfully',
      tiersProcessed: totalGranted,
    });
  } catch (error) {
    console.error('[CRON MONTHLY REWARDS FATAL]', safeErrorDetails(error));
    return NextResponse.json({ error: 'Monthly rewards job failed' }, { status: 500 });
  }
}
