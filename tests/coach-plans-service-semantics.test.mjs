import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const plansSource = readFileSync(join(root, 'app/coach/plans/page.js'), 'utf8');
const navigationSource = readFileSync(join(root, 'components/Navigation.js'), 'utf8');

test('coach plans page clearly positions plans as course packages, not complete service listing', () => {
  assert.match(plansSource, /課程方案/, 'page should use 課程方案 as the primary concept');
  for (const copy of [
    '課程方案用來設定單堂課長、價格與說明',
    '要能被學生預約，還需要完成審核、設定可上課時段、並確認公開服務已啟用',
    '建立方案不代表已經完成上架',
  ]) {
    assert.match(plansSource, new RegExp(copy), `plans page should explain: ${copy}`);
  }
  assert.doesNotMatch(
    plansSource,
    /新增任一自訂方案後，前台會改顯示你的自訂方案/,
    'copy must not imply creating a plan alone publishes the coach for student booking'
  );
});

test('coach plans page includes best-effort receiving-orders checklist without new schema or forbidden domains', () => {
  for (const label of [
    '身分 / 學生證審核通過',
    '至少一個啟用中的課程方案',
    '已設定可上課時段',
    '公開服務已啟用',
    '教練資料完整',
  ]) {
    assert.match(plansSource, new RegExp(label.replace(/[\/]/g, '\\$&')), `checklist should include ${label}`);
  }

  assert.match(plansSource, /fetchWithTimeout\('\/api\/auth\/profile'\)/, 'checklist should reuse existing profile endpoint');
  assert.match(plansSource, /fetchWithTimeout\('\/api\/coach\/availability'\)/, 'checklist should reuse existing availability endpoint');
  assert.doesNotMatch(plansSource, /\/api\/wallet|\/api\/settlements|\/api\/analytics|\/api\/coach\/referrals/, 'P1-B must not add wallet/settlement/analytics/referral dependencies');
});

test('coach plans page offers clear scoped CTAs without inventing new features', () => {
  for (const cta of ['新增課程方案', '設定可上課時段', '查看公開教練頁']) {
    assert.match(plansSource, new RegExp(cta), `plans page should include CTA: ${cta}`);
  }
  assert.match(plansSource, /router\.push\('\/coach\/schedule'\)/, 'schedule CTA should link to existing schedule route');
  assert.match(plansSource, /router\.push\(`\/coaches\/\$\{profile\?\.id \|\| user\?\.id\}`\)/, 'public coach CTA should link to existing public coach route by user id');
});

test('coach navigation labels /coach/plans as plans rather than full services', () => {
  assert.doesNotMatch(navigationSource, /\{\s*name:\s*['"]服務['"],\s*path:\s*['"]\/coach\/plans['"]/, 'coach nav must not label /coach/plans as 服務');
  assert.match(navigationSource, /\{\s*name:\s*['"]方案['"],\s*path:\s*['"]\/coach\/plans['"]/, 'coach nav should label /coach/plans as 方案');
});
