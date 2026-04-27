import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

export async function POST(request, { params }) {
  try {
    const auth = await requireAuth(['user']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const { id } = await params;
    const { imageUrl } = await request.json();

    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json({ error: '缺少付款截圖網址' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();

    const { data: booking, error: bookingError } = await adminSupabase
      .from('bookings')
      .select('id, user_id, status, payment_expires_at, payment_reference')
      .eq('id', id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: '找不到該預約記錄' }, { status: 404 });
    }

    if (booking.user_id !== auth.user.id) {
      return NextResponse.json({ error: '您無權回報此筆付款' }, { status: 403 });
    }

    if (booking.status !== 'pending_payment') {
      return NextResponse.json({ error: '只有待付款訂單可以回報付款' }, { status: 400 });
    }

    if (booking.payment_expires_at) {
      const expiresAt = new Date(booking.payment_expires_at).getTime();
      if (Number.isFinite(expiresAt) && Date.now() > expiresAt) {
        return NextResponse.json({ error: '付款保留時間已過期，請重新建立預約' }, { status: 409 });
      }
    }

    const { error: updateError } = await adminSupabase
      .from('bookings')
      .update({
        payment_method: 'bank_transfer',
        payment_reference: imageUrl,
      })
      .eq('id', id);

    if (updateError) throw updateError;

    try {
      await adminSupabase.from('audit_logs').insert([{
        action: 'REPORT_BOOKING_PAYMENT',
        actor_id: auth.user.id,
        actor_role: auth.user.role,
        target_id: id,
        details: JSON.stringify({
          payment_method: 'bank_transfer',
          payment_reference: imageUrl,
          replaced_existing_receipt: Boolean(booking.payment_reference),
        }),
      }]);
    } catch (auditErr) {
      console.warn('[REPORT PAYMENT AUDIT LOG FAIL]', auditErr.message);
    }

    return NextResponse.json({
      success: true,
      paymentMethod: 'bank_transfer',
      paymentReference: imageUrl,
    });
  } catch (error) {
    console.error('[REPORT PAYMENT ERROR]', error);
    return NextResponse.json({ error: '付款回報失敗' }, { status: 500 });
  }
}
