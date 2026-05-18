export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';
import { safeErrorDetails } from '@/lib/safeLogging';
import {
  assertFinancialPriceInvariant,
  calculatePriceSplitFromFinalPrice,
  canAdjustBookingPrice,
  clampPercent,
  roundMoney,
} from '@/lib/bookingSecurity';
import { buildExpiredPendingPaymentUpdate, getPendingPaymentExpirationState } from '@/lib/bookingWorkflow';

const MAX_PRICE_ADJUSTMENT = 200;

function parseAdjustment(value) {
  if (typeof value === 'string' && value.trim() === '') return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return null;
  return parsed;
}

async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

async function getEffectiveCommission(adminSupabase, booking) {
  const { data: coach, error: coachError } = await adminSupabase
    .from('coaches')
    .select('commission_rate')
    .eq('user_id', booking.coach_id)
    .maybeSingle();

  if (coachError) throw coachError;

  const { data: commissionSetting, error: commissionSettingError } = await adminSupabase
    .from('platform_settings')
    .select('value')
    .eq('key', 'commission_rate')
    .maybeSingle();

  if (commissionSettingError) throw commissionSettingError;

  const parsedGlobalCommission = Number(commissionSetting?.value);
  const globalCommission = Number.isFinite(parsedGlobalCommission)
    ? clampPercent(parsedGlobalCommission, 20)
    : 20;

  return coach?.commission_rate !== null && coach?.commission_rate !== undefined
    ? clampPercent(coach.commission_rate, globalCommission)
    : globalCommission;
}

/**
 * POST: 調整單一預約的金額 (議價功能)
 * 幅度限制：±200 TWD
 *
 * Financial invariant:
 * - final_price 是訂單實收總額。
 * - platform_fee 與 coach_payout 必須從 final_price 重新拆分。
 * - coach_payout 不可高於 final_price，避免平台倒貼或結算錯誤。
 */
export async function POST(request, { params }) {
  try {
    const auth = await requireAuth(['coach', 'admin']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const { id } = await params;
    const body = await readJsonBody(request);
    if (!body) {
      return NextResponse.json({ error: '請提供合法的 JSON 請求內容' }, { status: 400 });
    }

    const adjustment = parseAdjustment(body.adjustment);

    // 1. 驗證幅度
    if (adjustment === null || adjustment < -MAX_PRICE_ADJUSTMENT || adjustment > MAX_PRICE_ADJUSTMENT) {
      return NextResponse.json({ error: '調整金額超出範圍 (限制 ±200 TWD)' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();

    // 2. 獲取原始預約資料以重新計算最終價格與分潤
    const { data: booking, error: fetchError } = await adminSupabase
      .from('bookings')
      .select('id, base_price, discount_amount, final_price, coach_id, status, platform_fee, coach_payout, payment_expires_at')
      .eq('id', id)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json({ error: '找不到該筆預約' }, { status: 404 });
    }

    const expiration = getPendingPaymentExpirationState(booking);
    if (expiration.expired) {
      await adminSupabase
        .from('bookings')
        .update(buildExpiredPendingPaymentUpdate())
        .eq('id', id)
        .eq('status', 'pending_payment');

      return NextResponse.json({ error: expiration.error }, { status: expiration.status });
    }

    const authorization = canAdjustBookingPrice({ actor: auth.user, booking });
    if (!authorization.ok) {
      return NextResponse.json({ error: authorization.error }, { status: authorization.status });
    }

    const effectiveCommission = await getEffectiveCommission(adminSupabase, booking);

    // 3. 計算新價格
    // 公式：final_price = base_price - discount_amount + adjustment
    const baseFinalPrice = roundMoney(Number(booking.base_price || 0) - Number(booking.discount_amount || 0));
    const newFinalPrice = roundMoney(baseFinalPrice + adjustment);
    const pricing = calculatePriceSplitFromFinalPrice({
      finalPrice: newFinalPrice,
      coachCommission: effectiveCommission,
    });

    const invariant = assertFinancialPriceInvariant(pricing);
    if (!invariant.ok) {
      return NextResponse.json({ error: invariant.error }, { status: 400 });
    }

    // 4. 更新資料庫：final_price / deposit_paid / platform_fee / coach_payout 必須一起更新
    const { data: updatedBooking, error: updateError } = await adminSupabase
      .from('bookings')
      .update({
        price_adjustment: adjustment,
        final_price: pricing.finalPrice,
        deposit_paid: pricing.depositPaid,
        platform_fee: pricing.platformFee,
        coach_payout: pricing.coachPayout,
      })
      .eq('id', id)
      .eq('status', 'pending_payment')
      .select('id')
      .maybeSingle();

    if (updateError) throw updateError;
    if (!updatedBooking) {
      return NextResponse.json({ error: '預約狀態已變更，請重新整理後再試。' }, { status: 409 });
    }

    // 5. 記錄審計日誌
    await adminSupabase.from('audit_logs').insert([{
      action: 'BOOKING_PRICE_ADJUST',
      actor_id: auth.user.id,
      actor_role: auth.user.role,
      target_id: id,
      details: JSON.stringify({
        adjustment,
        commission_rate: effectiveCommission,
        old_final_price: booking.final_price,
        old_platform_fee: booking.platform_fee,
        old_coach_payout: booking.coach_payout,
        new_final_price: pricing.finalPrice,
        new_platform_fee: pricing.platformFee,
        new_coach_payout: pricing.coachPayout,
      }),
    }]);

    return NextResponse.json({
      success: true,
      finalPrice: pricing.finalPrice,
      depositPaid: pricing.depositPaid,
      platformFee: pricing.platformFee,
      coachPayout: pricing.coachPayout,
      adjustment,
    });
  } catch (err) {
    console.error('[PRICE ADJUST ERROR]', safeErrorDetails(err));
    return NextResponse.json({ error: '金額調整失敗' }, { status: 500 });
  }
}
