'use client';
import Link from 'next/link';
import { Home, Search, MessageCircle, User, LogIn, PieChart, ShoppingBag, PlaySquare } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';

export default function Navigation() {
  const pathname = usePathname();
  const { user } = useAuth();
  const role = user?.role;
  
  // Hide nav on chat room inner pages (e.g. /chat/123) to avoid overlapping the input bar
  const isChatRoom = /^\/chat\/[^/]+/.test(pathname);
  if (isChatRoom) return null;
  
  let navItems = [];

  if (!user) {
    // Unlogged state
    navItems = [
      { name: '首頁', path: '/', icon: Home },
      { name: '探索', path: '/explore', icon: PlaySquare },
      { name: '教練列表', path: '/coaches', icon: Search },
      { name: '登入', path: '/login', icon: LogIn }
    ];
  } else if (role === 'user') {
    // Logged in User state
    navItems = [
      { name: '首頁', path: '/dashboard/user', icon: Home },
      { name: '探索', path: '/explore', icon: PlaySquare },
      { name: '聊天', path: '/chat', icon: MessageCircle },
      { name: '個人', path: '/bookings', icon: ShoppingBag }
    ];
  } else if (role === 'coach') {
    // Logged in Coach state
    navItems = [
      { name: '後台', path: '/dashboard/coach', icon: PieChart },
      { name: '訂單', path: '/bookings', icon: ShoppingBag }, // Assuming /bookings exists or is the name
      { name: '聊天', path: '/chat', icon: MessageCircle }
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
        const isActive = item.path === '/' 
          ? pathname === '/' 
          : (pathname === item.path || pathname.startsWith(item.path + '/'));

        return (
          <Link key={item.path} href={item.path} className={`nav-link ${isActive ? 'active' : ''}`}>
            <Icon size={24} strokeWidth={isActive ? 2.5 : 2} className="nav-icon" />
            <span className="nav-text">{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
