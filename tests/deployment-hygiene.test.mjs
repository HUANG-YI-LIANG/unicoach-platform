import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const projectRoot = path.resolve(process.cwd());
const apiRoot = path.join(projectRoot, 'app', 'api');

function collectRouteFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectRouteFiles(fullPath);
    return entry.name === 'route.js' ? [fullPath] : [];
  });
}

function read(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

test('every API route explicitly opts into nodejs runtime and force-dynamic rendering', () => {
  const routeFiles = collectRouteFiles(apiRoot);
  assert.ok(routeFiles.length > 0, 'expected to find API route.js files');

  const invalid = routeFiles
    .map((file) => ({ file: path.relative(projectRoot, file), source: readFileSync(file, 'utf8') }))
    .filter(({ source }) => {
      const runtimeMatches = source.match(/export\s+const\s+runtime\s*=\s*['"]nodejs['"]\s*;/g) || [];
      const dynamicMatches = source.match(/export\s+const\s+dynamic\s*=\s*['"]force-dynamic['"]\s*;/g) || [];
      return runtimeMatches.length !== 1 || dynamicMatches.length !== 1;
    })
    .map(({ file }) => file);

  assert.deepEqual(invalid, []);
});

test('referral code migration adds immutable unique coach referral codes and backfills legacy coaches', () => {
  const sql = read('supabase_migration_referral_code.sql');

  assert.match(sql, /ALTER\s+TABLE\s+public\.coaches[\s\S]*ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+referral_code\s+TEXT/i);
  assert.match(sql, /UNIQUE[\s\S]*referral_code|referral_code[\s\S]*UNIQUE/i);
  assert.match(sql, /CREATE\s+EXTENSION\s+IF\s+NOT\s+EXISTS\s+pgcrypto/i);
  assert.match(sql, /gen_random_uuid\s*\(/i);
  assert.match(sql, /CHECK[\s\S]*char_length\s*\(\s*referral_code\s*\)[\s\S]*BETWEEN\s+6\s+AND\s+8/i);
  assert.match(sql, /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.protect_coach_referral_code\s*\(/i);
  assert.match(sql, /BEFORE\s+INSERT\s+OR\s+UPDATE[\s\S]*referral_code/i);
  assert.match(sql, /RAISE\s+EXCEPTION[\s\S]*referral_code/i);
  assert.match(sql, /UPDATE\s+public\.coaches[\s\S]*WHERE\s+referral_code\s+IS\s+NULL/i);
  assert.match(sql, /NULLIF\s*\(\s*BTRIM\s*\(\s*OLD\.referral_code\s*\)\s*,\s*''\s*\)\s+IS\s+NOT\s+NULL/i);
  assert.match(sql, /BTRIM\s*\(\s*referral_code\s*\)\s*=\s*''/i);
});


test('public coach detail API uses an explicit coach DTO allowlist without spreading raw coach rows', () => {
  const detailRoute = read('app/api/coaches/[id]/route.js');

  assert.doesNotMatch(detailRoute, /\.from\(['"]coaches['"]\)[\s\S]*\.select\(['"]\*\s*,\s*users!inner/);
  assert.doesNotMatch(detailRoute, /\.\.\.coach\b/);
  assert.match(detailRoute, /PUBLIC_COACH_DETAIL_SELECT\s*=\s*`[\s\S]*user_id[\s\S]*university[\s\S]*location[\s\S]*service_areas[\s\S]*referral_code[\s\S]*users!inner\(name, id, avatar_url, level\)[\s\S]*`/);
  assert.match(detailRoute, /\.from\(['"]coaches['"]\)[\s\S]*\.select\(PUBLIC_COACH_DETAIL_SELECT\)/);
});

test('public coach APIs return database referral_code without deriving codes from mutable names', () => {
  const listRoute = read('app/api/coaches/route.js');
  const detailRoute = read('app/api/coaches/[id]/route.js');

  for (const source of [listRoute, detailRoute]) {
    assert.match(source, /referral_code/);
    assert.doesNotMatch(source, /promotion_code/);
    assert.doesNotMatch(source, /name\s*\.\s*(slice|substring|substr|replace|toUpperCase)/);
  }
});

test('profile route returns immutable coach referral_code and never writes it from profile updates', () => {
  const source = read('app/api/auth/profile/route.js');

  assert.match(source, /referral_code/);
  assert.match(source, /\.select\([^)]*referral_code[^)]*\)/s);
  assert.doesNotMatch(source, /coachUpdates\.referral_code\s*=/);
  assert.doesNotMatch(source, /body\.referral_code/);
});

test('apply-code route accepts coach referral_code instead of mutable user promotion_code', () => {
  const source = read('app/api/user/apply-code/route.js');

  assert.match(source, /\.from\(['"]coaches['"]\)[\s\S]*\.select\([^)]*referral_code[\s\S]*users!inner/i);
  assert.match(source, /\.eq\(['"]referral_code['"],\s*cleanCode\)/);
  assert.doesNotMatch(source, /\.from\(['"]users['"]\)[\s\S]*\.eq\(['"]promotion_code['"],\s*cleanCode\)/);
});
