import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import {
  buildSettlementBatchInsert,
  buildSettlementBookingUpdate,
  groupSettleableBookingsByCoach,
  isDuplicateActiveSettlementError,
} from '@/lib/settlementRules';

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

    // 由 DB 的 settlement_batches_unique_active_coach_month partial unique index
    // 防止同一教練、同一月份產生重複未取消批次。

    // 1. 尋找該月份「已完課、已付款、尚未結算」的預約
    const { data: bookings, error: bError } = await adminSupabase
      .from('bookings')
      .select('id, coach_id, coach_payout, completed_at, settlement_id, status, payment_status, paid_at')
      .eq('status', 'completed')
      .eq('payment_status', 'paid')
      .not('paid_at', 'is', null)
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
    const coachGroups = groupSettleableBookingsByCoach(bookings);

    let createdCount = 0;
    const createdBatches = [];
    const skippedCoaches = [];

    // 3. 為每個教練建立結算批次並更新訂單
    // 採兩階段補償：若訂單關聯失敗，立即將批次標記 cancelled，避免誤撥款。
    for (const group of coachGroups) {
      const { coachId, total, bookingIds } = group;
      if (total <= 0 || bookingIds.length === 0) continue;

      // A. 建立批次；DB partial unique index 會阻擋同教練同月份重複未取消批次。
      const { data: batch, error: batchErr } = await adminSupabase
        .from('settlement_batches')
        .insert([buildSettlementBatchInsert({ month, coachId, total, bookingIds })])
        .select('id, month, coach_id, total_amount, booking_count, status')
        .single();

      if (batchErr) {
        if (isDuplicateActiveSettlementError(batchErr)) {
          skippedCoaches.push({ coachId, reason: 'duplicate_active_batch' });
          continue;
        }
        console.error(`Coach ${coachId} settlement failed:`, batchErr);
        skippedCoaches.push({ coachId, reason: 'batch_insert_failed' });
        continue;
      }

      // B. 更新訂單關聯時再次加上付款/完課/未結算條件，避免產生批次後被併發改動。
      const { data: linkedBookings, error: updateErr } = await adminSupabase
        .from('bookings')
        .update(buildSettlementBookingUpdate(batch.id))
        .in('id', bookingIds)
        .eq('coach_id', coachId)
        .eq('status', 'completed')
        .eq('payment_status', 'paid')
        .not('paid_at', 'is', null)
        .is('settlement_id', null)
        .select('id');

      if (updateErr || linkedBookings?.length !== bookingIds.length) {
        console.error(`Booking linkage failed for batch ${batch.id}:`, updateErr || 'linked booking count mismatch');
        await adminSupabase
          .from('settlement_batches')
          .update({ status: 'cancelled' })
          .eq('id', batch.id);
        await adminSupabase
          .from('bookings')
          .update({ settlement_id: null })
          .eq('settlement_id', batch.id);
        skippedCoaches.push({ coachId, reason: 'booking_linkage_failed' });
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
      details: JSON.stringify({
        createdCount,
        batchIds: createdBatches.map((batch) => batch.id),
        skippedCoaches,
      }),
    }]);

    return NextResponse.json({ 
      success: true, 
      message: `成功為 ${createdCount} 位教練產生結算批次。`,
      createdCount,
      batches: createdBatches,
      skippedCoaches,
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
