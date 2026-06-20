'use client';
import { usePathname } from 'next/navigation';

import { useAdminMode } from '@/components/AdminModeContext';
import AdminSidebar from '@/components/admin/AdminSidebar';

const TASK_FLOW_ROUTES = [
  '/login',
  '/register',
  '/reset-password',
  '/force-reset-password',
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
const isAdminRoute = (pathname) => pathname === '/dashboard/admin' || pathname?.startsWith('/dashboard/admin/') || pathname?.startsWith('/admin/');

// Wraps children in the global shell (header + padded main + nav-space)
// OR renders children bare on standalone mobile pages.
export default function ConditionalShell({ children, header, navigation }) {
  const pathname = usePathname();
  const { isDesktopMode } = useAdminMode();

  const isAdminDesktop = isAdminRoute(pathname) && isDesktopMode;

  let content;

  if (isAdminDesktop) {
    // Admin Desktop Layout
    content = (
      <>
        <AdminSidebar />
        <main className="admin-desktop-main">
          {children}
        </main>
      </>
    );
  } else if (isTaskFlowRoute(pathname)) {
    // Single-task flow mode: no global header/nav, but keep a scroll container for long mobile forms.
    content = <main className="task-flow-content">{children}</main>;
  } else if (isStandaloneMobileRoute(pathname)) {
    // Full-screen mode: no global header, no padding, no duplicated nav
    content = <>{children}</>;
  } else {
    // Normal mobile layout
    content = (
      <>
        {header}
        <main className="content">{children}</main>
        {navigation}
      </>
    );
  }

  return (
    <div className={isAdminDesktop ? 'admin-desktop-container' : 'mobile-container'}>
      {content}
    </div>
  );
}
