import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const scheduleSource = readFileSync(join(root, 'app/coach/schedule/page.js'), 'utf8');

test('coach schedule page uses Chinese weekday labels instead of English weekday labels', () => {
  for (const day of ['一', '二', '三', '四', '五', '六', '日']) {
    assert.match(scheduleSource, new RegExp(`label:\\s*['"]${day}['"]`), `weekday should include ${day}`);
  }
  assert.doesNotMatch(scheduleSource, /label:\s*['"](?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)['"]/, 'coach-facing weekdays must not be English abbreviations');
});

test('coach schedule page includes weekly summary without fake booking numbers', () => {
  for (const copy of [
    '本週已開放時段數',
    '今日預約數',
    '本週預約數',
    '尚未開放時段提醒',
    '本週還沒有正式預約',
    '尚未設定可上課時段',
  ]) {
    assert.match(scheduleSource, new RegExp(copy), `missing weekly summary copy: ${copy}`);
  }

  assert.match(scheduleSource, /fetchWithTimeout\('\/api\/bookings'\)/, 'summary should reuse existing bookings endpoint, not add a new API');
  assert.match(scheduleSource, /FORMAL_BOOKING_STATUSES/, 'summary should count only formal bookings, not pending_payment');
  assert.doesNotMatch(scheduleSource, /今日預約數[\s\S]{0,120}(?:12|34|12500)|本週預約數[\s\S]{0,120}(?:12|34|12500)/, 'summary must not introduce fake booking counts');
});

test('coach schedule page adds today/week/upcoming availability sections and mobile-readable cards', () => {
  for (const copy of ['今日課程', '本週即將上課', '可被預約時段', 'weekday chips', 'compact schedule rows']) {
    assert.match(scheduleSource, new RegExp(copy), `missing mobile/schedule section marker: ${copy}`);
  }

  assert.match(scheduleSource, /selectedWeekday/, 'mobile weekday chips should filter compact schedule rows by selected weekday');
  assert.match(scheduleSource, /visibleDaySlots/, 'compact schedule rows should be derived from existing availability rules');
  assert.match(scheduleSource, /overflowX:\s*'auto'[\s\S]{0,220}minWidth:\s*720/, 'desktop table may remain but should be less than previous 860px burden');
  assert.doesNotMatch(scheduleSource, /minWidth:\s*860/, 'schedule table should no longer force the old 860px horizontal scroll');
});

test('coach schedule page keeps scope to UI copy and existing endpoints', () => {
  for (const cta of ['儲存整週可上課時段', '會以目前勾選內容覆蓋原本固定週課表', '平日晚上', '週末全天', '清空全部', '編輯時段']) {
    assert.match(scheduleSource, new RegExp(cta), `missing primary CTA: ${cta}`);
  }
  for (const copy of [
    '學生只能預約你開放且未被占用的時段',
    'pending_payment 不等於正式排程',
  ]) {
    assert.match(scheduleSource, new RegExp(copy), `missing secondary explanation: ${copy}`);
  }

  assert.doesNotMatch(scheduleSource, /\/api\/wallet|\/api\/earnings|\/api\/settlements|Google Calendar|LINE Bot|calendar integration/i, 'P1-D must not add wallet/earnings/settlement/calendar integrations');
});
