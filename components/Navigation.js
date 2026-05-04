'use client';
import Link from 'next/link';
import { Home, Search, MessageCircle, User, LogIn, PieChart, ShoppingBag, PlaySquare } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { useTheme } from './ThemeProvider';
import { Moon, Sun } from 'lucide-react';

export default function Navigation() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const role = user?.role;
  
  // Hide nav on chat room inner pages (e.g. /chat/123) to avoid overlapping the input bar
  const isChatRoom = /^\/chat\/[^/]+/.test(pathname);
  if (isChatRoom) return null;
  
  let navItems = [];

  if (!user) {
    navItems = [
      { name: '首頁', path: '/', icon: Home, exact: true },
      { name: '探索', path: '/explore', icon: PlaySquare },
      { name: '找教練', path: '/coaches', icon: Search },
      { name: '我的', path: '/login', icon: User }
    ];
  } else if (role === 'user') {
    navItems = [
      { name: '首頁', path: '/', icon: Home, exact: true },
      { name: '探索', path: '/explore', icon: PlaySquare },
      { name: '找教練', path: '/coaches', icon: Search },
      { name: '我的', path: '/dashboard/user', icon: User }
    ];
  } else if (role === 'coach') {
    navItems = [
      { name: '首頁', path: '/', icon: Home, exact: true },
      { name: '探索', path: '/explore', icon: PlaySquare },
      { name: '找教練', path: '/coaches', icon: Search },
      { name: '我的', path: '/dashboard/coach', icon: User }
    ];
  } else if (role === 'admin') {
    navItems = [
      { name: '首頁', path: '/', icon: Home, exact: true },
      { name: '探索', path: '/explore', icon: PlaySquare },
      { name: '找教練', path: '/coaches', icon: Search },
      { name: '管理', path: '/dashboard/admin', icon: User }
    ];
  }

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.exact || item.path === '/'
          ? pathname === item.path
          : (pathname === item.path || pathname.startsWith(item.path + '/'));

        if (item.isThemeToggle) {
          return (
            <button 
              key="theme-toggle" 
              onClick={toggleTheme} 
              className="nav-link" 
              style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              <Icon size={24} strokeWidth={2} className="nav-icon" />
              <span className="nav-text">{item.name}</span>
            </button>
          );
        }

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
