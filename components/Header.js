'use client';
import { useAuth } from './AuthProvider';
import { useTheme } from './ThemeProvider';
import Link from 'next/link';
import { Sun, Moon } from 'lucide-react';

export default function Header() {
  const { user, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="global-header">
      <div className="header-left">
        <span className="brand-name">UniCoach</span>
      </div>
      <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? '切換為淺色模式' : '切換為深色模式'}
          title={theme === 'dark' ? '切換為淺色模式' : '切換為深色模式'}
          style={{
            border: 'none',
            background: 'transparent',
            color: 'var(--color-text)',
            padding: '6px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '999px',
            lineHeight: 0,
          }}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        {loading ? (
          <span className="status-badge" style={{ opacity: 0.5 }}>載入中...</span>
        ) : user ? (
          <>
            {user.role === 'user' && user.level && (
              <span style={{ fontSize: '11px', background: 'var(--color-surface-soft)', color: 'var(--color-primary)', padding: '2px 8px', borderRadius: '100px', fontWeight: '600' }}>
                Lv.{user.level}
              </span>
            )}
            <span className="status-badge">已登入</span>
          </>
        ) : (
          <Link href="/login" style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-text)', background: 'var(--color-surface-soft)', padding: '6px 14px', borderRadius: '100px', textDecoration: 'none' }}>登入 / 註冊</Link>
        )}
      </div>
    </header>
  );
}
