import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const source = readFileSync(join(root, 'app/dashboard/coach/page.js'), 'utf8');

test('coach dashboard P1-A removes misleading mock metrics and hardcoded service count', () => {
  assert.doesNotMatch(source, /thisMonthEarnings\s*=\s*12500/, 'must not keep fake monthly earnings');
  assert.doesNotMatch(source, /studentCount\s*=\s*34/, 'must not keep fake active student count');
  assert.doesNotMatch(source, /目前有\s*2\s*個啟用中的服務/, 'must not hardcode active service count');
  assert.doesNotMatch(source, /Mock data|premium feel/i, 'must not document fake metrics as premium feel');
});

test('coach dashboard P1-A prioritizes today workbench before marketing hero', () => {
  const todoIndex = source.indexOf('今日待辦');
  const heroIndex = source.indexOf('還在 FB 社團');

  assert.notEqual(todoIndex, -1, 'first screen should include 今日待辦');
  assert.notEqual(heroIndex, -1, 'marketing hero may remain but must be demoted');
  assert.ok(todoIndex < heroIndex, '今日待辦 should appear before marketing hero');

  for (const label of ['今日預約', '未讀訊息', '待確認訂單', '待付款提醒', '待填課後日誌']) {
    assert.match(source, new RegExp(label), `today workbench should include ${label}`);
  }
  assert.match(
    source,
    /今天還沒有待辦，先確認你的服務與時段是否已開放。/,
    'empty todo state must be safe and action-oriented'
  );
});

test('coach dashboard P1-A includes lightweight best-effort go-live checklist without new DB dependencies', () => {
  for (const label of [
    '身分與學生證審核',
    '課程方案',
    '可約時段',
    '自介內容',
  ]) {
    assert.match(source, new RegExp(label.replace(/[\/]/g, '\\$&')), `checklist should include ${label}`);
  }

  assert.match(source, /fetch\('\/api\/coach\/plans'\)/, 'checklist should reuse existing plans endpoint');
  assert.match(source, /fetch\('\/api\/coach\/availability'\)/, 'checklist should reuse existing availability endpoint');
  assert.doesNotMatch(source, /\/api\/wallet|\/api\/settlements|\/api\/analytics|\/api\/referrals/, 'P1-A must not add wallet/settlement/analytics/referral dependencies');
});

test('coach dashboard P1-A shows safe empty operational states instead of forcing numbers', () => {
  for (const copy of ['尚無完成課程', '尚無學生資料', '建立你的第一個課程方案']) {
    assert.match(source, new RegExp(copy), `dashboard should show safe empty state: ${copy}`);
  }
  assert.match(source, /completedBookings\.length/, 'completed course state should be derived from bookings');
  assert.match(source, /uniqueStudentIds\.size/, 'student state should be derived from unique real booking students');
});
