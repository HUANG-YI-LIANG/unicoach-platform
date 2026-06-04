'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { Wallet, Plus, Loader2, AlertCircle, CheckCircle, Copy } from 'lucide-react';

const DARK = '#050816';
const CARD = '#0B1220';
const BORDER = 'rgba(255,255,255,0.05)';
const ORANGE = '#FF8A3D';
const TEXT_LIGHT = '#FFFFFF';
const MUTED = '#94A3B8';

export default function WalletPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState(null);

  const [amount, setAmount] = useState('');
  const [bankLast5, setBankLast5] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchBalance();
  }, [user]);

  const fetchBalance = async () => {
    try {
      const res = await fetch('/api/user/profile');
      if (res.ok) {
        const data = await res.json();
        setBalance(data.user?.wallet_balance || 0);
      }
    } catch (err) {
      console.error('Failed to fetch balance:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText('822-123456789012');
    alert('已複製帳號');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setMessage({ type: 'error', text: '請輸入正確的儲值金額' });
      return;
    }
    if (!bankLast5 || bankLast5.length < 4) {
      setMessage({ type: 'error', text: '請輸入帳號末五碼' });
      return;
    }

    setProcessing(true);
    setMessage(null);
    try {
      const res = await fetch('/api/wallet/topup/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(amount), bankLast5 })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: '已送出儲值申請！管理員核對匯款後將為您入點。' });
        setAmount('');
        setBankLast5('');
      } else {
        setMessage({ type: 'error', text: data.error || '申請失敗' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: '伺服器連線失敗' });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: DARK, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 className="animate-spin" color={ORANGE} />
    </div>
  );

  return (
    <main style={{ minHeight: '100vh', padding: '24px 16px 96px', background: DARK, color: TEXT_LIGHT, fontFamily: 'sans-serif' }}>
      <section style={{ maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Wallet size={28} color={ORANGE} /> 我的錢包
        </h1>

        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 24, padding: 32, textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
          <p style={{ margin: '0 0 8px', fontSize: 14, color: MUTED, fontWeight: 600 }}>目前可用點數</p>
          <div style={{ fontSize: 48, fontWeight: 900, color: ORANGE, lineHeight: 1 }}>
            {balance.toLocaleString()}
          </div>
          <p style={{ margin: '16px 0 0', fontSize: 12, color: MUTED }}>1 點 = 1 元新台幣</p>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}`, borderRadius: 24, padding: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 16px' }}>匯款儲值</h2>
          
          <div style={{ background: 'rgba(255,138,61,0.05)', border: `1px solid rgba(255,138,61,0.2)`, borderRadius: 16, padding: 16, marginBottom: 24 }}>
            <p style={{ margin: '0 0 8px', fontSize: 13, color: '#FF8A3D', fontWeight: 800 }}>🏦 指定匯款帳戶</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: '0 0 4px', fontSize: 14, color: TEXT_LIGHT, fontWeight: 700 }}>中國信託 (822)</p>
                <p style={{ margin: 0, fontSize: 18, color: TEXT_LIGHT, fontWeight: 900, letterSpacing: '0.05em' }}>1234 5678 9012</p>
              </div>
              <button onClick={handleCopy} style={{ background: 'rgba(255,255,255,0.1)', border: 0, padding: '8px 12px', borderRadius: 8, color: TEXT_LIGHT, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Copy size={14} /> 複製
              </button>
            </div>
            <p style={{ margin: '12px 0 0', fontSize: 12, color: MUTED }}>匯款完成後，請填寫下方表單回報，我們會盡快為您入點。</p>
          </div>

          {message && (
            <div style={{ 
              padding: 16, borderRadius: 12, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8,
              background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: message.type === 'success' ? '#10B981' : '#EF4444',
              border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
            }}>
              {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              <span style={{ fontSize: 14, fontWeight: 700 }}>{message.text}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <label style={{ display: 'grid', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: MUTED }}>匯款金額 (NT$)</span>
              <input 
                type="number" 
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="例如：1000"
                required
                min="1"
                style={{ padding: 14, borderRadius: 12, border: `1px solid ${BORDER}`, background: 'rgba(255,255,255,0.03)', color: TEXT_LIGHT, outline: 'none' }}
                onFocus={e => e.target.style.borderColor = ORANGE}
                onBlur={e => e.target.style.borderColor = BORDER}
              />
            </label>

            <label style={{ display: 'grid', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: MUTED }}>轉出帳號末五碼</span>
              <input 
                type="text" 
                value={bankLast5}
                onChange={e => setBankLast5(e.target.value)}
                placeholder="例如：54321"
                required
                maxLength="5"
                style={{ padding: 14, borderRadius: 12, border: `1px solid ${BORDER}`, background: 'rgba(255,255,255,0.03)', color: TEXT_LIGHT, outline: 'none' }}
                onFocus={e => e.target.style.borderColor = ORANGE}
                onBlur={e => e.target.style.borderColor = BORDER}
              />
            </label>

            <button 
              type="submit" 
              disabled={processing}
              style={{ 
                marginTop: 8, padding: 16, borderRadius: 12, border: 0, 
                background: ORANGE, color: '#000', fontWeight: 900, fontSize: 16,
                cursor: processing ? 'not-allowed' : 'pointer', opacity: processing ? 0.7 : 1
              }}
            >
              {processing ? '送出中...' : '送出儲值申請'}
            </button>
          </form>
        </div>

      </section>
    </main>
  );
}
