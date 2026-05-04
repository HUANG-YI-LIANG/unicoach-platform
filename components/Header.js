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
      <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {loading ? (
          <span className="status-badge" style={{ opacity: 0.5 }}>載入中...</span>
        ) : user ? (
          <>
            {user.role === 'user' && user.level && (
              <span style={{ fontSize: '11px', background: '#DBEAFE', color: '#1E40AF', padding: '2px 8px', borderRadius: '100px', fontWeight: '600' }}>
                Lv.{user.level}
              </span>
            )}
            <span className="status-badge">已登入</span>
          </>
        ) : (
          <Link href="/login" style={{ fontSize: '13px', fontWeight: '700', color: '#1E293B', background: '#F1F5F9', padding: '6px 14px', borderRadius: '100px', textDecoration: 'none' }}>登入 / 註冊</Link>
        )}
      </div>
    </header>
  );
}
