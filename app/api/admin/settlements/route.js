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

    // 1. 尋找該月份「已完課」且「尚未結外」的預約
    // ⚠️ 這裡假設已在 bookings 加了 settlement_id 欄位
    // 如果還沒有加，這行查詢會失敗，請先執行 SQL: 
    // ALTER TABLE bookings ADD COLUMN settlement_id UUID REFERENCES settlement_batches(id);
    const { data: bookings, error: bError } = await adminSupabase
      .from('bookings')
      .select('id, coach_id, coach_payout, completed_at')
      .eq('status', 'completed')
      .is('settlement_id', null)
      .like('completed_at', `${month}%`);

    if (bError) {
      if (bError.message.includes('settlement_id')) {
        return NextResponse.json({ error: '資料庫缺少 settlement_id 欄位，請先執行 Migration。' }, { status: 500 });
      }
      throw bError;
    }

    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ success: true, message: '該月份沒有待結算的訂單。', createdCount: 0 });
    }

    // 2. 按教練分組彙整金額
    const coachGroups = {};
    bookings.forEach(b => {
      if (!coachGroups[b.coach_id]) {
        coachGroups[b.coach_id] = { total: 0, bookingIds: [] };
      }
      coachGroups[b.coach_id].total += b.coach_payout;
      coachGroups[b.coach_id].bookingIds.push(b.id);
    });

    let createdCount = 0;

    // 3. 為每個教練建立結算批次並更新訂單
    // 註：這部分在 Supabase 中建議使用 Transaction，但在這裡我們先用逐筆處理
    for (const coachId in coachGroups) {
      const { total, bookingIds } = coachGroups[coachId];

      // A. 建立批次
      const { data: batch, error: batchErr } = await adminSupabase
        .from('settlement_batches')
        .insert([{
          month,
          coach_id: coachId,
          total_amount: total,
          status: 'pending'
        }])
        .select('id')
        .single();

      if (batchErr) {
        console.error(`Coach ${coachId} settlement failed:`, batchErr);
        continue;
      }

      // B. 更新訂單關聯
      const { error: updateErr } = await adminSupabase
        .from('bookings')
        .update({ settlement_id: batch.id })
        .in('id', bookingIds);

      if (updateErr) {
        console.error(`Booking linkage failed for batch ${batch.id}:`, updateErr);
      } else {
        createdCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `成功為 ${createdCount} 位教練產生結算批次。`,
      createdCount 
    });

  } catch (err) {
    console.error('Generate settlement error:', err);
    return NextResponse.json({ error: '結算批次產生失敗：' + err.message }, { status: 500 });
  }
}
