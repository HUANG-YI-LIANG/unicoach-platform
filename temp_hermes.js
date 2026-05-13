const COACH_FAULT_PARTIES = new Set(['coach_fault', 'coach_pending_review']);

export function isCoachFaultCancellation(booking) {
  return booking?.status === 'cancelled' && COACH_FAULT_PARTIES.has(booking?.cancel_fault_party);
}

export function calculateCoachPerformance(bookings = []) {
  const safeBookings = Array.isArray(bookings) ? bookings : [];
  const completed = safeBookings.filter((booking) => booking?.status === 'completed').length;
  const cancelled = safeBookings.filter((booking) => booking?.status === 'cancelled').length;
  const maliciousCancels = safeBookings.filter(isCoachFaultCancellation).length;
  const totalFinished = completed + cancelled;

  return {
    total_bookings: safeBookings.length,
    completed_bookings: completed,
    cancelled_bookings: cancelled,
    malicious_cancels: maliciousCancels,
    completion_rate: totalFinished > 0 ? completed / totalFinished : 0,
  };
}

export { COACH_FAULT_PARTIES };
