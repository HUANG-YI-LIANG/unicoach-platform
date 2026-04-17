'use client';
import { useAuth } from './AuthProvider';

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
          <span className="status-badge">未登入</span>
        )}
      </div>
    </header>
  );
}
