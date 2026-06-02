import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const shell = readFileSync('components/ConditionalShell.js', 'utf8');
const navigation = readFileSync('components/Navigation.js', 'utf8');

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
  assert.match(shell, /isStandaloneMobileRoute\(pathname\) \|\| isTaskFlowRoute\(pathname\)/, 'task flows should render without global header/content/nav shell');

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
