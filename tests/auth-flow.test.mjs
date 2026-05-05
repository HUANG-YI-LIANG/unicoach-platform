import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');

test('auth redirect helper exists and maps only known roles to safe dashboards', () => {
  const helperPath = join(root, 'lib/authRedirects.js');
  assert.equal(existsSync(helperPath), true, 'lib/authRedirects.js should centralize role redirect decisions');

  const source = read('lib/authRedirects.js');
  assert.match(source, /export function getDashboardPathForRole\s*\(/, 'must export getDashboardPathForRole');
  assert.match(source, /case ['"]admin['"]:\s*return ['"]\/dashboard\/admin['"]/, 'admin must map to admin dashboard');
  assert.match(source, /case ['"]coach['"]:\s*return ['"]\/dashboard\/coach['"]/, 'coach must map to coach dashboard');
  assert.match(source, /case ['"]user['"]:\s*return ['"]\/dashboard\/user['"]/, 'user must map to user dashboard');
  assert.match(source, /default:\s*return ['"]\/login['"]/, 'unknown roles should not be routed to arbitrary dashboard paths');
});

test('login page sanitizes redirect query and does not build dashboard paths from untrusted role strings', () => {
  const source = read('app/login/page.js');
  assert.match(source, /getSafeRedirectPath/, 'login should sanitize redirect query before router.push');
  assert.match(source, /getDashboardPathForRole/, 'login should use centralized role-to-dashboard mapping');
  assert.doesNotMatch(source, /router\.push\(redirectTarget\)/, 'login must not push raw redirectTarget');
  assert.doesNotMatch(source, /['"]\/dashboard\/['"]\s*\+\s*data\.user\.role/, 'login must not concatenate arbitrary roles into dashboard URLs');
});

test('register page aligns with server session creation and redirects newly registered users by role', () => {
  const source = read('app/register/page.js');
  assert.match(source, /useAuth/, 'register should refresh client auth context after API sets the session cookie');
  assert.match(source, /await\s+refresh\(\)/, 'register should refresh auth context before redirecting');
  assert.match(source, /getDashboardPathForRole\(data\.user\?\.role\)/, 'register should redirect based on normalized API-returned role');
  assert.doesNotMatch(source, /router\.push\(['"]\/login['"]\)/, 'register should not send a session-authenticated user back to login');
  assert.doesNotMatch(source, /alert\(['"]註冊成功！請登入。['"]\)/, 'register should not tell users to login when a session cookie was already issued');
});

for (const [path, expectedRole] of [
  ['app/dashboard/admin/page.js', 'admin'],
  ['app/dashboard/coach/page.js', 'coach'],
  ['app/dashboard/user/page.js', 'user'],
]) {
  test(`${path} redirects authenticated users with the wrong role`, () => {
    const source = read(path);
    assert.match(source, /getDashboardPathForRole/, `${path} should import/use centralized role redirects`);
    assert.match(source, new RegExp(`profile(?:Data)?\\.role\\s*!==\\s*['"]${expectedRole}['"]|pData\\.profile\\.role\\s*!==\\s*['"]${expectedRole}['"]`), `${path} must check for role ${expectedRole}`);
    assert.match(source, new RegExp(`router\\.replace\\(getDashboardPathForRole\\([^)]*\\)\\)|router\\.push\\(getDashboardPathForRole\\([^)]*\\)\\)`), `${path} should route wrong-role users to their own dashboard`);
  });
}
