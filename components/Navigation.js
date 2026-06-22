'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Home, Search, MessageCircle, User, Calendar, Layers, LogIn, PieChart, PlaySquare, Wallet } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';

export default function Navigation() {
  const pathname = usePathname();
  const { user } = useAuth();
  const role = user?.role;
  const [unreadChatCount, setUnreadChatCount] = useState(0);

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

  // Hide nav on chat room inner pages (e.g. /chat/123) to avoid overlapping the input bar
  const isChatRoom = /^\/chat\/[^/]+/.test(pathname);
  const isTaskFlowRoute = (currentPath) => TASK_FLOW_ROUTES.some((route) => currentPath === route || currentPath?.startsWith(`${route}/`));

  const isTaskFlow = isTaskFlowRoute(pathname);

  useEffect(() => {
    if (!user || isChatRoom || isTaskFlow) return;
    let isMounted = true;
    const fetchUnread = async () => {
      try {
        const res = await fetch('/api/user/unread-counts');
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setUnreadChatCount(data.unreadChatCount || 0);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 10000); // Poll every 10s
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user, isChatRoom, isTaskFlow]);

  if (isChatRoom || isTaskFlowRoute(pathname)) return null;
  
  let navItems = [];

  if (!user) {
    navItems = [
      { name: '首頁', path: '/', icon: Home },
      { name: '找教練', path: '/coaches', icon: Search },
      { name: '預約', path: '/login?redirect=/bookings', icon: Calendar, matchPaths: ['/bookings', '/book'] },
      { name: '聊天', path: '/chat', icon: MessageCircle },
      { name: '我的', path: '/login', icon: LogIn }
    ];
  } else if (role === 'user') {
    navItems = [
      { name: '首頁', path: '/dashboard/user', icon: Home },
      { name: '探索', path: '/explore', icon: PlaySquare },
      { name: '點數', path: '/dashboard/user/wallet', icon: Wallet },
      { name: '訊息', path: '/chat', icon: MessageCircle, badge: unreadChatCount },
      { name: '我的', path: '/dashboard/user/edit', icon: User }
    ];
  } else if (role === 'coach') {
    navItems = [
      { name: '後台', path: '/dashboard/coach', icon: PieChart },
      { name: '探索', path: '/explore', icon: PlaySquare },
      { name: '排程', path: '/coach/schedule', icon: Calendar },
      { name: '訊息', path: '/chat', icon: MessageCircle, badge: unreadChatCount },
      { name: '我的', path: '/coach/profile/edit', icon: User }
    ];
  } else if (role === 'admin') {
    navItems = [
      { name: '管理', path: '/dashboard/admin', icon: User },
      { name: '首頁', path: '/', icon: Home }
    ];
  }

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isPathActive = (targetPath) => targetPath === '/'
          ? pathname === '/'
          : (pathname === targetPath || pathname.startsWith(targetPath + '/'));
        const isActive = item.matchPaths ? item.matchPaths.some((matchPath) => isPathActive(matchPath)) : isPathActive(item.path.split('?')[0]);

        return (
          <Link key={item.path} href={item.path} className={`nav-link ${isActive ? 'active' : ''}`} style={{ position: 'relative' }}>
            <div style={{ position: 'relative', marginBottom: 4 }}>
              <Icon size={22} strokeWidth={isActive ? 2.25 : 1.9} className="nav-icon" style={{ opacity: isActive ? 0.88 : 0.42 }} />
              {item.badge > 0 && (
                <span style={{
                  position: 'absolute',
                  top: -6,
                  right: -10,
                  background: '#EF4444',
                  color: 'white',
                  fontSize: 10,
                  fontWeight: 900,
                  padding: '2px 6px',
                  borderRadius: 10,
                  border: '2px solid #0F172A',
                  minWidth: 18,
                  textAlign: 'center'
                }}>
                  {item.badge}
                </span>
              )}
            </div>
            <span className="nav-text" style={{ opacity: isActive ? 0.86 : 0.42 }}>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
