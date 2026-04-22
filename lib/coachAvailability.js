const TAIPEI_TIMEZONE = 'Asia/Taipei';
const SLOT_MINUTES = 30;
const DEFAULT_LOOKAHEAD_DAYS = 14;

const DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: TAIPEI_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('sv-SE', {
  timeZone: TAIPEI_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function parseMinutes(timeText) {
  if (!timeText || typeof timeText !== 'string' || !timeText.includes(':')) {
    return null;
  }

  const [hourText, minuteText] = timeText.split(':');
  const hours = Number(hourText);
  const minutes = Number(minuteText);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return (hours * 60) + minutes;
}

export function minutesToTime(minutes) {
  const hours = String(Math.floor(minutes / 60)).padStart(2, '0');
  const mins = String(minutes % 60).padStart(2, '0');
  return `${hours}:${mins}`;
}

function normalizeRule(rule) {
  if (!rule || typeof rule !== 'object') {
    return null;
  }

  const weekday = Number(rule.weekday ?? rule.day ?? rule.dayOfWeek);
  const startMinutes = parseMinutes(rule.start ?? rule.startTime);
  const endMinutes = parseMinutes(rule.end ?? rule.endTime);
  const slotMinutes = Number(rule.slotMinutes ?? rule.slot_minutes ?? SLOT_MINUTES);

  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
    return null;
  }

  if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
    return null;
  }

  if (!Number.isFinite(slotMinutes) || slotMinutes <= 0) {
    return null;
  }

  return {
    weekday,
    startMinutes,
    endMinutes,
    slotMinutes,
  };
}

export function parseAvailableTimes(rawValue) {
  if (!rawValue || typeof rawValue !== 'string') {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);
    const source = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.slots) ? parsed.slots : []);
    return source.map(normalizeRule).filter(Boolean);
  } catch {
    return [];
  }
}

export function normalizeAvailabilityRules(rules, legacyAvailableTimes) {
  const normalizedRules = Array.isArray(rules)
    ? rules.map(normalizeRule).filter(Boolean)
    : [];

  if (normalizedRules.length) {
    return normalizedRules;
  }

  return parseAvailableTimes(legacyAvailableTimes);
}

function normalizeException(exception) {
  if (!exception || typeof exception !== 'object') {
    return null;
  }

  const date = exception.date || exception.exception_date;
  const type = exception.type || exception.exception_type;
  const startMinutes = parseMinutes(exception.start ?? exception.start_time);
  const endMinutes = parseMinutes(exception.end ?? exception.end_time);

  if (!date || !['available', 'unavailable'].includes(type)) {
    return null;
  }

  if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
    return null;
  }

  return {
    date,
    type,
    startMinutes,
    endMinutes,
  };
}

function slotOverlapsRange(slotTime, startMinutes, endMinutes) {
  const slotStart = parseMinutes(slotTime);
  if (slotStart === null) {
    return false;
  }

  const slotEnd = slotStart + SLOT_MINUTES;
  return slotStart < endMinutes && startMinutes < slotEnd;
}

export function getTodayDateString() {
  return DATE_FORMATTER.format(new Date());
}

export function addDays(dateString, offsetDays) {
  const [year, month, day] = dateString.split('-').map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day + offsetDays));
  return utcDate.toISOString().slice(0, 10);
}

export function getWeekday(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function toDateTimeKey(value) {
  const formatted = DATE_TIME_FORMATTER.format(new Date(value));
  return formatted.replace(' ', 'T');
}

export function formatSlotIso(dateString, timeText) {
  return `${dateString}T${timeText}:00+08:00`;
}

export function buildBookedSlotSet(bookings) {
  const set = new Set();
  for (const booking of bookings || []) {
    if (!booking?.expected_time) {
      continue;
    }

    if (booking.status === 'pending_payment' && booking.payment_expires_at) {
      const expiresAt = new Date(booking.payment_expires_at).getTime();
      if (Number.isFinite(expiresAt) && Date.now() > expiresAt) {
        continue;
      }
    }

    const durationMinutes = Math.max(SLOT_MINUTES, Number(booking.duration_minutes || SLOT_MINUTES));
    const start = new Date(booking.expected_time);

    for (let offset = 0; offset < durationMinutes; offset += SLOT_MINUTES) {
      set.add(toDateTimeKey(new Date(start.getTime() + (offset * 60 * 1000))));
    }
  }
  return set;
}

export function generateSlotsForCoach(coach, bookedSlotSet, options = {}) {
  const startDate = options.startDate || getTodayDateString();
  const lookaheadDays = options.lookaheadDays || DEFAULT_LOOKAHEAD_DAYS;
  const exceptions = Array.isArray(coach?.availability_exceptions)
    ? coach.availability_exceptions.map(normalizeException).filter(Boolean)
    : [];
  const rules = normalizeAvailabilityRules(coach?.availability_rules, coach?.available_times);
  const hasAvailableExceptions = exceptions.some((exception) => exception.type === 'available');
  if (!rules.length && !hasAvailableExceptions) {
    return [];
  }
  const slots = [];

  for (let offset = 0; offset < lookaheadDays; offset += 1) {
    const dateString = addDays(startDate, offset);
    const weekday = getWeekday(dateString);
    const dateExceptions = exceptions.filter((exception) => exception.date === dateString);

    for (const rule of rules) {
      if (rule.weekday !== weekday) {
        continue;
      }

      for (let cursor = rule.startMinutes; cursor + SLOT_MINUTES <= rule.endMinutes; cursor += SLOT_MINUTES) {
        const timeText = minutesToTime(cursor);
        const iso = formatSlotIso(dateString, timeText);
        const key = toDateTimeKey(iso);
        slots.push({
          iso,
          key,
          date: dateString,
          time: timeText,
          booked: bookedSlotSet?.has(key) || false,
        });
      }
    }

    for (const exception of dateExceptions) {
      if (exception.type !== 'available') {
        continue;
      }

      for (let cursor = exception.startMinutes; cursor + SLOT_MINUTES <= exception.endMinutes; cursor += SLOT_MINUTES) {
        const timeText = minutesToTime(cursor);
        const iso = formatSlotIso(dateString, timeText);
        const key = toDateTimeKey(iso);
        if (!slots.some((slot) => slot.key === key)) {
          slots.push({
            iso,
            key,
            date: dateString,
            time: timeText,
            booked: bookedSlotSet?.has(key) || false,
          });
        }
      }
    }

    for (const exception of dateExceptions) {
      if (exception.type !== 'unavailable') {
        continue;
      }

      for (const slot of slots) {
        if (slot.date === dateString && slotOverlapsRange(slot.time, exception.startMinutes, exception.endMinutes)) {
          slot.booked = true;
          slot.blocked_by_exception = true;
        }
      }
    }
  }

  return slots.sort((left, right) => left.iso.localeCompare(right.iso));
}

export function getNextAvailableSlot(coach, bookings, options = {}) {
  const bookedSlotSet = buildBookedSlotSet(bookings);
  const slots = generateSlotsForCoach(coach, bookedSlotSet, options);
  return slots.find((slot) => !slot.booked) || null;
}

export function doesCoachMatchSlot(coach, bookings, selectedDate, selectedTime) {
  if (!selectedDate || !selectedTime) {
    return false;
  }

  const bookedSlotSet = buildBookedSlotSet(bookings);
  const slots = generateSlotsForCoach(coach, bookedSlotSet, {
    startDate: selectedDate,
    lookaheadDays: 1,
  });

  return slots.some((slot) => slot.date === selectedDate && slot.time === selectedTime && !slot.booked);
}
