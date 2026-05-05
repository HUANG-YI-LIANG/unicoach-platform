import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');

test('production app does not expose the scratch /test route', () => {
  assert.equal(existsSync(join(root, 'app/test/page.js')), false, 'app/test/page.js should be removed before production');
});

test('login page does not show demo credentials in placeholders', () => {
  const source = read('app/login/page.js');
  assert.doesNotMatch(source, /user@test\.com/i, 'login email placeholder must not contain demo/test email');
  assert.doesNotMatch(source, /placeholder=["']123456["']/, 'login password placeholder must not contain demo password');
  assert.match(source, /placeholder=["']請輸入 Email["']/, 'login email placeholder should use production copy');
  assert.match(source, /placeholder=["']請輸入密碼["']/, 'login password placeholder should use production copy');
});
