import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const headerSource = () => readFileSync(join(root, 'components/Header.js'), 'utf8');

test('Header renders a theme toggle button wired to ThemeProvider before auth controls', () => {
  const source = headerSource();

  assert.match(source, /import\s+\{\s*useTheme\s*\}\s+from\s+['"]\.\/ThemeProvider['"];/, 'Header must import useTheme from ThemeProvider');
  assert.match(source, /import\s+\{[^}]*\bSun\b[^}]*\bMoon\b[^}]*\}\s+from\s+['"]lucide-react['"];/s, 'Header must import Sun and Moon icons from lucide-react');
  assert.match(source, /const\s+\{\s*theme\s*,\s*toggleTheme\s*\}\s*=\s*useTheme\(\s*\)/, 'Header must read theme and toggleTheme from useTheme()');

  const headerRightIndex = source.indexOf('className="header-right"');
  const buttonIndex = source.indexOf('onClick={toggleTheme}', headerRightIndex);
  const authIndex = Math.min(
    ...[source.indexOf('{loading ?', headerRightIndex), source.indexOf('href="/login"', headerRightIndex)].filter((index) => index >= 0)
  );

  assert.ok(headerRightIndex >= 0, 'Header must contain .header-right');
  assert.ok(buttonIndex > headerRightIndex, 'Theme toggle must be rendered inside .header-right');
  assert.ok(buttonIndex < authIndex, 'Theme toggle must appear before loading/user/login controls');
});

test('Header theme toggle uses accessible icon-button styles and swaps Sun/Moon by theme', () => {
  const source = headerSource();

  assert.match(source, /<button[\s\S]*onClick=\{toggleTheme\}[\s\S]*aria-label=\{theme\s*===\s*['"]dark['"]\s*\?\s*['"]切換為淺色模式['"]\s*:\s*['"]切換為深色模式['"]\}/, 'Theme toggle should have an accessible aria-label');
  assert.match(source, /theme\s*===\s*['"]dark['"]\s*\?\s*<Sun\s+size=\{20\}\s*\/>\s*:\s*<Moon\s+size=\{20\}\s*\/>/, 'Theme toggle must show Sun in dark mode and Moon otherwise');
  assert.match(source, /border\s*:\s*['"]none['"]/, 'Theme toggle must remove borders');
  assert.match(source, /background\s*:\s*['"]transparent['"]/, 'Theme toggle background must be transparent');
  assert.match(source, /color\s*:\s*['"]var\(--color-text\)['"]/, 'Theme toggle color must use the global text token');
  assert.match(source, /cursor\s*:\s*['"]pointer['"]/, 'Theme toggle must use pointer cursor');
});
