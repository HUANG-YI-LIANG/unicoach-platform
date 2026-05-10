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
    const { data: logs, error: logsError } = await adminSupabase
      .from('reward_logs')
      .select('id')
      .eq('status', 'pending')
      .lte('release_at', new Date().toISOString())
      .limit(200);

    if (logsError) throw logsError;

    let released = 0;
    let skipped = 0;
    const failed = [];

    for (const log of logs || []) {
      const { data: didRelease, error: releaseError } = await adminSupabase.rpc('release_referral_reward', { p_log_id: log.id });
      if (releaseError) {
        failed.push(log.id);
        console.error('[CRON RELEASE REWARD ERROR]', safeErrorDetails(releaseError));
        continue;
      }
      if (didRelease) released += 1;
      else skipped += 1;
    }

    return NextResponse.json({ success: true, scanned: logs?.length || 0, released, skipped, failed: failed.length });
  } catch (error) {
    console.error('[CRON RELEASE REWARDS FATAL]', safeErrorDetails(error));
    return NextResponse.json({ error: 'Release rewards job failed' }, { status: 500 });
  }
}
