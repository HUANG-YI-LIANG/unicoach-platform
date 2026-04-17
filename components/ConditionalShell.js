'use client';
import { usePathname } from 'next/navigation';

const isChatRoomRoute = (pathname) => /^\/chat\/[^/]+/.test(pathname);

// Wraps children in the global shell (header + padded main + nav-space)
// OR renders children bare on chat-room inner pages.
export default function ConditionalShell({ children, header, navigation }) {
  const pathname = usePathname();
  const chatRoom = isChatRoomRoute(pathname);

  if (chatRoom) {
    // Full-screen mode: no global header, no padding, no nav placeholder
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
