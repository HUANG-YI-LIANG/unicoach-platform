export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';
import { safeErrorDetails } from '@/lib/safeLogging';

export async function POST(request) {
  try {
    const auth = await requireAuth(['user', 'coach', 'admin']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const adminSupabase = getAdminSupabase();

    // 1. Check if already an ambassador
    const { data: existingAmbassador, error: checkError } = await adminSupabase
      .from('ambassadors')
      .select('user_id')
      .eq('user_id', auth.user.id)
      .maybeSingle();

    if (checkError) throw checkError;
    if (existingAmbassador) {
      return NextResponse.json({ error: '您已經是推廣大使了' }, { status: 409 });
    }

    // 2. Get user promotion code and basic profile
    const { data: userProfile, error: profileError } = await adminSupabase
      .from('users')
      .select('promotion_code')
      .eq('id', auth.user.id)
      .single();
      
    if (profileError || !userProfile) {
       return NextResponse.json({ error: '找不到用戶資料' }, { status: 404 });
    }

    // 3. Get Bronze Level ID
    const { data: bronzeLevel } = await adminSupabase
      .from('ambassador_levels')
      .select('id')
      .eq('name', 'Bronze')
      .maybeSingle();

    // 4. Create Ambassador profile
    const { error: insertError } = await adminSupabase
      .from('ambassadors')
      .insert([{
        user_id: auth.user.id,
        code: userProfile.promotion_code || `AMB-${auth.user.id.substring(0,6).toUpperCase()}`,
        level_id: bronzeLevel?.id || null,
        status: 'active'
      }]);

    if (insertError) throw insertError;

    // 5. Log audit trail
    await adminSupabase.from('ambassador_logs').insert([{
      ambassador_id: auth.user.id,
      action: 'AMBASSADOR_APPLIED',
      details: JSON.stringify({ role: auth.user.role }),
      ip_address: request.headers.get('x-forwarded-for') || '127.0.0.1'
    }]);

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('[AMBASSADOR APPLY ERROR]', safeErrorDetails(error));
    return NextResponse.json({ error: '申請推廣大使失敗，請稍後再試。' }, { status: 500 });
  }
}
