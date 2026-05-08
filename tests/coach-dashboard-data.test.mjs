import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const dashboardSource = readFileSync(join(root, 'app/dashboard/coach/page.js'), 'utf8');
const profileRouteSource = readFileSync(join(root, 'app/api/auth/profile/route.js'), 'utf8');

function functionBody(source, exportName) {
  const marker = `export async function ${exportName}`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `${exportName} handler must exist`);
  const nextExport = source.indexOf('\nexport async function ', start + marker.length);
  return nextExport === -1 ? source.slice(start) : source.slice(start, nextExport);
}

test('coach dashboard uses immutable DB referral_code instead of deriving mutable UNICOACH codes from profile names', () => {
  const referralLine = dashboardSource.match(/const\s+referralCode\s*=\s*[^;]+;/)?.[0] || '';

  assert.notEqual(referralLine, '', 'coach dashboard must define referralCode');
  assert.doesNotMatch(
    referralLine,
    /UNICOACH|profile\?\.name|['"]COACH['"]|toUpperCase\(\)/,
    'coach dashboard referralCode must not derive from mutable profile.name or placeholder code'
  );
  assert.match(
    referralLine,
    /coachDetail\?\.referral_code/,
    'coach dashboard must read the immutable referral_code returned by the profile route'
  );
  assert.doesNotMatch(
    dashboardSource,
    /coachDetail\?\.commission_rate\s*\|\|\s*45/,
    'valid 0% dynamic commission must not fall back to the legacy 45% default'
  );
  assert.match(
    dashboardSource,
    /coachDetail\?\.commission_rate\s*\?\?\s*45/,
    'commission fallback should use nullish coalescing so 0 remains displayable'
  );
  assert.match(
    dashboardSource,
    /const\s+promotionUrl\s*=\s*typeof\s+window\s*!==\s*['"]undefined['"]\s*&&\s*referralCode\s*\?/,
    'promotion URL should only be generated when a real DB referral code exists'
  );
});

test('profile GET attaches dynamic coach performance fields consumed by the dashboard', () => {
  const getBody = functionBody(profileRouteSource, 'GET');

  assert.match(
    profileRouteSource,
    /import\s+\{\s*getCoachPerformanceByUserId\s*\}\s+from\s+['"]@\/lib\/coachPerformance['"]/,
    'profile route should import getCoachPerformanceByUserId()'
  );
  assert.match(
    getBody,
    /getCoachPerformanceByUserId\(\s*user\.id\s*,\s*adminSupabase\s*\)/,
    'profile GET should calculate coach performance with the existing admin Supabase client'
  );
  assert.match(
    getBody,
    /performance_metrics\s*:\s*performance\.metrics/,
    'profile coach DTO must expose performance_metrics for the dashboard panel'
  );
  assert.match(
    getBody,
    /performance_thresholds\s*:\s*performance\.thresholds/,
    'profile coach DTO must expose performance_thresholds for dashboard targets'
  );
  assert.match(
    getBody,
    /level\s*:\s*performance\.currentLevel/,
    'profile coach DTO must expose dynamic current level consumed by the dashboard'
  );
  assert.match(
    getBody,
    /commission_rate\s*:\s*performance\.currentCommission/,
    'profile coach DTO must expose dynamic current commission consumed by the dashboard'
  );
});
