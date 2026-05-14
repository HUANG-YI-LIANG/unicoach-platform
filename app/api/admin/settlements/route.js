export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/admin/settlements
 * 列出所有結算批次
 */
export async function GET(request) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const adminSupabase = getAdminSupabase();
    const { data: batches, error } = await adminSupabase
      .from('settlement_batches')
      .select(`
        *,
        coach:users!settlement_batches_coach_id_fkey(name)
      `)
      .order('month', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ batches });
  } catch (err) {
    console.error('List settlements error:', err);
    return NextResponse.json({ error: '無法讀取結算資料' }, { status: 500 });
  }
}

/**
 * POST /api/admin/settlements
 * 為指定月份產生結算批次
 * 
 * Body: { month: "2024-04" }
 */
export async function POST(request) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const { month } = await request.json();
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: '請提供正確的月份格式 (YYYY-MM)' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();

    const { data, error } = await adminSupabase.rpc('generate_settlement_batches', {
      p_month: month,
      p_actor_id: auth.user.id,
    });

    if (error) {
      console.error('Generate settlement RPC error:', error);
      return NextResponse.json({ error: '結算批次產生失敗' }, { status: 500 });
    }

    if (!data.ok) {
      return NextResponse.json({ error: data.error }, { status: data.status || 400 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `成功為 ${data.createdCount} 位教練產生結算批次。`,
      createdCount: data.createdCount,
      batches: data.batches,
      skippedCoaches: data.skippedCoaches,
    });

  } catch (err) {
    console.error('Generate settlement error:', err);
    return NextResponse.json({ error: '發生未預期錯誤：' + err.message }, { status: 500 });
  }
}
