'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { getDashboardPathForRole, getSafeRedirectPath } from '@/lib/authRedirects';

export default function Login() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
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
    <div style={{
      minHeight: 'calc(100vh - 60px)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--color-bg)',
      color: 'var(--color-text)',
      padding: '20px'
    }}>
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
            <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: '6px' }}>信箱 Email</label>
            <input
              type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              required placeholder="請輸入 Email"
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
          <Link href={`/register${searchParams.toString() ? `?${searchParams.toString()}` : ''}`} style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 700 }}>
            註冊帳號
          </Link>
        </p>
        <p style={{ marginTop: '8px', textAlign: 'center', fontSize: '13px', color: 'var(--color-text-muted)' }}>
          <Link href="/reset-password" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>
            忘記密碼？
          </Link>
        </p>
      </div>
    </div>
  );
}
