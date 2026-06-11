import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const shell = readFileSync('components/ConditionalShell.js', 'utf8');
const navigation = readFileSync('components/Navigation.js', 'utf8');
const globals = readFileSync('app/globals.css', 'utf8');
const matchPage = readFileSync('app/match/page.js', 'utf8');

const hiddenRouteTerms = [
  '/login',
  '/register',
  '/reset-password',
  '/onboarding',
  '/welcome',
  '/role-select',
  '/first-entry',
  '/match',
];

const retainedRouteTerms = [
  '/dashboard',
  '/coaches',
  '/bookings',
  '/coach/schedule',
  '/coach/profile/edit',
];

const extractTaskFlowRoutesBlock = (source) => {
  const match = source.match(/const TASK_FLOW_ROUTES = \[([\s\S]*?)\];/);
  assert.ok(match, 'source should define TASK_FLOW_ROUTES');
  return match[1];
};

test('ConditionalShell treats auth/onboarding/first-entry routes as standalone task flows', () => {
  assert.match(shell, /isTaskFlowRoute/, 'shell should name the auth/onboarding route guard explicitly');
  assert.match(shell, /if \(isTaskFlowRoute\(pathname\)\)/, 'task flows should use an explicit route-level shell branch');
  assert.match(shell, /<main className="task-flow-content">\{children\}<\/main>/, 'task flows should render without global header/nav but keep their own scroll container');

  for (const route of hiddenRouteTerms) {
    assert.match(shell, new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `shell should hide app shell on ${route}`);
  }

  const shellTaskFlowRoutes = extractTaskFlowRoutesBlock(shell);
  for (const route of retainedRouteTerms) {
    assert.doesNotMatch(shellTaskFlowRoutes, new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `shell task-flow guard must not hide retained app route ${route}`);
  }
});

test('Navigation itself also returns null on auth/onboarding/first-entry routes', () => {
  assert.match(navigation, /isTaskFlowRoute/, 'Navigation should protect against direct rendering outside ConditionalShell');
  assert.match(navigation, /if \(isChatRoom \|\| isTaskFlowRoute\(pathname\)\) return null;/, 'Navigation should return null for task flows and chat rooms');

  for (const route of hiddenRouteTerms) {
    assert.match(navigation, new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `Navigation should hide bottom nav on ${route}`);
  }

  const navigationTaskFlowRoutes = extractTaskFlowRoutesBlock(navigation);
  for (const route of retainedRouteTerms) {
    assert.doesNotMatch(navigationTaskFlowRoutes, new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `Navigation task-flow guard must not hide retained app route ${route}`);
  }
});

test('Task flows keep a dedicated mobile scroll container without restoring global navigation', () => {
  assert.match(shell, /<main className="task-flow-content">\{children\}<\/main>/, 'task flows should render inside a scrollable single-task main container');
  assert.match(globals, /\.task-flow-content\s*\{[\s\S]*min-height:\s*100dvh;/, 'task-flow-content should fill the dynamic mobile viewport without clipping longer forms');
  assert.match(globals, /\.task-flow-content\s*\{[\s\S]*overflow-y:\s*auto;/, 'task-flow-content should allow vertical scrolling');
  assert.match(globals, /\.task-flow-content\s*\{[\s\S]*-webkit-overflow-scrolling:\s*touch;/, 'task-flow-content should support momentum scrolling in mobile in-app browsers');
  assert.match(globals, /\.task-flow-content\s*\{[\s\S]*padding-bottom:\s*calc\(32px \+ env\(safe-area-inset-bottom\)\);/, 'task-flow-content should keep form bottoms above browser/system bars');
  assert.doesNotMatch(globals, /\.task-flow-content\s*\{[\s\S]*overflow-y:\s*hidden;/, 'task-flow-content must not lock vertical scrolling');
});

test('Global mobile wrappers do not lock vertical scrolling on task-flow pages', () => {
  assert.match(globals, /html,\s*\nbody\s*\{[\s\S]*min-height:\s*100%;/, 'html/body should support document height instead of fixed viewport locking');
  assert.match(globals, /body\s*\{[\s\S]*min-height:\s*100dvh;/, 'body should use dynamic viewport height for mobile browser toolbars');
  assert.match(globals, /body\s*\{[\s\S]*overflow-y:\s*auto;/, 'body should not suppress vertical scroll fallback');
  assert.doesNotMatch(globals, /body\s*\{[\s\S]*overflow-y:\s*hidden;/, 'body must not hide vertical overflow');
  assert.match(globals, /\.mobile-container\s*\{[\s\S]*overflow-y:\s*visible;/, 'mobile-container should not become an overflow-hidden scroll trap for task flows');
});

test('/match uses dynamic viewport sizing so Instagram WebView toolbars do not trap the form', () => {
  assert.match(matchPage, /minHeight:\s*['"]100dvh['"]/, '/match should use dynamic viewport height on mobile');
  assert.doesNotMatch(matchPage, /minHeight:\s*['"]100vh['"]/, '/match should avoid 100vh in task-flow surfaces');
  assert.doesNotMatch(matchPage, /overflow(?:Y)?:\s*['"]hidden['"]/, '/match should not hide vertical overflow');
});
