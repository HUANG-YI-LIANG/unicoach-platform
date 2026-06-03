'use client';
import { usePathname } from 'next/navigation';

const TASK_FLOW_ROUTES = [
  '/login',
  '/register',
  '/reset-password',
  '/onboarding',
  '/welcome',
  '/role-select',
  '/first-entry',
  '/match',
];

const isChatRoomRoute = (pathname) => /^\/chat\/[^/]+/.test(pathname);
const isCoachDetailRoute = (pathname) => /^\/coaches\/[^/]+(?:\/booking)?$/.test(pathname);
const isTaskFlowRoute = (pathname) => TASK_FLOW_ROUTES.some((route) => pathname === route || pathname?.startsWith(`${route}/`));
const isStandaloneMobileRoute = (pathname) => (
  isChatRoomRoute(pathname) || isCoachDetailRoute(pathname) || pathname === '/ambassador' || pathname?.startsWith('/ambassador/') || pathname === '/seed'
);

// Wraps children in the global shell (header + padded main + nav-space)
// OR renders children bare on standalone mobile pages.
export default function ConditionalShell({ children, header, navigation }) {
  const pathname = usePathname();

  if (isTaskFlowRoute(pathname)) {
    // Single-task flow mode: no global header/nav, but keep a scroll container for long mobile forms.
    return <main className="task-flow-content">{children}</main>;
  }

  if (isStandaloneMobileRoute(pathname)) {
    // Full-screen mode: no global header, no padding, no duplicated nav
    return <>{children}</>;
  }

  return (
    <>
      {header}
      <main className="content">{children}</main>
      {navigation}
    </>
  );
}
