'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';

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
      const redirectTarget = searchParams.get('redirect');
      if (redirectTarget) {
        router.push(redirectTarget);
        return;
      }
      if (data.user.role === 'admin') router.push('/dashboard/admin');
      else router.push('/dashboard/' + data.user.role);
    } else {
      setError(data.error);
    }
  };

  return (
    <div>
      <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>登入平台</h2>
      
      <div className="card">
        {error && <p style={{ color: 'var(--error)', marginBottom: '1rem' }}>{error}</p>}
        <form onSubmit={handleLogin}>
          <div>
            <label>信箱 Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="user@test.com" />
          </div>
          <div>
            <label>密碼 Password</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required placeholder="123456" />
          </div>
          <button type="submit" style={{ width: '100%', marginTop: '1rem' }}>登入</button>
        </form>
        <p style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.9rem' }}>
          還沒有帳號？ <Link href="/register">註冊帳號</Link>
        </p>
      </div>

      <div className="card" style={{ marginTop: '2rem', background: '#f8fafc' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <b>測試帳號提示：</b><br/>
          Admin: admin@test.com (123456)<br/>
          Coach: coach@test.com (123456)<br/>
          User: user@test.com (123456)
        </p>
      </div>
    </div>
  );
}
