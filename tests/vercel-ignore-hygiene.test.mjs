import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const vercelIgnore = readFileSync(join(root, '.vercelignore'), 'utf8');

function normalizedLines() {
  return vercelIgnore
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

test('.vercelignore is clean text without BOM or CRLF artifacts', () => {
  assert.ok(!vercelIgnore.startsWith('\uFEFF'), '.vercelignore must not start with a UTF-8 BOM');
  assert.equal(vercelIgnore.includes('\r'), false, '.vercelignore should use LF line endings so patterns are parsed cleanly');
});

test('.vercelignore excludes local build, dependency, backup, and smoke artifacts from deploy upload', () => {
  const lines = new Set(normalizedLines());
  const requiredPatterns = [
    'node_modules',
    'node_modules.broken*',
    '.next',
    '.vercel',
    '_hermes_backups',
    '_hermes_patches',
    '_hermes_smoke',
    'tests',
    'scripts',
    'docs',
    '*.log',
  ];

  const missing = requiredPatterns.filter((pattern) => !lines.has(pattern));
  assert.deepEqual(missing, [], `Missing deploy ignore patterns:\n${missing.join('\n')}`);
});

test('ImgBB local-file upload path is scoped for Vercel/Turbopack tracing', () => {
  const source = readFileSync(join(root, 'lib/imgbbApi.js'), 'utf8');

  assert.ok(
    source.includes('path.resolve(process.cwd(), \'public\')'),
    'ImgBB upload should scope relative local files to the public directory instead of tracing the whole project',
  );
  assert.ok(
    source.includes('/* turbopackIgnore: true */'),
    'Dynamic local file existence/read calls should opt out of Turbopack static tracing',
  );
  assert.ok(
    !source.includes('path.join(process.cwd(), normalizedPath)'),
    'Do not use dynamic path.join(process.cwd(), normalizedPath), which makes Vercel trace the whole repo',
  );
});
