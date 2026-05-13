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
    <div style={{ minHeight: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0B1120', color: '#F8FAFC', padding: '20px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '2rem', fontWeight: 900, color: '#FFFFFF' }}>登入平台</h2>
      
      <div style={{ width: '100%', maxWidth: '400px', background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
        {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#FCA5A5', padding: '12px', borderRadius: '12px', marginBottom: '16px', fontSize: '13px' }}>{error}</div>}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, color: '#94A3B8', display: 'block', marginBottom: '6px' }}>信箱 Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="user@test.com" style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(15, 23, 42, 0.5)', color: '#F8FAFC', outline: 'none' }} />
          </div>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, color: '#94A3B8', display: 'block', marginBottom: '6px' }}>密碼 Password</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required placeholder="123456" style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(15, 23, 42, 0.5)', color: '#F8FAFC', outline: 'none' }} />
          </div>
          <button type="submit" style={{ width: '100%', padding: '14px', background: '#38BDF8', color: '#0F172A', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '15px', cursor: 'pointer', marginTop: '8px' }}>登入</button>
        </form>
        <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px', color: '#94A3B8' }}>
          還沒有帳號？ <Link href="/register" style={{ color: '#38BDF8', textDecoration: 'none', fontWeight: 700 }}>註冊帳號</Link>
        </p>
      </div>
    </div>
  );
}
