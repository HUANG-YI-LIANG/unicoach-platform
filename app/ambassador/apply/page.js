'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import Link from 'next/link';
import { Loader2, ShieldCheck, XCircle } from 'lucide-react';

function AmbassadorApplyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useAuth();
  
  const inviteCode = searchParams.get('code');

  const [verifyStatus, setVerifyStatus] = useState('loading'); // 'loading', 'valid', 'invalid'
  const [verifyError, setVerifyError] = useState('');
  
  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    socialAccount: '',
    experience: '',
    privacyConsent: false
  });
  const [termsChecked, setTermsChecked] = useState(false);
  const [disclaimerChecked, setDisclaimerChecked] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function verifyCode() {
      if (!inviteCode) {
        setVerifyStatus('invalid');
        setVerifyError('缺少邀請碼');
        return;
      }
      try {
        const res = await fetch(`/api/ambassador/verify-invite-code?code=${encodeURIComponent(inviteCode)}`);
        const data = await res.json();
        
        if (res.ok && data.valid) {
          setVerifyStatus('valid');
        } else {
          setVerifyStatus('invalid');
          setVerifyError(data.error || '無效的邀請碼');
        }
      } catch (err) {
        setVerifyStatus('invalid');
        setVerifyError('驗證邀請碼失敗，請稍後再試。');
      }
    }
    verifyCode();
  }, [inviteCode]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!termsChecked || !form.privacyConsent || !disclaimerChecked) {
      setSubmitError('您必須閱讀並同意使用條款、隱私權政策及免責聲明才能完成註冊。');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/ambassador/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          inviteCode,
          acceptedTerms: termsChecked,
          acceptedPrivacy: form.privacyConsent,
          acceptedDisclaimer: disclaimerChecked,
        })
      });
      const data = await res.json();
      
      if (res.ok) {
        await refresh();
        router.push('/ambassador');
      } else {
        setSubmitError(data.error || '註冊失敗');
      }
    } catch (err) {
      setSubmitError('連線伺服器失敗，請稍後再試。');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (verifyStatus === 'loading') {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)', color: 'var(--text-main)' }}>
        <Loader2 className="animate-spin mb-4" size={32} color="var(--primary)" />
        <p>驗證邀請碼中...</p>
      </div>
    );
  }

  if (verifyStatus === 'invalid') {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)', color: 'var(--text-main)', padding: 24 }}>
        <XCircle size={48} color="#EF4444" style={{ marginBottom: 16 }} />
        <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>需要專屬邀請碼</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>{verifyError || '此頁面僅限受邀者使用，請輸入您的邀請碼。'}</p>
        
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            const val = new FormData(e.target).get('code');
            if(val) router.push(`/ambassador/apply?code=${val}`);
          }}
          style={{ display: 'flex', gap: 8, marginBottom: 24, width: '100%', maxWidth: 300 }}
        >
          <input 
            name="code"
            placeholder="請輸入邀請碼"
            style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--border-main)', background: 'var(--bg-input)', color: 'white', outline: 'none' }}
          />
          <button type="submit" style={{ padding: '12px 24px', background: 'var(--cta)', color: 'var(--text-light)', borderRadius: '12px', fontWeight: 800, border: 'none', cursor: 'pointer' }}>
            驗證
          </button>
        </form>
        
        <button onClick={() => router.push('/')} style={{ padding: '8px 16px', background: 'transparent', color: 'var(--text-muted)', borderRadius: 100, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
          返回首頁
        </button>
      </div>
    );
  }

  const inputStyle = {
    width: '100%', padding: '14px', borderRadius: '16px',
    border: '1px solid var(--border-main)',
    background: 'var(--bg-surface)',
    color: 'var(--text-main)', outline: 'none', marginBottom: 0,
    fontSize: '15px'
  };

  const labelStyle = {
    fontSize: '13px', fontWeight: 700,
    color: 'var(--text-muted)', display: 'block', marginBottom: '8px'
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-page)',
      color: 'var(--text-main)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', padding: '40px 24px'
    }}>
      <div style={{ width: '100%', maxWidth: 430 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
          <ShieldCheck color="var(--primary)" size={28} />
          <h2 style={{ textAlign: 'center', fontWeight: 900, fontSize: 24, margin: 0 }}>
            申請成為 UniCoach 推廣大使
          </h2>
        </div>
        
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: 24, fontSize: '15px', lineHeight: 1.5 }}>
          透過你的推廣碼邀請學員與教練，完成課程後即可獲得分潤
        </p>
        
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-main)',
          padding: '32px 24px', borderRadius: '24px',
          boxShadow: 'var(--shadow-card)'
        }}>
          {submitError && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#EF4444',
              padding: '16px', borderRadius: '16px',
              marginBottom: '24px', fontSize: '14px', fontWeight: 600
            }}>
              {submitError}
            </div>
          )}

          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={labelStyle}>真實姓名</label>
              <input
                type="text" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required style={inputStyle} placeholder="請輸入您的真實姓名"
              />
            </div>

            <div>
              <label style={labelStyle}>信箱 Email</label>
              <input
                type="email" value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required style={inputStyle} placeholder="設定您的登入帳號"
              />
            </div>

            <div>
              <label style={labelStyle}>密碼</label>
              <input
                type="password" value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required minLength={8} style={inputStyle} placeholder="至少 8 位數密碼"
              />
            </div>

            <div>
              <label style={labelStyle}>手機</label>
              <input
                type="tel" value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                required style={inputStyle} placeholder="您的聯絡電話"
              />
            </div>

            <div>
              <label style={labelStyle}>常用社群帳號（IG / FB，可選）</label>
              <input
                type="text" value={form.socialAccount}
                onChange={e => setForm({ ...form, socialAccount: e.target.value })}
                style={inputStyle} placeholder="提供我們認識您的管道"
              />
            </div>

            <div>
              <label style={labelStyle}>推廣經驗簡短描述（可選）</label>
              <textarea
                value={form.experience}
                onChange={e => setForm({ ...form, experience: e.target.value })}
                style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} placeholder="您預計如何推廣？"
              />
            </div>

            <div style={{
              marginTop: '8px', padding: '16px',
              background: 'var(--bg-page)',
              borderRadius: '16px', border: '1px solid var(--border-main)'
            }}>
              <h4 style={{
                margin: '0 0 16px', fontSize: '13px',
                color: 'var(--text-muted)',
                fontWeight: 700
              }}>合規同意</h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '14px', cursor: 'pointer', color: 'var(--text-main)' }}>
                  <input type="checkbox" checked={termsChecked} onChange={e => setTermsChecked(e.target.checked)}
                    style={{ width: 18, height: 18, marginTop: 2, accentColor: 'var(--primary)' }} />
                  <span style={{ lineHeight: 1.5 }}>我同意 <span style={{ color: 'var(--primary)', fontWeight: 600 }}>服務使用條款</span></span>
                </label>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '14px', cursor: 'pointer', color: 'var(--text-main)' }}>
                  <input type="checkbox" checked={form.privacyConsent} onChange={e => setForm({ ...form, privacyConsent: e.target.checked })}
                    style={{ width: 18, height: 18, marginTop: 2, accentColor: 'var(--primary)' }} />
                  <span style={{ lineHeight: 1.5 }}>我同意 <span style={{ color: 'var(--primary)', fontWeight: 600 }}>隱私權保護政策</span></span>
                </label>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '14px', cursor: 'pointer', color: 'var(--text-main)' }}>
                  <input type="checkbox" checked={disclaimerChecked} onChange={e => setDisclaimerChecked(e.target.checked)}
                    style={{ width: 18, height: 18, marginTop: 2, accentColor: 'var(--primary)' }} />
                  <span style={{ lineHeight: 1.5 }}>我已閱讀並同意 <span style={{ color: 'var(--primary)', fontWeight: 600 }}>免責聲明</span></span>
                </label>
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} style={{
              width: '100%', padding: '16px',
              background: 'var(--primary)',
              color: 'var(--text-light)', border: 'none',
              borderRadius: '100px', fontWeight: 800,
              fontSize: '16px', cursor: 'pointer', marginTop: '12px',
              opacity: isSubmitting ? 0.7 : 1,
              display: 'flex', justifyContent: 'center', alignItems: 'center'
            }}>
              {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : '註冊成為推廣大使'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function AmbassadorApplyPage() {
  return (
    <Suspense fallback={
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)' }}>
        <Loader2 className="animate-spin" size={32} color="var(--primary)" />
      </div>
    }>
      <AmbassadorApplyForm />
    </Suspense>
  );
}
