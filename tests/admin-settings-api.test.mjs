import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const adminSettingsRoute = readFileSync(join(root, 'app/api/admin/settings/route.js'), 'utf8');

function functionBody(source, exportName) {
  const marker = `export async function ${exportName}`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `${exportName} handler must exist`);
  const nextExport = source.indexOf('\nexport async function ', start + marker.length);
  return nextExport === -1 ? source.slice(start) : source.slice(start, nextExport);
}

test('admin settings GET requires admin role before reading platform settings', () => {
  const getBody = functionBody(adminSettingsRoute, 'GET');

  assert.match(
    getBody,
    /requireAuth\(\s*\[\s*['"]admin['"]\s*\]\s*\)/,
    'GET /api/admin/settings must require an admin role, not just any logged-in user'
  );

  const authCheckIndex = getBody.indexOf('requireAuth');
  const settingsReadIndex = getBody.indexOf(".from('platform_settings')");
  assert.ok(authCheckIndex !== -1 && settingsReadIndex !== -1 && authCheckIndex < settingsReadIndex, 'admin auth check must run before platform_settings read');
});

test('admin settings POST continues to require admin role before writes', () => {
  const postBody = functionBody(adminSettingsRoute, 'POST');

  assert.match(
    postBody,
    /requireAuth\(\s*\[\s*['"]admin['"]\s*\]\s*\)/,
    'POST /api/admin/settings must keep admin-only authorization'
  );

  const authCheckIndex = postBody.indexOf('requireAuth');
  const settingsWriteIndex = postBody.indexOf(".from('platform_settings')");
  assert.ok(authCheckIndex !== -1 && settingsWriteIndex !== -1 && authCheckIndex < settingsWriteIndex, 'admin auth check must run before platform_settings write');
});
