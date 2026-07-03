'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { Wallet, Copy, Check, Coins, Loader2, ArrowDownLeft, ArrowUpRight, Ticket, ChevronLeft } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const DARK = '#050816';
const CARD = '#0B1220';
const BORDER = 'rgba(255,255,255,0.05)';
const ORANGE = '#FF8A3D';
const TEXT_LIGHT = '#FFFFFF';
const MUTED = '#94A3B8';

export default function CoachEarningsWalletPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [bindCode, setBindCode] = useState('');
  const [binding, setBinding] = useState(false);
  const [bindError, setBindError] = useState('');
  const [copySuccess, setCopySuccess] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchPointsData();
  }, [user]);

  const fetchPointsData = async () => {
    try {
      const [walletRes, profileRes, bookingsRes] = await Promise.all([
        fetch('/api/wallet'),
        fetch('/api/auth/profile'),
        fetch('/api/bookings')
      ]);

      let combinedTransactions = [];
      let totalBalance = 0;

      if (walletRes.ok) {
        const data = await walletRes.json();
        totalBalance += (data.balance || 0);
        if (data.transactions) {
          combinedTransactions = [...combinedTransactions, ...data.transactions.map(tx => ({
            ...tx,
            isBooking: tx.transaction_type === 'booking_payout',
            date: new Date(tx.created_at)
          }))];
        }
      }

      if (profileRes.ok) {
        const { profile } = await profileRes.json();
        setProfile(profile);
      }

      // Sort combined transactions descending by date
      combinedTransactions.sort((a, b) => b.date.getTime() - a.date.getTime());

      setBalance(totalBalance);
      setTransactions(combinedTransactions);

    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const openSupportChat = () => {
    window.dispatchEvent(new Event('open-support-chat')); // 直接開啟右下角客服彈窗
  };

  const handleBind = async () => {
    if (!bindCode.trim()) return;
    setBinding(true);
    setBindError('');
    try {
      const res = await fetch('/api/user/referral/bind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: bindCode })
      });
      const data = await res.json();
      if (res.ok) {
        setProfile(prev => ({ ...prev, referred_by: 'bound' }));
      } else {
        setBindError(data.error || '綁定失敗');
      }
    } catch (err) {
      setBindError('網路錯誤，請稍後再試');
    } finally {
      setBinding(false);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess('已複製！');
      setTimeout(() => setCopySuccess(''), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', padding: '24px 16px 96px', background: DARK, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Loader2 size={32} color={ORANGE} style={{ animation: 'spin 1s linear infinite' }} />
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', padding: '24px 16px 96px', background: DARK, color: TEXT_LIGHT, fontFamily: 'sans-serif' }}>
      <section style={{ maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
        
        {/* 返回按鈕 */}
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', color: TEXT_LIGHT, alignItems: 'center', gap: 8, marginBottom: -8 }}
        >
          <ChevronLeft size={24} /> <span style={{ fontSize: 16, fontWeight: 800 }}>返回工作台</span>
        </button>

        {/* 頂部整合面板：餘額與提領 */}
        <div style={{ background: CARD, borderRadius: 24, padding: 24, border: `1px solid ${BORDER}` }}>
          {/* 上部：餘額與操作 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24, gap: 16 }}>
            <p style={{ margin: '0', fontSize: 16, color: MUTED }}>可提領總收益</p>
            <div style={{ fontSize: 48, fontWeight: 900, color: TEXT_LIGHT, display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 28, color: ORANGE }}>$</span> {balance.toLocaleString()}
            </div>
            
            <button
              onClick={openSupportChat}
              style={{
                width: '100%', padding: '14px 24px', borderRadius: 16, border: 'none',
                background: 'rgba(255, 138, 61, 0.1)', color: ORANGE, fontWeight: 800, fontSize: 16,
                cursor: 'pointer', transition: 'all 0.2s', marginTop: '8px'
              }}
            >
              聯絡客服提領
            </button>
          </div>

          <div style={{ height: 1, background: BORDER, margin: '0 0 24px' }} />

          {/* 中部：推廣碼 / 優惠碼輸入 */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
            <input
              type="text"
              placeholder="輸入推廣碼 / 優惠碼"
              value={bindCode}
              onChange={(e) => setBindCode(e.target.value.toUpperCase())}
              style={{
                flex: 1, background: 'rgba(255,255,255,0.03)', border: `1px solid rgba(255,255,255,0.05)`,
                borderRadius: 16, padding: '16px 20px', color: TEXT_LIGHT, fontSize: 15,
                outline: 'none', letterSpacing: '1px'
              }}
            />
            <button
              onClick={handleBind}
              disabled={binding || !bindCode.trim()}
              style={{
                padding: '0 32px', borderRadius: 16, border: 0,
                background: bindCode.trim() ? '#8B5E3C' : 'rgba(139, 94, 60, 0.3)',
                color: bindCode.trim() ? '#FFF' : 'rgba(255,255,255,0.4)',
                fontWeight: 700, fontSize: 15, cursor: bindCode.trim() ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s'
              }}
            >
              {binding ? '處理中' : '套用'}
            </button>
          </div>

          {/* 下部：推薦碼與 QR Code */}
          {profile && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <p style={{ margin: '0 0 8px', fontSize: 14, color: MUTED }}>您的教練推薦碼</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 24, fontWeight: 900, color: ORANGE, letterSpacing: '2px' }}>
                    {profile.promotion_code || '------'}
                  </span>
                  <button
                    onClick={() => copyToClipboard(profile.promotion_code)}
                    style={{ background: 'transparent', border: 0, padding: 4, cursor: 'pointer', color: MUTED, display: 'flex', alignItems: 'center' }}
                  >
                    {copySuccess ? <Check size={20} color="#10B981" /> : <Copy size={20} />}
                  </button>
                </div>
                {profile.referred_by && (
                  <p style={{ margin: '8px 0 0', fontSize: 13, color: '#10B981', fontWeight: 600 }}>✓ 已綁定推廣人</p>
                )}
                {bindError && (
                  <p style={{ margin: '8px 0 0', fontSize: 13, color: '#EF4444', fontWeight: 600 }}>{bindError}</p>
                )}
              </div>
              <div style={{ background: '#FFF', padding: 8, borderRadius: 12 }}>
                <QRCodeSVG
                  value={`https://platform-zeta-one-51.vercel.app/register?ref=${profile.promotion_code}`}
                  size={80}
                  bgColor={"#ffffff"}
                  fgColor={"#000000"}
                  level={"L"}
                />
              </div>
            </div>
          )}
        </div>

        {/* 90 天收益明細按鈕 */}
        <button
          onClick={() => router.push('/dashboard/user/wallet/referrals')}
          style={{
            width: '100%', padding: '16px', borderRadius: 16, border: `1px solid rgba(255,138,61,0.3)`,
            background: 'rgba(255,138,61,0.05)', color: ORANGE, fontWeight: 800, fontSize: 15,
            cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8,
            transition: 'all 0.2s'
          }}
        >
          <Coins size={18} /> 查看推廣人上課明細 (90天)
        </button>

        {/* 交易紀錄 */}
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
             收入與交易紀錄
          </h2>
          {transactions.length === 0 ? (
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24, textAlign: 'center' }}>
              <p style={{ margin: 0, color: MUTED, fontSize: 14 }}>目前尚無交易或完課紀錄</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {transactions.map((tx) => {
                const isPositive = tx.amount > 0;
                return (
                  <div key={tx.id || Math.random()} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: isPositive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {isPositive ? <ArrowDownLeft size={20} color="#10B981" /> : <ArrowUpRight size={20} color="#EF4444" />}
                      </div>
                      <div>
                        <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: TEXT_LIGHT }}>
                          {tx.description || (tx.transaction_type === 'top_up' ? '儲值' : tx.transaction_type === 'booking' ? '課程預約' : '點數交易')}
                        </p>
                        <p style={{ margin: 0, fontSize: 12, color: MUTED }}>
                          {tx.date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: isPositive ? '#10B981' : TEXT_LIGHT }}>
                      {isPositive ? '+' : ''}{tx.amount} 點
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 優惠券區塊保留 */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 24, padding: 32, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Ticket size={20} color={ORANGE} /> 我的優惠券
          </h2>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24, textAlign: 'center' }}>
            <Ticket size={32} color={MUTED} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <p style={{ margin: 0, color: MUTED, fontSize: 14 }}>目前尚無可用優惠券</p>
          </div>
        </div>

      </section>
    </main>
  );
}
