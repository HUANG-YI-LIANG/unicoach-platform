import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const globals = readFileSync('app/globals.css', 'utf8');

const extractCssBlock = (source, selector, startAt = 0) => {
  const selectorIndex = source.indexOf(selector, startAt);
  assert.notEqual(selectorIndex, -1, `${selector} block should exist`);
  const openIndex = source.indexOf('{', selectorIndex);
  assert.notEqual(openIndex, -1, `${selector} block should have an opening brace`);
  let depth = 0;
  for (let i = openIndex; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}') depth -= 1;
    if (depth === 0) return source.slice(openIndex + 1, i);
  }
  assert.fail(`${selector} block should have a closing brace`);
};

const baseBottomNav = extractCssBlock(globals, '.bottom-nav');
const mediaStart = globals.indexOf('@media (max-width: 400px)');
assert.notEqual(mediaStart, -1, 'max-width 400px media block should exist');
const mobileBottomNav = extractCssBlock(globals, '.bottom-nav', mediaStart);

test('bottom nav is fixed at the visual bottom and centered on mobile', () => {
  assert.match(baseBottomNav, /position:\s*fixed;/, 'bottom nav should remain fixed');
  assert.match(baseBottomNav, /bottom:\s*env\(safe-area-inset-bottom,\s*0px\);/, 'bottom nav should sit at the bottom while respecting safe area');
  assert.match(baseBottomNav, /left:\s*50%;/, 'base nav should be horizontally centered');
  assert.match(baseBottomNav, /transform:\s*translateX\(-50%\);/, 'base nav should use a matching centering transform');

  assert.doesNotMatch(mobileBottomNav, /left:\s*8px\s*!important;/, 'narrow phones must not combine left: 8px with translateX(-50%)');
  assert.doesNotMatch(mobileBottomNav, /right:\s*8px\s*!important;/, 'narrow phones should not pin both sides and keep translate centering');
  assert.match(mobileBottomNav, /left:\s*50%\s*!important;/, 'narrow phones should keep the nav centered');
  assert.match(mobileBottomNav, /right:\s*auto\s*!important;/, 'narrow phones should not stretch from both sides');
  assert.match(mobileBottomNav, /transform:\s*translateX\(-50%\);/, 'narrow phones should keep the centering transform paired with left: 50%');
});
