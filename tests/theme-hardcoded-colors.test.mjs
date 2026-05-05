import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const root = process.cwd();
const runtimeRoots = ['app', 'components'].map((dir) => join(root, dir));
const checkedExtensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.css']);
const ignoredPathParts = new Set(['node_modules', '.next', '.git', 'backups', 'session_bak']);
const ignoredFiles = new Set([
  'app/globals.css',
  'app/icon.jsx',
  'app/apple-icon.jsx',
  'app/manifest.js',
  'app/page.module.css',
]);

const hardcodedThemeColors = new Map([
  ['#ffffff', 'var(--text-light) for foreground text or var(--color-surface) for surfaces'],
  ['#fff', 'var(--text-light) for foreground text or var(--color-surface) for surfaces'],
  ['white', 'var(--text-light) for foreground text or var(--color-surface) for surfaces'],
  ['#f8fafc', 'var(--color-bg) or var(--color-surface-soft)'],
  ['#f1f5f9', 'var(--color-surface-soft)'],
  ['#fafafa', 'var(--color-bg)'],
  ['#0f172a', 'var(--color-text)'],
  ['#111827', 'var(--color-card) or var(--color-surface-soft)'],
  ['#1e293b', 'var(--color-border) or var(--color-surface-soft)'],
  ['#020617', 'var(--bg-input)'],
  ['#000', 'var(--color-text) or overlay rgba when intentional'],
  ['black', 'var(--color-text)'],
  ['#64748b', 'var(--color-text-muted)'],
  ['#94a3b8', 'var(--color-text-muted)'],
  ['#e2e8f0', 'var(--color-border)'],
  ['#cbd5e1', 'var(--border-input)'],
  ['#0a0a0f', 'var(--color-bg)'],
  ['#111118', 'var(--color-surface)'],
  ['#2a2a35', 'var(--color-border)'],
  ['#888899', 'var(--color-text-muted)'],
  ['#e8e8f0', 'var(--color-text)'],
]);

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const rel = relative(root, path).replaceAll('\\\\', '/');
    if (rel.split('/').some((part) => ignoredPathParts.has(part))) continue;
    if (entry.includes('_bak')) continue;
    const stats = statSync(path);
    if (stats.isDirectory()) {
      walk(path, files);
    } else if (checkedExtensions.has(extname(path)) && !ignoredFiles.has(rel)) {
      files.push(path);
    }
  }
  return files;
}

function stripCommentsAndUrls(line) {
  return line
    .replace(/\/\/.*$/, '')
    .replace(/\/\*.*?\*\//g, '')
    .replace(/https?:\/\/[^'"`\s)]+/g, '');
}

test('runtime pages and components do not hardcode neutral light/dark theme colors', () => {
  const violations = [];
  const colorRegex = /#[0-9a-fA-F]{3,8}\b|(?<![-])\b(?:white|black)\b(?![-])/g;

  for (const file of runtimeRoots.flatMap((dir) => walk(dir))) {
    const rel = relative(root, file).replaceAll('\\\\', '/');
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, index) => {
      const sanitized = stripCommentsAndUrls(line);
      for (const match of sanitized.matchAll(colorRegex)) {
        const literal = match[0].toLowerCase();
        if (!hardcodedThemeColors.has(literal)) continue;
        violations.push(`${rel}:${index + 1}: ${match[0]} should use ${hardcodedThemeColors.get(literal)}`);
      }
    });
  }

  assert.deepEqual(violations, [], `Hardcoded neutral theme colors break dark/light mode:\n${violations.join('\n')}`);
});

test('globals.css design tokens are not self-referential', () => {
  const globals = readFileSync(join(root, 'app/globals.css'), 'utf8');
  const selfReferences = [];
  for (const match of globals.matchAll(/(--[a-z0-9-]+)\s*:\s*var\(\1\)/gi)) {
    selfReferences.push(match[0]);
  }

  assert.deepEqual(selfReferences, [], `CSS variables must not reference themselves:\n${selfReferences.join('\n')}`);
});

test('theme bootstrapping applies data-theme before body renders and supports only light or dark', () => {
  const layout = readFileSync(join(root, 'app/layout.js'), 'utf8');
  const provider = readFileSync(join(root, 'components/ThemeProvider.js'), 'utf8');

  assert.match(layout, /document\.documentElement\.setAttribute\(['"]data-theme['"],\s*theme\)/, 'layout must set data-theme on html before body renders');
  assert.match(provider, /document\.documentElement\.setAttribute\(['"]data-theme['"],\s*newTheme\)/, 'ThemeProvider toggle must update the html data-theme attribute');
  assert.match(provider, /theme\s*===\s*['"]dark['"]\s*\?\s*['"]light['"]\s*:\s*['"]dark['"]/, 'ThemeProvider must toggle strictly between dark and light');
});
