const FINAL_REPORT_STATUSES = new Set(['in_progress', 'pending_completion']);
const TERMINAL_STATUSES = new Set(['completed', 'cancelled', 'refunded']);

export function buildConfirmPaymentUpdate(now = new Date()) {
  const paidAt = now instanceof Date ? now : new Date(now);
  return {
    status: 'scheduled',
    payment_status: 'paid',
    paid_at: paidAt.toISOString(),
    payment_expires_at: null,
  };
}

function actorRoleForBooking(actor, booking) {
  if (!actor || !booking) return null;
  if (actor.role === 'admin') return 'admin';
  if (actor.id === booking.coach_id) return 'coach';
  if (actor.id === booking.user_id) return 'student';
  return null;
}

function transitionAllowed(role, currentStatus, newStatus) {
  const rules = {
    pending_payment: {
      student: ['cancelled'],
      coach: ['cancelled'],
    },
    scheduled: {
      student: ['cancelled'],
      coach: ['in_progress', 'cancelled'],
    },
    in_progress: {
      coach: ['pending_completion'],
    },
    pending_completion: {
      student: ['completed'],
      coach: ['in_progress'],
    },
    completed: {},
    cancelled: {},
    refunded: {},
  };

  return (rules[currentStatus]?.[role] || []).includes(newStatus);
}

export function canTransitionBookingStatus({ actor, booking, newStatus, hasFinalReport = false }) {
  if (!booking) return { ok: false, status: 404, error: '找不到該預約記錄' };
  if (!newStatus || typeof newStatus !== 'string') return { ok: false, status: 400, error: '缺少目標狀態' };

  const role = actorRoleForBooking(actor, booking);
  if (!role) return { ok: false, status: 403, error: '您無權操作此預約。' };

  if (TERMINAL_STATUSES.has(booking.status)) {
    return { ok: false, status: 400, error: '終態預約不可再變更狀態。' };
  }

  if (newStatus !== 'cancelled' && booking.payment_status && booking.payment_status !== 'paid') {
    return { ok: false, status: 400, error: '預約尚未完成付款，不能進入課程流程。' };
  }

  if (role !== 'admin' && !transitionAllowed(role, booking.status, newStatus)) {
    return { ok: false, status: 400, error: `非法的操作：暫時不允許從 ${booking.status} 轉換為 ${newStatus}。`, role };
  }

  if (newStatus === 'completed' && !hasFinalReport) {
    return { ok: false, status: 400, error: '必須先填寫學習報告，才能將課程標記為完成。' };
  }

  return { ok: true, role };
}

export function canSubmitLearningReport(booking, actor) {
  if (!booking) return { ok: false, status: 404, error: '找不到該預約記錄。' };
  const role = actorRoleForBooking(actor, booking);
  if (role !== 'coach' && role !== 'admin') {
    return { ok: false, status: 403, error: '您不是此預約的負責教練，無法提交報告。' };
  }
  if (!FINAL_REPORT_STATUSES.has(booking.status)) {
    return { ok: false, status: 400, error: '學習報告只能在課程開始後、正式完成前提交。' };
  }
  return { ok: true, role };
}

export function canGenerateAiReportDraft(booking, actor) {
  return canSubmitLearningReport(booking, actor);
}

export function canUpsertAiDraft(existingReport) {
  if (!existingReport || existingReport.completed_items === '__AI_DRAFT__') {
    return { ok: true };
  }
  return { ok: false, status: 400, error: '此預約已提交正式學習報告，不能再覆蓋 AI 草稿。' };
}
