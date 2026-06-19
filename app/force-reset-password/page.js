'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { Lock, Eye, EyeOff, Loader2, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';

const ORANGE = 'var(--color-accent, #FF8A3D)';
const BG = 'var(--color-bg, #050816)';
const CARD = 'var(--color-surface, rgba(255,255,255,0.03))';
const TEXT_LIGHT = 'var(--color-text, #ffffff)';
const MUTED = 'var(--color-text-muted, rgba(255,255,255,0.58))';

export default function ForceResetPasswordPage() {
  const router = useRouter();
  const { user, refresh, logout, loading: authLoading } = useAuth();
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 若未登入，導向首頁或登入頁
    if (!authLoading && !user) {
      router.replace('/login');
    }
    // 若已登入但不需要強制重設，導向首頁
    if (!authLoading && user && !user.force_password_reset) {
      router.replace('/dashboard');
    }
  }, [authLoading, user, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      return toast.error('密碼長度必須至少為 6 碼');
    }
    if (newPassword !== confirmPassword) {
      return toast.error('兩次輸入的密碼不一致');
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/force-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword })
      });
      const data = await res.json();
      
      if (res.ok) {
        toast.success('密碼修改成功！');
        await refresh(); // 重新整理 session，此時 force_password_reset 應該已經變成 false
        router.replace('/dashboard');
      } else {
        toast.error(data.error || '修改失敗，請稍後再試');
      }
    } catch (err) {
      toast.error('伺服器錯誤，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', background: BG, color: TEXT_LIGHT }}>
        <Loader2 size={32} className="spinner" color={ORANGE} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: BG, color: TEXT_LIGHT }}>
      <div style={{ padding: '60px 20px 20px', flex: 1, display: 'flex', flexDirection: 'column', maxWidth: 500, margin: '0 auto', width: '100%' }}>
        
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '1px solid rgba(239,68,68,0.3)' }}>
            <ShieldAlert size={32} color="#EF4444" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>安全升級：強制修改密碼</h1>
          <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6 }}>
            您的帳號密碼剛由管理員重設過。<br/>為了保障您的帳戶安全，請立即設定一組新的專屬密碼。
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* New Password */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: MUTED, marginBottom: 8, marginLeft: 4 }}>
              設定新密碼 (至少 6 碼)
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: MUTED }}>
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="請輸入新密碼"
                style={{
                  width: '100%',
                  padding: '16px 44px',
                  background: CARD,
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 16,
                  color: TEXT_LIGHT,
                  fontSize: 16,
                  outline: 'none',
                  transition: 'all 0.2s',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                }}
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: MUTED, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: MUTED, marginBottom: 8, marginLeft: 4 }}>
              再次確認新密碼
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: MUTED }}>
                <Lock size={18} />
              </div>
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="請再次輸入新密碼"
                style={{
                  width: '100%',
                  padding: '16px 44px',
                  background: CARD,
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 16,
                  color: TEXT_LIGHT,
                  fontSize: 16,
                  outline: 'none',
                  transition: 'all 0.2s',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                }}
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: MUTED, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px',
              background: loading ? 'rgba(255,255,255,0.1)' : `linear-gradient(135deg, ${ORANGE}, #F97316)`,
              color: loading ? MUTED : '#FFF',
              border: 'none',
              borderRadius: 16,
              fontSize: 16,
              fontWeight: 800,
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: loading ? 'none' : '0 8px 20px rgba(249, 115, 22, 0.3)',
              transition: 'all 0.2s'
            }}
          >
            {loading ? <Loader2 size={20} className="spinner" /> : '確認並儲存密碼'}
          </button>
        </form>

        <div style={{ marginTop: 'auto', textAlign: 'center', padding: '20px 0' }}>
          <button 
            onClick={logout}
            style={{ background: 'none', border: 'none', color: MUTED, fontSize: 14, fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}
          >
            這不是我本人，我要登出
          </button>
        </div>

      </div>
    </div>
  );
}
