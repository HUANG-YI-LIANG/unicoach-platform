import test from 'node:test';
import assert from 'node:assert/strict';

import {
  findOverlappingAvailabilityException,
  isAvailabilityExceptionOverlapError,
  sanitizeAvailabilityException,
} from '../lib/availabilityRules.js';

test('sanitizeAvailabilityException normalizes valid exception input', () => {
  const result = sanitizeAvailabilityException({
    date: '2026-05-10T12:34:56.000Z',
    type: 'unavailable',
    start: '10:00:59',
    end: '11:30:00',
    reason: '  臨時請假  ',
  });

  assert.equal(result.error, undefined);
  assert.deepEqual(result.value, {
    exception_date: '2026-05-10',
    exception_type: 'unavailable',
    start_time: '10:00',
    end_time: '11:30',
    reason: '臨時請假',
  });
});

test('sanitizeAvailabilityException rejects invalid type and non-30-minute ranges', () => {
  assert.equal(sanitizeAvailabilityException({
    exception_date: '2026-05-10',
    exception_type: 'blocked',
    start_time: '10:00',
    end_time: '11:00',
  }).error, '例外類型不合法');

  assert.equal(sanitizeAvailabilityException({
    exception_date: '2026-05-10',
    exception_type: 'unavailable',
    start_time: '10:15',
    end_time: '11:00',
  }).error, '例外時段必須以 30 分鐘為單位');
});

test('findOverlappingAvailabilityException detects same-date overlap and allows touching boundaries', () => {
  const existing = [
    { id: 'old-1', exception_date: '2026-05-10', exception_type: 'unavailable', start_time: '09:00', end_time: '10:00' },
    { id: 'old-2', exception_date: '2026-05-10', exception_type: 'available', start_time: '11:00', end_time: '12:00' },
    { id: 'old-3', exception_date: '2026-05-11', exception_type: 'available', start_time: '10:30', end_time: '11:30' },
  ];

  assert.equal(findOverlappingAvailabilityException({
    exception_date: '2026-05-10',
    exception_type: 'unavailable',
    start_time: '10:00',
    end_time: '11:00',
  }, existing), null);

  const overlap = findOverlappingAvailabilityException({
    exception_date: '2026-05-10',
    exception_type: 'unavailable',
    start_time: '10:30',
    end_time: '11:30',
  }, existing);

  assert.equal(overlap.id, 'old-2');
});

test('findOverlappingAvailabilityException ignores an excluded exception id', () => {
  const existing = [
    { id: 'self', exception_date: '2026-05-10', exception_type: 'available', start_time: '10:00', end_time: '11:00' },
  ];

  assert.equal(findOverlappingAvailabilityException({
    id: 'self',
    exception_date: '2026-05-10',
    exception_type: 'available',
    start_time: '10:00',
    end_time: '11:00',
  }, existing, { excludeId: 'self' }), null);
});

test('isAvailabilityExceptionOverlapError recognizes database exclusion conflicts', () => {
  assert.equal(isAvailabilityExceptionOverlapError({ code: '23P01' }), true);
  assert.equal(isAvailabilityExceptionOverlapError({ message: 'violates exclusion constraint "coach_availability_exceptions_no_overlap"' }), true);
  assert.equal(isAvailabilityExceptionOverlapError({ code: '23505' }), false);
});
