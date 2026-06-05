import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');

const themeAliases = [
  '--bg-page',
  '--bg-surface',
  '--bg-input',
  '--text-main',
  '--text-muted',
  '--text-light',
  '--border-main',
  '--border-input',
  '--border-active',
  '--primary',
  '--primary-bg',
  '--cta',
  '--success',
  '--success-bg',
  '--warning',
  '--warning-bg',
  '--error',
  '--danger-bg',
  '--shadow-sm',
  '--shadow-md',
  '--shadow-lg',
];

const sourcePaths = [
  'app/page.js',
  'app/bookings/page.js',
  'app/chat/[id]/page.js',
  'app/coach/plans/page.js',
  'app/coach/profile/edit/page.js',
  'app/coach/schedule/page.js',
  'app/coaches/page.js',
  'app/coaches/[id]/page.js',
  'app/dashboard/user/page.js',
  'components/Onboarding.js',
  'components/VideoFeed.js',
  'components/VideoGallery.js',
  'components/VideoUpload.js',
];

function extractDefinedVariables(css, selector) {
  const match = css.match(new RegExp(`${selector}\\s*\\{([\\s\\S]*?)\\n\\}`));
  assert.ok(match, `Missing ${selector} theme block in app/globals.css`);
  return new Set([...match[1].matchAll(/(--[A-Za-z0-9_-]+)\s*:/g)].map((entry) => entry[1]));
}

test('globals.css defines all legacy theme aliases in both light and dark theme blocks', () => {
  const css = read('app/globals.css');
  const lightVariables = extractDefinedVariables(css, ':root');
  const darkVariables = extractDefinedVariables(css, "\\[data-theme='dark'\\]");

  for (const variable of themeAliases) {
    assert.ok(lightVariables.has(variable), `${variable} must be defined in :root`);
    assert.ok(darkVariables.has(variable), `${variable} must be defined in [data-theme='dark']`);
  }
});

test('runtime source files do not reference undefined CSS variables', () => {
  const css = read('app/globals.css');
  const globallyDefined = new Set([...css.matchAll(/(--[A-Za-z0-9_-]+)\s*:/g)].map((entry) => entry[1]));
  const allowedRuntimeVariables = new Set(['--font-geist-sans']);
  const missing = [];

  for (const sourcePath of sourcePaths) {
    const source = read(sourcePath);
    const usedVariables = [...source.matchAll(/var\(\s*(--[A-Za-z0-9_-]+)/g)].map((entry) => entry[1]);
    for (const variable of usedVariables) {
      if (!globallyDefined.has(variable) && !allowedRuntimeVariables.has(variable)) {
        missing.push(`${relative(root, join(root, sourcePath))}: ${variable}`);
      }
    }
  }

  assert.deepEqual(missing, [], `Undefined CSS variables:\n${missing.join('\n')}`);
});

test('premium landing hero keeps primary title and brand readable on dark image overlay', () => {
  const css = read('app/globals.css');

  const titleBlock = css.match(/\.premium-title\s*\{([\s\S]*?)\n\}/)?.[1] || '';
  assert.ok(titleBlock.includes('color: #FFFFFF !important;'), 'Hero title must hard-code white text so theme variables cannot regress contrast');
  assert.ok(titleBlock.includes('-webkit-text-fill-color: #FFFFFF;'), 'Hero title needs explicit text fill for mobile browser readability');
  assert.ok(/text-shadow:\s*\n\s*0\s+2px\s+4px\s+rgba\(0,\s*0,\s*0,\s*0\.98\),\s*\n\s*0\s+0\s+18px\s+rgba\(0,\s*0,\s*0,\s*0\.96\),\s*\n\s*0\s+0\s+34px\s+rgba\(0,\s*0,\s*0,\s*0\.88\);/.test(titleBlock), 'Hero title needs a strong multi-layer dark text-shadow over the photo background');
  assert.ok(!titleBlock.includes('color: var(--color-surface);'), 'Hero title must not use dark surface color on the dark hero image');

  const brandBlock = css.match(/\.premium-brand\s*\{([\s\S]*?)\n\}/)?.[1] || '';
  assert.ok(brandBlock.includes('color: #FFFFFF !important;'), 'Hero brand pill text must stay readable');
  assert.ok(brandBlock.includes('-webkit-text-fill-color: #FFFFFF;'), 'Hero brand pill needs explicit text fill for mobile browser readability');
  assert.ok(!brandBlock.includes('color: var(--color-surface);'), 'Hero brand pill must not use dark surface color');

  const overlayBlock = css.match(/\.premium-hero-bg::after\s*\{([\s\S]*?)\n\}/)?.[1] || '';
  assert.ok(overlayBlock.includes('rgba(2,4,10,0.72)'), 'Hero photo overlay must be dark enough at the top for title readability');
  assert.ok(overlayBlock.includes('rgba(2,4,10,0.94)'), 'Hero photo overlay must stay dark behind the CTA/title stack');
});
