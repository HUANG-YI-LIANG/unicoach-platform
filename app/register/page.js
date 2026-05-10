'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { getDashboardPathForRole } from '@/lib/authRedirects';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useAuth();
  const defaultRole = searchParams.get('role') || 'user';
  const referralCode = searchParams.get('ref') || '';

  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    role: defaultRole,
    age: 20,
    privacyConsent: false,
    guardianConsent: false
  });
  const [termsChecked, setTermsChecked] = useState(false);
  const [disclaimerChecked, setDisclaimerChecked] = useState(false);
  const [error, setError] = useState('');
  const [matchData, setMatchData] = useState(null);

  // 初始化時讀取可能存在的媒合/教練申請資料
  useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const coachApply = localStorage.getItem('unicoach_coach_apply_v1');
        if (coachApply && defaultRole === 'coach') {
          setMatchData(JSON.parse(coachApply));
        }
      } catch (err) {}
    }
  });

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (form.age < 13) {
      setError('依據法規，本平台暫不開放給 13 歲以下之使用者註冊。');
      return;
    }
    if (!termsChecked || !form.privacyConsent || !disclaimerChecked) {
      setError('您必須閱讀並同意使用條款、隱私權政策及免責聲明才能完成註冊。');
      return;
    }
    if (form.age < 18 && !form.guardianConsent) {
      setError('未成年使用者（18 歲以下）必須獲得家長或法定監護人同意。');
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          acceptedTerms: termsChecked,
          acceptedPrivacy: form.privacyConsent,
          acceptedDisclaimer: disclaimerChecked,
          referralCode: referralCode || null,
          matchData: matchData
        })
      });
      const data = await res.json();
      if (res.ok) {
        if (matchData) {
          localStorage.removeItem('unicoach_coach_apply_v1');
        }
        await refresh();
        router.push(getDashboardPathForRole(data.user?.role));
      } else {
        setError(data.error || '註冊失敗');
      }
    } catch (err) {
      setError('連線伺服器失敗，請稍後再試。');
    }
  };

  const inputStyle = {
    width: '100%', padding: '12px', borderRadius: '12px',
    border: '1px solid var(--color-border)',
    background: 'var(--color-surface-soft)',
    color: 'var(--color-text)', outline: 'none', marginBottom: 0
  };

  const labelStyle = {
    fontSize: '13px', fontWeight: 700,
    color: 'var(--color-text-muted)', display: 'block', marginBottom: '6px'
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - 60px)',
      background: 'var(--color-bg)',
      color: 'var(--color-text)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', padding: '40px 16px'
    }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', fontWeight: 900, color: 'var(--color-text)' }}>
          註冊 UniCoach 帳號
        </h2>

        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          padding: '24px', borderRadius: '24px',
          boxShadow: 'var(--shadow-card)'
        }}>
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'var(--color-danger)',
              padding: '12px', borderRadius: '12px',
              marginBottom: '16px', fontSize: '13px'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={labelStyle}>註冊身分</label>
              <select
                value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value })}
                style={inputStyle}
              >
                <option value="user">學員 / 家長 (尋找教練)</option>
                <option value="coach">大學生教練 (提供教學)</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>真實姓名</label>
                <input
                  type="text" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>年齡</label>
                <input
                  type="number" min="0" value={form.age}
                  onChange={e => {
                    const val = e.target.value.replace(/^0+/, '') || '0';
                    setForm({ ...form, age: parseInt(val) || 0 });
                  }}
                  required style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>信箱 Email</label>
              <input
                type="email" value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>密碼</label>
              <input
                type="password" value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required minLength={8} style={inputStyle}
              />
            </div>

            {/* 法律合規區 */}
            <div style={{
              marginTop: '4px', padding: '16px',
              background: 'var(--color-surface-soft)',
              borderRadius: '16px', border: '1px solid var(--color-border)'
            }}>
              <h4 style={{
                margin: '0 0 12px', fontSize: '12px',
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.05em'
              }}>法律條款同意</h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: 'var(--color-text)' }}>
                  <input type="checkbox" checked={termsChecked} onChange={e => setTermsChecked(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: 'var(--color-primary)' }} />
                  <span>我同意 <span style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>服務使用條款</span></span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: 'var(--color-text)' }}>
                  <input type="checkbox" checked={form.privacyConsent} onChange={e => setForm({ ...form, privacyConsent: e.target.checked })}
                    style={{ width: 16, height: 16, accentColor: 'var(--color-primary)' }} />
                  <span>我同意 <span style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>隱私權保護政策</span></span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: 'var(--color-text)' }}>
                  <input type="checkbox" checked={disclaimerChecked} onChange={e => setDisclaimerChecked(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: 'var(--color-primary)' }} />
                  <span>我已閱讀並同意 <Link href="/disclaimer" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>免責聲明</Link></span>
                </label>

                {form.age < 18 && (
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer',
                    background: 'rgba(234, 88, 12, 0.08)', padding: '8px', borderRadius: '8px',
                    border: '1px solid rgba(234, 88, 12, 0.2)'
                  }}>
                    <input type="checkbox" checked={form.guardianConsent} onChange={e => setForm({ ...form, guardianConsent: e.target.checked })}
                      style={{ width: 16, height: 16, accentColor: 'var(--color-accent)' }} />
                    <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>我已獲得法定監護人同意使用本平台</span>
                  </label>
                )}
              </div>
            </div>

            <button type="submit" style={{
              width: '100%', padding: '14px',
              background: 'var(--color-accent)',
              color: 'var(--text-light)', border: 'none',
              borderRadius: '12px', fontWeight: 800,
              fontSize: '15px', cursor: 'pointer', marginTop: '8px'
            }}>
              立即註冊
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: '13px', marginTop: '20px', color: 'var(--color-text-muted)' }}>
          已有帳號？{' '}
          <Link href="/login" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 700 }}>
            直接登入
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function Register() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
