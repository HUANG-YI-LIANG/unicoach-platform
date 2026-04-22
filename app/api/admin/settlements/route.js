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

    const { data: existingBatches, error: existingError } = await adminSupabase
      .from('settlement_batches')
      .select('id')
      .eq('month', month)
      .neq('status', 'cancelled')
      .limit(1);

    if (existingError) throw existingError;
    if (existingBatches?.length) {
      return NextResponse.json({ error: '此月份已有未取消的結算批次，請勿重複產生。' }, { status: 409 });
    }

    // 1. 尋找該月份「已完課」且「尚未結算」的預約
    const { data: bookings, error: bError } = await adminSupabase
      .from('bookings')
      .select('id, coach_id, coach_payout, completed_at, settlement_id')
      .eq('status', 'completed')
      .is('settlement_id', null)
      .gte('completed_at', `${month}-01T00:00:00.000Z`)
      .lt('completed_at', nextMonthStart(month));

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
      coachGroups[b.coach_id].total += Number(b.coach_payout || 0);
      coachGroups[b.coach_id].bookingIds.push(b.id);
    });

    let createdCount = 0;
    const createdBatches = [];

    // 3. 為每個教練建立結算批次並更新訂單
    // 採兩階段補償：若訂單關聯失敗，立即將批次標記 cancelled，避免誤撥款。
    for (const coachId in coachGroups) {
      const { total, bookingIds } = coachGroups[coachId];
      if (total <= 0 || bookingIds.length === 0) continue;

      // A. 建立批次
      const { data: batch, error: batchErr } = await adminSupabase
        .from('settlement_batches')
        .insert([{
          month,
          coach_id: coachId,
          total_amount: total,
          booking_count: bookingIds.length,
          status: 'pending'
        }])
        .select('id, month, coach_id, total_amount, booking_count, status')
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
        await adminSupabase
          .from('settlement_batches')
          .update({ status: 'cancelled' })
          .eq('id', batch.id);
      } else {
        createdCount++;
        createdBatches.push(batch);
      }
    }

    await adminSupabase.from('audit_logs').insert([{
      actor_id: auth.user.id,
      actor_role: auth.user.role,
      action: 'GENERATE_SETTLEMENT_BATCHES',
      target_id: month,
      details: JSON.stringify({ createdCount, batchIds: createdBatches.map((batch) => batch.id) }),
    }]);

    return NextResponse.json({ 
      success: true, 
      message: `成功為 ${createdCount} 位教練產生結算批次。`,
      createdCount,
      batches: createdBatches,
    });

  } catch (err) {
    console.error('Generate settlement error:', err);
    return NextResponse.json({ error: '結算批次產生失敗：' + err.message }, { status: 500 });
  }
}

function nextMonthStart(month) {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, monthNumber, 1));
  return date.toISOString();
}
