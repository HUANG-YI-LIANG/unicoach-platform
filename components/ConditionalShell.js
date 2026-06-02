'use client';
import { usePathname } from 'next/navigation';

const isChatRoomRoute = (pathname) => /^\/chat\/[^/]+/.test(pathname);
const isCoachDetailRoute = (pathname) => /^\/coaches\/[^/]+(?:\/booking)?$/.test(pathname);
const isStandaloneMobileRoute = (pathname) => (
  isChatRoomRoute(pathname) || isCoachDetailRoute(pathname) || pathname === '/ambassador' || pathname?.startsWith('/ambassador/') || pathname === '/seed'
);

// Wraps children in the global shell (header + padded main + nav-space)
// OR renders children bare on standalone mobile pages.
export default function ConditionalShell({ children, header, navigation }) {
  const pathname = usePathname();

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
