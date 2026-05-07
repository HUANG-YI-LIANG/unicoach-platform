export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';

const PERCENTAGE_SETTING_KEYS = new Set([
  'commission_rate',
  'commission_discount',
  'discount_percent',
  'first_booking_discount',
  'base_discount_percent',
]);

function clampSettingValue(key, value) {
  if (!PERCENTAGE_SETTING_KEYS.has(key)) return String(value);
  const parsed = Number(value);
  const normalized = Number.isFinite(parsed) ? parsed : 0;
  return String(Math.round(Math.min(100, Math.max(0, normalized))));
}

/**
 * GET: 獲取平台全域設定
 */
export async function GET(request) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const adminSupabase = getAdminSupabase();
    const { data: settings, error } = await adminSupabase
      .from('platform_settings')
      .select('*');

    if (error) throw error;
    
    // 轉換為 Object 格式方便前端使用
    const settingsObj = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    return NextResponse.json({ settings: settingsObj });
  } catch (err) {
    console.error('[SETTINGS GET ERROR]', err);
    return NextResponse.json({ error: '無法獲取設定' }, { status: 500 });
  }
}

/**
 * POST: 更新或新增平台全域設定
 */
export async function POST(request) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const body = await request.json();
    const { key, value, description } = body;

    if (!key || value === undefined) {
      return NextResponse.json({ error: '缺少必要參數' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();
    const normalizedValue = clampSettingValue(key, value);
    const { error } = await adminSupabase
      .from('platform_settings')
      .upsert({ 
        key, 
        value: normalizedValue,
        description, 
        updated_at: new Date().toISOString() 
      });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[SETTINGS POST ERROR]', err);
    return NextResponse.json({ error: '設定更新失敗' }, { status: 500 });
  }
}
