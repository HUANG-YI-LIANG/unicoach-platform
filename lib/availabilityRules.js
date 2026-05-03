function parseTimeToMinutes(timeText) {
  if (!timeText || typeof timeText !== 'string' || !timeText.includes(':')) {
    return null;
  }

  const [hoursText, minutesText] = timeText.slice(0, 5).split(':');
  const hours = Number(hoursText);
  const minutes = Number(minutesText);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return (hours * 60) + minutes;
}

function normalizeDate(value) {
  return String(value || '').slice(0, 10);
}

function normalizeTime(value) {
  return String(value || '').slice(0, 5);
}

function rangesOverlap(leftStart, leftEnd, rightStart, rightEnd) {
  return leftStart < rightEnd && rightStart < leftEnd;
}

function normalizeException(exception) {
  if (!exception || typeof exception !== 'object') {
    return null;
  }

  const date = normalizeDate(exception.exception_date || exception.date);
  const type = String(exception.exception_type || exception.type || '');
  const startTime = normalizeTime(exception.start_time || exception.start);
  const endTime = normalizeTime(exception.end_time || exception.end);
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !['available', 'unavailable'].includes(type)) {
    return null;
  }
  if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
    return null;
  }

  return {
    ...exception,
    exception_date: date,
    exception_type: type,
    start_time: startTime,
    end_time: endTime,
    startMinutes,
    endMinutes,
  };
}

export function sanitizeAvailabilityException(body = {}) {
  const date = normalizeDate(body.exception_date || body.date);
  const type = String(body.exception_type || body.type || '');
  const startTime = normalizeTime(body.start_time || body.start);
  const endTime = normalizeTime(body.end_time || body.end);
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { error: '請選擇日期' };
  }
  if (!['available', 'unavailable'].includes(type)) {
    return { error: '例外類型不合法' };
  }
  if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
    return { error: '例外時段起訖不合法' };
  }
  if ((startMinutes % 30) !== 0 || (endMinutes % 30) !== 0) {
    return { error: '例外時段必須以 30 分鐘為單位' };
  }

  return {
    value: {
      exception_date: date,
      exception_type: type,
      start_time: startTime,
      end_time: endTime,
      reason: body.reason ? String(body.reason).trim().slice(0, 120) : '',
    },
  };
}

export function findOverlappingAvailabilityException(candidate, existingExceptions = [], options = {}) {
  const normalizedCandidate = normalizeException(candidate);
  if (!normalizedCandidate) {
    return null;
  }

  const excludeId = options.excludeId ? String(options.excludeId) : null;

  for (const exception of Array.isArray(existingExceptions) ? existingExceptions : []) {
    if (excludeId && String(exception?.id) === excludeId) {
      continue;
    }

    const normalizedExisting = normalizeException(exception);
    if (!normalizedExisting) {
      continue;
    }

    if (normalizedExisting.exception_date !== normalizedCandidate.exception_date) {
      continue;
    }

    if (rangesOverlap(
      normalizedCandidate.startMinutes,
      normalizedCandidate.endMinutes,
      normalizedExisting.startMinutes,
      normalizedExisting.endMinutes,
    )) {
      return exception;
    }
  }

  return null;
}

export function isAvailabilityExceptionOverlapError(error) {
  if (!error) {
    return false;
  }

  const code = String(error.code || '');
  const message = String(error.message || error.details || '').toLowerCase();

  return code === '23P01' || message.includes('coach_availability_exceptions_no_overlap');
}
