import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('coach schedule page does not leave coaches stuck on indefinite loading', () => {
  const source = read('app/coach/schedule/page.js');

  assert.match(source, /fetchWithTimeout/, 'schedule page should use a timeout-aware fetch helper for initial availability load');
  assert.match(source, /loadError/, 'schedule page should keep a user-facing load error state');
  assert.match(source, /setLoadError\(/, 'schedule page should set load error state when availability cannot load');
  assert.match(source, /catch\s*\(/, 'schedule page initial load should catch fetch/json/timeout failures');
  assert.match(source, /無法載入固定時段|固定時段載入失敗/, 'schedule page should render a clear failure message instead of only spinning');
  assert.match(source, /重新載入/, 'schedule page should render a retry action');
  assert.match(source, /回教練中心/, 'schedule page should provide a safe way back to the coach dashboard');
  assert.doesNotMatch(source, /\.then\(\(response\) => response\.ok \? response\.json\(\) : null\)/, 'schedule page should not silently coerce failed API responses into empty data');
});

test('coach plans page does not rely on alert-only failures during initial load', () => {
  const source = read('app/coach/plans/page.js');

  assert.match(source, /fetchWithTimeout/, 'plans page should use a timeout-aware fetch helper for initial plan load');
  assert.match(source, /loadError/, 'plans page should keep a user-facing load error state');
  assert.match(source, /setLoadError\(/, 'plans page should set load error state when plans cannot load');
  assert.match(source, /catch\s*\(/, 'plans page initial load should catch fetch/json/timeout failures');
  assert.match(source, /無法載入方案|方案資料載入失敗|找不到教練資料/, 'plans page should render a clear failure message instead of only alerting');
  assert.match(source, /重新載入/, 'plans page should render a retry action');
  assert.match(source, /回教練中心|完成教練資料/, 'plans page should guide the coach to a safe next step');
  assert.doesNotMatch(source, /alert\(payload\.error \|\| '無法取得方案'\)/, 'plans initial load should not be alert-only on API failure');
});

test('timeout-aware fetch helper aborts slow management requests', () => {
  const source = read('lib/fetchWithTimeout.js');

  assert.match(source, /AbortController/, 'fetch helper should use AbortController');
  assert.match(source, /setTimeout/, 'fetch helper should set a timeout');
  assert.match(source, /clearTimeout/, 'fetch helper should clear the timeout');
  assert.match(source, /timeoutMs/, 'fetch helper should allow timeout configuration');
});
