import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';

/**
 * GET: 獲取平台全域設定
 */
export async function GET(request) {
  try {
    const auth = await requireAuth();
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
    const { error } = await adminSupabase
      .from('platform_settings')
      .upsert({ 
        key, 
        value: String(value), 
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
