'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { getDashboardPathForRole, getSafeRedirectPath } from '@/lib/authRedirects';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // 初始化時讀取儲存的帳號
  useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedUsername = localStorage.getItem('unicoach_saved_username');
        if (savedUsername) {
          setUsername(savedUsername);
        }
      } catch (err) {}
    }
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (rememberMe) {
      localStorage.setItem('unicoach_saved_username', username);
    } else {
      localStorage.removeItem('unicoach_saved_username');
    }

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password, rememberMe }),
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (res.ok) {
      await refresh();
      const redirectTarget = getSafeRedirectPath(searchParams.get('redirect'), data.user?.role);
      router.push(redirectTarget || getDashboardPathForRole(data.user?.role));
    } else {
      setError(data.error);
    }
  };

  return (
    <>
      <h2 style={{ textAlign: 'center', marginBottom: '2rem', fontWeight: 900, color: 'var(--color-text)' }}>登入平台</h2>

      <div style={{
        width: '100%', maxWidth: '400px',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '16px', padding: '24px',
        boxShadow: 'var(--shadow-card)'
      }}>
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: 'var(--color-danger)',
            padding: '12px', borderRadius: '12px',
            marginBottom: '16px', fontSize: '13px'
          }}>{error}</div>
        )}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '6px' }}>帳號名稱</label>
            <input
              type="text" value={username}
              onChange={e => {
                const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
                setUsername(val);
              }}
              required placeholder="請輸入帳號"
              style={{
                width: '100%', padding: '12px', borderRadius: '12px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface-soft)',
                color: 'var(--color-text)', outline: 'none', marginBottom: 0
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '6px' }}>密碼 Password</label>
            <input
              type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              required placeholder="請輸入密碼"
              style={{
                width: '100%', padding: '12px', borderRadius: '12px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface-soft)',
                color: 'var(--color-text)', outline: 'none', marginBottom: 0
              }}
            />
          </div>
          
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
            <input 
              type="checkbox" 
              checked={rememberMe} 
              onChange={e => setRememberMe(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: 'var(--color-primary)' }} 
            />
            <span>記住我的帳號與登入狀態</span>
          </label>

          <button type="submit" style={{
            width: '100%', padding: '14px',
            background: 'var(--color-accent)',
            color: 'var(--text-light)', border: 'none',
            borderRadius: '12px', fontWeight: 800,
            fontSize: '15px', cursor: 'pointer', marginTop: '8px'
          }}>
            登入
          </button>
        </form>
        <p style={{ marginTop: '16px', textAlign: 'center', fontSize: '13px', color: 'var(--color-text-muted)' }}>
          還沒有帳號？{' '}
          <Link href="/register" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 700 }}>
            註冊帳號
          </Link>
        </p>
        <p style={{ marginTop: '8px', textAlign: 'center', fontSize: '13px', color: 'var(--color-text-muted)' }}>
          <Link href="/forgot-password" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>
            忘記密碼？
          </Link>
        </p>
      </div>
    </>
  );
}

export default function Login() {
  return (
    <div style={{
      minHeight: 'calc(100vh - 60px)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--color-bg)',
      color: 'var(--color-text)',
      padding: '20px'
    }}>
      <Suspense fallback={<div>載入中...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
