export function isSettleableBooking(booking = {}) {
  return booking.status === 'completed'
    && booking.payment_status === 'paid'
    && Boolean(booking.paid_at)
    && !booking.settlement_id
    && Number(booking.coach_payout || 0) > 0
    && Boolean(booking.coach_id);
}

export function filterSettleableBookings(bookings = []) {
  return bookings.filter(isSettleableBooking);
}

export function groupSettleableBookingsByCoach(bookings = []) {
  const groups = new Map();

  for (const booking of filterSettleableBookings(bookings)) {
    const coachId = booking.coach_id;
    if (!groups.has(coachId)) {
      groups.set(coachId, { coachId, total: 0, bookingIds: [] });
    }
    const group = groups.get(coachId);
    group.total += Number(booking.coach_payout || 0);
    group.bookingIds.push(booking.id);
  }

  return Array.from(groups.values()).filter((group) => group.total > 0 && group.bookingIds.length > 0);
}

export function buildSettlementBatchInsert({ month, coachId, total, bookingIds }) {
  return {
    month,
    coach_id: coachId,
    total_amount: Number(total || 0),
    booking_count: bookingIds.length,
    status: 'pending',
  };
}

export function buildSettlementBookingUpdate(batchId) {
  return { settlement_id: batchId };
}

export function canMarkSettlementStatus({ currentStatus, nextStatus }) {
  if (!['pending', 'paid', 'cancelled'].includes(nextStatus)) {
    return { ok: false, status: 400, error: '無效的狀態值' };
  }

  if (currentStatus === 'paid' && nextStatus !== 'paid') {
    return { ok: false, status: 400, error: '已撥款批次不可改回其他狀態' };
  }

  if (currentStatus === 'cancelled' && nextStatus !== 'cancelled') {
    return { ok: false, status: 400, error: '已取消批次不可恢復或撥款，請重新產生結算批次' };
  }

  return { ok: true, status: 200 };
}

export function isDuplicateActiveSettlementError(error = {}) {
  return error.code === '23505'
    || String(error.message || '').includes('settlement_batches_unique_active_coach_month');
}
