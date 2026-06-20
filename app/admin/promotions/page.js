'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  Info,
  Loader2,
  Mail,
  Send,
  Gift,
  Users,
  Coins,
  Link,
  Smartphone,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

const BLUE = 'var(--color-primary)';
const DARK = 'var(--color-text)';
const MUTED = 'var(--color-text-muted)';
const WHITE = 'var(--text-light)';
const BG = 'var(--color-bg)';

export default function PromotionsAdmin() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [notiTitle, setNotiTitle] = useState('');
  const [notiContent, setNotiContent] = useState('');
  
  // Customization States
  const [targetAudience, setTargetAudience] = useState('all'); // 'all', 'level', 'role'
  const [targetValue, setTargetValue] = useState(''); // Lv number or 'user'/'coach'
  const [notiCode, setNotiCode] = useState('');
  const [notiPercent, setNotiPercent] = useState('');
  const [grantPoints, setGrantPoints] = useState('');
  const [actionUrl, setActionUrl] = useState('');
  const [sendPush, setSendPush] = useState(false);

  const [sendingNoti, setSendingNoti] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'admin') {
      router.push('/dashboard/coach');
      return;
    }
  }, [authLoading, router, user]);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSendNotification = async () => {
    if (!notiTitle.trim() || !notiContent.trim()) {
      showMessage('error', '請填寫通知標題與內容');
      return;
    }

    if (targetAudience !== 'all' && !targetValue) {
      showMessage('error', '請選擇發送對象的特定條件');
      return;
    }

    setSendingNoti(true);
    try {
      const response = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: notiTitle,
          content: notiContent,
          discount_code: notiCode || null,
          discount_percent: notiPercent ? Number(notiPercent) : null,
          target_audience: targetAudience,
          target_value: targetValue || null,
          grant_points: grantPoints ? Number(grantPoints) : 0,
          url: actionUrl || null,
          send_push: sendPush,
        }),
      });

      const data = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        throw new Error(data.error || '發送通知失敗');
      }

      // Reset Form
      setNotiTitle('');
      setNotiContent('');
      setNotiCode('');
      setNotiPercent('');
      setTargetAudience('all');
      setTargetValue('');
      setGrantPoints('');
      setActionUrl('');
      setSendPush(false);
      
      const countText = data.count !== undefined ? ` (共發送給 ${data.count} 人)` : '';
      showMessage('success', `通知已成功送出${countText}`);
    } catch (error) {
      console.error('[SEND NOTIFICATION UI ERROR]', error);
      showMessage('error', error.message || '發送通知失敗');
    } finally {
      setSendingNoti(false);
    }
  };

  if (authLoading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: BG,
          color: MUTED,
        }}
      >
        <Loader2 className="animate-spin" size={40} style={{ marginBottom: 16 }} />
        <p>載入中...</p>
      </div>
    );
  }

  return (
    <div className="promo-container" style={{ minHeight: '100vh', background: BG, padding: '24px 16px', fontFamily: 'sans-serif' }}>
      <div className="content-wrapper" style={{ margin: '0 auto' }}>
        <header
          className="page-header"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 24,
            gap: 16,
          }}
        >
          <div className="header-content" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              onClick={() => router.push('/dashboard/admin')}
              style={{
                padding: 10,
                background: 'var(--color-surface)',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
              }}
            >
              <ArrowLeft size={20} color={DARK} />
            </button>
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 24,
                  fontWeight: 900,
                  color: DARK,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Gift color={BLUE} size={24} />
                福利與通知推播
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: MUTED }}>
                向學員發送優惠通知，並提供客製化進階選項。
              </p>
            </div>
          </div>
        </header>

        {message && (
          <div
            style={{
              marginBottom: 24,
              padding: 16,
              borderRadius: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: message.type === 'success' ? '#D1FAE5' : '#FEE2E2',
              color: message.type === 'success' ? '#065F46' : '#991B1B',
              fontWeight: 800,
            }}
          >
            {message.type === 'success' ? <CheckCircle2 size={20} /> : <Info size={20} />}
            <span>{message.text}</span>
          </div>
        )}

        <div style={{ display: 'grid', gap: 24 }}>
          <div
            style={{
              background: 'var(--color-surface)',
              borderRadius: 24,
              border: '1px solid var(--color-border)',
              boxShadow: '0 4px 20px rgba(15,23,42,0.03)',
              padding: 32,
            }}
          >
            <h2 style={{ margin: '0 0 24px', fontSize: 18, fontWeight: 900, color: DARK, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Mail color={BLUE} /> 建立推播通知
            </h2>

            <div style={{ display: 'grid', gap: 24 }}>
              
              {/* Target Audience */}
              <div style={{ background: 'var(--color-bg)', padding: 20, borderRadius: 16, border: '1px solid var(--color-surface-soft)' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 800, color: DARK, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Users size={18} color={MUTED} /> 發送對象
                </h3>
                <div style={{ display: 'grid', gap: 12 }}>
                  <select 
                    value={targetAudience} 
                    onChange={(e) => {
                      setTargetAudience(e.target.value);
                      if (e.target.value === 'all') setTargetValue('');
                      else if (e.target.value === 'role') setTargetValue('user');
                      else if (e.target.value === 'level') setTargetValue('2');
                    }}
                    style={selectStyle}
                  >
                    <option value="all">所有人</option>
                    <option value="level">特定等級以上會員</option>
                    <option value="role">特定身分</option>
                  </select>

                  {targetAudience === 'level' && (
                    <select value={targetValue} onChange={(e) => setTargetValue(e.target.value)} style={selectStyle}>
                      <option value="2">Lv.2 以上</option>
                      <option value="3">Lv.3 以上</option>
                      <option value="4">Lv.4 以上</option>
                    </select>
                  )}

                  {targetAudience === 'role' && (
                    <select value={targetValue} onChange={(e) => setTargetValue(e.target.value)} style={selectStyle}>
                      <option value="user">一般學員</option>
                      <option value="coach">教練</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Message Content */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: MUTED, marginBottom: 8 }}>通知標題 *</label>
                <input value={notiTitle} onChange={(event) => setNotiTitle(event.target.value)} placeholder="例如：春季限定優惠開跑" style={inputStyle} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: MUTED, marginBottom: 8 }}>通知內容 *</label>
                <textarea value={notiContent} onChange={(event) => setNotiContent(event.target.value)} placeholder="輸入活動說明、使用方式或截止日期。" rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>

              {/* Bonus Options */}
              <div style={{ background: 'var(--color-bg)', padding: 20, borderRadius: 16, border: '1px solid var(--color-surface-soft)' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 800, color: DARK, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Coins size={18} color={MUTED} /> 福利選項 (選填)
                </h3>
                <div style={{ display: 'grid', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: MUTED, marginBottom: 8 }}>折扣資訊</label>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <input value={notiCode} onChange={(event) => setNotiCode(event.target.value.toUpperCase())} placeholder="折扣碼 (例如 SPRING2026)" style={{ ...inputStyle, flex: '2 1 200px', textTransform: 'uppercase' }} />
                      <div style={{ flex: '1 1 120px', position: 'relative' }}>
                        <input type="number" value={notiPercent} onChange={(event) => setNotiPercent(event.target.value)} placeholder="折扣％數" min="1" max="100" style={{ ...inputStyle, width: '100%' }} />
                        <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: MUTED, fontWeight: 800 }}>%</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: MUTED, marginBottom: 8 }}>直接贈送點數</label>
                    <div style={{ position: 'relative' }}>
                      <Coins size={18} color={MUTED} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
                      <input 
                        type="number" 
                        value={grantPoints} 
                        onChange={(event) => setGrantPoints(event.target.value)} 
                        placeholder="輸入要贈送的點數 (發送即時入帳)" 
                        min="1" 
                        style={{ ...inputStyle, paddingLeft: 44 }} 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Advanced Options */}
              <div style={{ background: 'var(--color-bg)', padding: 20, borderRadius: 16, border: '1px solid var(--color-surface-soft)' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 800, color: DARK, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Smartphone size={18} color={MUTED} /> 進階設定
                </h3>
                <div style={{ display: 'grid', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: MUTED, marginBottom: 8 }}>點擊跳轉網址</label>
                    <div style={{ position: 'relative' }}>
                      <Link size={18} color={MUTED} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
                      <input 
                        value={actionUrl} 
                        onChange={(event) => setActionUrl(event.target.value)} 
                        placeholder="例如：/dashboard/user/wallet 或 https://..." 
                        style={{ ...inputStyle, paddingLeft: 44 }} 
                      />
                    </div>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '12px 16px', background: 'transparent', borderRadius: 12, border: '1px solid var(--border-input)' }}>
                    <input 
                      type="checkbox" 
                      checked={sendPush}
                      onChange={(e) => setSendPush(e.target.checked)}
                      style={{ width: 20, height: 20, accentColor: BLUE, cursor: 'pointer' }}
                    />
                    <div>
                      <div style={{ fontWeight: 800, color: DARK, fontSize: 14 }}>強制發送 App 推播通知</div>
                      <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>若開啟，對象手機將會跳出推播通知。</div>
                    </div>
                  </label>
                </div>
              </div>

              <button
                onClick={handleSendNotification}
                disabled={sendingNoti}
                style={{
                  width: '100%',
                  background: BLUE,
                  color: 'var(--text-light)',
                  border: 'none',
                  padding: 16,
                  borderRadius: 14,
                  fontWeight: 900,
                  fontSize: 15,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  opacity: sendingNoti ? 0.7 : 1,
                  marginTop: 8,
                }}
              >
                {sendingNoti ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                {sendingNoti ? '發送中...' : '確認發送'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: 12,
  border: '1px solid var(--border-input)',
  fontSize: 15,
  fontWeight: 700,
  color: DARK,
  boxSizing: 'border-box',
  background: 'var(--color-surface)',
};

const selectStyle = {
  ...inputStyle,
  appearance: 'none',
  backgroundColor: 'var(--color-surface)',
  backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 16px center',
  backgroundSize: '16px',
  paddingRight: 40,
};
