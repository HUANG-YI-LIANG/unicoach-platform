import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';
import { calculateBookingPrice, canAdjustBookingPrice } from '@/lib/bookingSecurity';

/**
 * POST: 調整單一預約的金額 (議價功能)
 * 幅度限制：±200 TWD
 */
export async function POST(request, { params }) {
  try {
    const auth = await requireAuth(['coach', 'admin']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const { id } = await params;
    const body = await request.json();
    const adjustment = parseInt(body.adjustment);

    // 1. 驗證幅度
    if (isNaN(adjustment) || adjustment < -200 || adjustment > 200) {
      return NextResponse.json({ error: '調整金額超出範圍 (限制 ±200 TWD)' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();

    // 2. 獲取原始預約資料以重新計算最終價格
    const { data: booking, error: fetchError } = await adminSupabase
      .from('bookings')
      .select('base_price, discount_amount, final_price, coach_id, status, platform_fee')
      .eq('id', id)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json({ error: '找不到該筆預約' }, { status: 404 });
    }

    const authorization = canAdjustBookingPrice({ actor: auth.user, booking });
    if (!authorization.ok) {
      return NextResponse.json({ error: authorization.error }, { status: authorization.status });
    }

    // 3. 計算新價格
    // 公式：final_price = base_price - discount_amount + adjustment
    const baseFinalPrice = Math.max(0, booking.base_price - (booking.discount_amount || 0));
    const newFinalPrice = Math.max(0, baseFinalPrice + adjustment);
    const newDepositPaid = calculateBookingPrice({ basePrice: newFinalPrice }).depositPaid;

    // 4. 更新資料庫
    const { error: updateError } = await adminSupabase
      .from('bookings')
      .update({
        price_adjustment: adjustment,
        final_price: newFinalPrice,
        deposit_paid: newDepositPaid
      })
      .eq('id', id);

    if (updateError) throw updateError;

    // 5. 記錄審計日誌
    await adminSupabase.from('audit_logs').insert([{
      action: 'BOOKING_PRICE_ADJUST',
      actor_id: auth.user.id,
      actor_role: auth.user.role,
      target_id: id,
      details: JSON.stringify({ adjustment, old_final_price: booking.final_price, new_final_price: newFinalPrice })
    }]);

    return NextResponse.json({ 
      success: true, 
      finalPrice: newFinalPrice,
      depositPaid: newDepositPaid,
      adjustment: adjustment
    });
  } catch (err) {
    console.error('[PRICE ADJUST ERROR]', err);
    return NextResponse.json({ error: '金額調整失敗' }, { status: 500 });
  }
}
