const TAIPEI_TIMEZONE = 'Asia/Taipei';
const SLOT_MINUTES = 30;
const MAX_DISCOUNT_AMOUNT = 300;
const ADJUSTABLE_BOOKING_STATUSES = new Set(['pending_payment']);

function parseMinutes(timeText) {
  if (!timeText || typeof timeText !== 'string' || !timeText.includes(':')) return null;
  const [hourText, minuteText] = timeText.slice(0, 5).split(':');
  const hours = Number(hourText);
  const minutes = Number(minuteText);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  return (hours * 60) + minutes;
}

function toTaipeiParts(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TAIPEI_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});

  const dateString = `${parts.year}-${parts.month}-${parts.day}`;
  const minutes = (Number(parts.hour) * 60) + Number(parts.minute);
  const weekday = new Date(`${dateString}T00:00:00Z`).getUTCDay();
  return { dateString, minutes, weekday };
}

function normalizeRule(rule) {
  const weekday = Number(rule?.weekday ?? rule?.day ?? rule?.dayOfWeek);
  const startMinutes = parseMinutes(rule?.start_time ?? rule?.startTime ?? rule?.start);
  const endMinutes = parseMinutes(rule?.end_time ?? rule?.endTime ?? rule?.end);
  const slotMinutes = Number(rule?.slot_minutes ?? rule?.slotMinutes ?? SLOT_MINUTES);
  const isActive = rule?.is_active !== false;

  if (!isActive || !Number.isInteger(weekday) || weekday < 0 || weekday > 6) return null;
  if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) return null;
  if (!Number.isFinite(slotMinutes) || slotMinutes <= 0) return null;

  return { weekday, startMinutes, endMinutes, slotMinutes };
}

function parseLegacyRules(rawValue) {
  if (!rawValue || typeof rawValue !== 'string') return [];
  try {
    const parsed = JSON.parse(rawValue);
    const source = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.slots) ? parsed.slots : []);
    return source.map(normalizeRule).filter(Boolean);
  } catch {
    return [];
  }
}

function normalizeException(exception) {
  const date = exception?.exception_date ?? exception?.date;
  const type = exception?.exception_type ?? exception?.type;
  const startMinutes = parseMinutes(exception?.start_time ?? exception?.start);
  const endMinutes = parseMinutes(exception?.end_time ?? exception?.end);
  if (!date || !['available', 'unavailable'].includes(type)) return null;
  if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) return null;
  return { date, type, startMinutes, endMinutes };
}

function rangeContains(start, end, containerStart, containerEnd) {
  return start >= containerStart && end <= containerEnd;
}

function rangesOverlap(leftStart, leftEnd, rightStart, rightEnd) {
  return leftStart < rightEnd && rightStart < leftEnd;
}

export function assertFutureBookingTime(expectedTime, now = new Date()) {
  const bookingDate = new Date(expectedTime);
  if (Number.isNaN(bookingDate.getTime())) {
    return { ok: false, status: 400, error: 'Invalid booking time' };
  }
  if (bookingDate.getTime() <= now.getTime()) {
    return { ok: false, status: 400, error: '不可預約過去時間' };
  }
  return { ok: true, date: bookingDate };
}

export function getServerCouponDiscount({ requestedCouponId, claimedCoupons = [], now = new Date() }) {
  if (!requestedCouponId) {
    return { couponId: null, percent: 0, coupon: null };
  }

  const coupon = claimedCoupons.find((item) => item?.id === requestedCouponId);
  if (!coupon) {
    throw new Error('找不到可用的優惠券');
  }

  if (coupon.expires) {
    const expiresAt = new Date(`${coupon.expires}T23:59:59+08:00`);
    if (Number.isFinite(expiresAt.getTime()) && expiresAt.getTime() < now.getTime()) {
      throw new Error('優惠券已過期');
    }
  }

  const percent = Number(coupon.discount);
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    throw new Error('優惠券折扣設定不合法');
  }

  return { couponId: coupon.id, percent, coupon };
}

export function calculateBookingPrice({ basePrice, baseDiscountPercent = 0, couponDiscountPercent = 0, coachCommission = 20 }) {
  const normalizedBasePrice = Math.max(0, Math.round(Number(basePrice) || 0));
  const totalDiscountPercent = Math.max(0, Number(baseDiscountPercent || 0) + Number(couponDiscountPercent || 0));
  const discountAmount = Math.min(Math.round(normalizedBasePrice * (totalDiscountPercent / 100)), MAX_DISCOUNT_AMOUNT);
  const finalPrice = Math.max(0, normalizedBasePrice - discountAmount);
  const depositPaid = Math.round(finalPrice * 0.3);
  const normalizedCommission = Number.isFinite(Number(coachCommission)) && Number(coachCommission) >= 0
    ? Number(coachCommission)
    : 20;
  const platformFee = Math.round(normalizedBasePrice * (normalizedCommission / 100));
  const coachPayout = Math.max(0, normalizedBasePrice - platformFee);

  return {
    totalDiscountPercent,
    discountAmount,
    finalPrice,
    depositPaid,
    platformFee,
    coachPayout,
  };
}

export function canAdjustBookingPrice({ actor, booking }) {
  if (!actor || !booking) return { ok: false, status: 404, error: '找不到該筆預約' };
  if (actor.role !== 'admin' && booking.coach_id !== actor.id) {
    return { ok: false, status: 403, error: '只能調整自己的預約金額' };
  }
  if (!ADJUSTABLE_BOOKING_STATUSES.has(booking.status)) {
    return { ok: false, status: 400, error: '只有待付款預約可以調整金額' };
  }
  return { ok: true };
}

export function isBookingTimeAllowed({ expectedTime, durationMinutes, rules = [], exceptions = [], legacyAvailableTimes = null }) {
  const parts = toTaipeiParts(expectedTime);
  const duration = Number(durationMinutes);
  if (!parts || !Number.isFinite(duration) || duration <= 0) {
    return { ok: false, error: '預約時間或課程長度不合法' };
  }

  const start = parts.minutes;
  const end = start + duration;
  if (start % SLOT_MINUTES !== 0 || duration % SLOT_MINUTES !== 0) {
    return { ok: false, error: '預約時間必須以 30 分鐘為單位' };
  }

  const normalizedRules = (Array.isArray(rules) ? rules : []).map(normalizeRule).filter(Boolean);
  const effectiveRules = normalizedRules.length ? normalizedRules : parseLegacyRules(legacyAvailableTimes);
  const normalizedExceptions = (Array.isArray(exceptions) ? exceptions : []).map(normalizeException).filter(Boolean);
  const dateExceptions = normalizedExceptions.filter((exception) => exception.date === parts.dateString);

  if (dateExceptions.some((exception) => exception.type === 'unavailable' && rangesOverlap(start, end, exception.startMinutes, exception.endMinutes))) {
    return { ok: false, error: '該時段已被教練標記為不可預約' };
  }

  const allowedByRule = effectiveRules.some((rule) => (
    rule.weekday === parts.weekday &&
    start % rule.slotMinutes === 0 &&
    rangeContains(start, end, rule.startMinutes, rule.endMinutes)
  ));

  const allowedByException = dateExceptions.some((exception) => (
    exception.type === 'available' && rangeContains(start, end, exception.startMinutes, exception.endMinutes)
  ));

  if (!allowedByRule && !allowedByException) {
    return { ok: false, error: '該時間不在教練可預約時段內' };
  }

  return { ok: true };
}
