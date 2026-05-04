'use client';
import { useAuth } from './AuthProvider';
import Link from 'next/link';

export default function Header() {
  const { user, loading } = useAuth();

  return (
    <header className="global-header">
      <div className="header-left">
        <span className="brand-name">UniCoach</span>
      </div>
      <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {loading ? (
          <span className="status-badge" style={{ opacity: 0.5 }}>載入中...</span>
        ) : user ? (
          <>
            {user.role === 'user' && user.level && (
              <span style={{ fontSize: '11px', background: 'rgba(249, 115, 22, 0.1)', color: '#F97316', padding: '2px 8px', borderRadius: '100px', fontWeight: '800' }}>
                Lv.{user.level}
              </span>
            )}
            <Link href={user.role === 'coach' ? '/dashboard/coach' : user.role === 'admin' ? '/dashboard/admin' : '/dashboard/user'} style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none', background: 'var(--bg-input)', padding: '4px 12px 4px 4px', borderRadius: '100px', border: '1px solid var(--border-main)' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>
                {user.name?.slice(0, 1) || 'U'}
              </div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                {user.name || 'User'}
              </span>
            </Link>
          </>
        ) : (
          <Link href="/login" style={{ fontSize: '13px', fontWeight: '700', color: '#F8FAFC', background: 'rgba(255, 255, 255, 0.05)', padding: '6px 14px', borderRadius: '100px', textDecoration: 'none' }}>登入 / 註冊</Link>
        )}
      </div>
    </header>
  );
}
