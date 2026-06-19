'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { Wallet, Copy, Check, Coins, Loader2, MessageCircle, ArrowDownLeft, ArrowUpRight, Ticket, UserPlus } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const DARK = '#050816';
const CARD = '#0B1220';
const BORDER = 'rgba(255,255,255,0.05)';
const ORANGE = '#FF8A3D';
const TEXT_LIGHT = '#FFFFFF';
const MUTED = '#94A3B8';

export default function PointsCenterPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [balance, setBalance] = useState(0);
  const [bonusBalance, setBonusBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [bankInfo, setBankInfo] = useState(null);
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
      const [walletRes, profileRes] = await Promise.all([
        fetch('/api/wallet'),
        fetch('/api/auth/profile')
      ]);

      if (walletRes.ok) {
        const data = await walletRes.json();
        setBalance(data.balance || 0);
        setBonusBalance(data.bonusBalance || 0);
        setTransactions(data.transactions || []);
        if (data.bankInfo) {
          setBankInfo(data.bankInfo);
        }
      }

      if (profileRes.ok) {
        const { profile } = await profileRes.json();
        setProfile(profile);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const openSupportChat = () => {
    // Attempt to trigger the floating support widget if it's rendered globally
    // If not, redirect to chat
    router.push('/chat');
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

        {/* 頂部整合面板：餘額、儲值與推廣碼 */}
        <div style={{ background: CARD, borderRadius: 24, padding: 24, border: `1px solid ${BORDER}` }}>
          {/* 上部：餘額與操作 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(255, 138, 61, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Wallet size={28} color={ORANGE} />
              </div>
              <div>
                <p style={{ margin: '0 0 4px', fontSize: 14, color: MUTED }}>錢包餘額</p>
                <div style={{ fontSize: 48, fontWeight: 900, color: TEXT_LIGHT, fontFamily: 'monospace', letterSpacing: '-1px' }}>
                  <span style={{ fontSize: 24 }}>$</span> {balance.toLocaleString()}
                </div>
                {bonusBalance > 0 && (
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#3B82F6', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>每月紅利餘額 (月底歸零): {bonusBalance.toLocaleString()} 點</span>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={openSupportChat}
              style={{
                padding: '10px 24px', borderRadius: 12, border: `1px solid rgba(255,255,255,0.1)`,
                background: 'transparent', color: TEXT_LIGHT, fontWeight: 700, fontSize: 15,
                cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              聯絡客服儲值
            </button>
          </div>

          <div style={{ height: 1, background: BORDER, margin: '0 0 24px' }} />

          {/* Bank Info Topup Section */}
          {bankInfo && (
            <div style={{ background: 'rgba(255, 138, 61, 0.08)', borderRadius: 16, padding: 16, border: '1px solid rgba(255, 138, 61, 0.2)', marginBottom: 24 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 800, color: ORANGE, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Wallet size={18} /> 銀行匯款儲值資訊
              </h3>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: MUTED, lineHeight: 1.5 }}>
                請透過網銀或實體 ATM 將款項匯至以下帳戶，匯款完成後點擊右上方「聯絡客服儲值」，由客服為您將點數入帳。
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12, border: `1px solid rgba(255,255,255,0.05)` }}>
                  <p style={{ margin: '0 0 4px', fontSize: 12, color: MUTED }}>銀行代碼</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: TEXT_LIGHT, letterSpacing: '1px' }}>{bankInfo.bank_code}</div>
                    <button onClick={() => copyToClipboard(bankInfo.bank_code)} style={{ background: 'transparent', border: 'none', color: ORANGE, cursor: 'pointer', padding: 4 }}>
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
                <div style={{ flex: 2, background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12, border: `1px solid rgba(255,255,255,0.05)` }}>
                  <p style={{ margin: '0 0 4px', fontSize: 12, color: MUTED }}>銀行帳號</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: TEXT_LIGHT, letterSpacing: '1px' }}>{bankInfo.bank_account_number}</div>
                    <button onClick={() => copyToClipboard(bankInfo.bank_account_number)} style={{ background: 'transparent', border: 'none', color: ORANGE, cursor: 'pointer', padding: 4 }}>
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

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
                <p style={{ margin: '0 0 8px', fontSize: 14, color: MUTED }}>推薦碼</p>
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
             交易紀錄
          </h2>
          {transactions.length === 0 ? (
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24, textAlign: 'center' }}>
              <p style={{ margin: 0, color: MUTED, fontSize: 14 }}>目前尚無交易紀錄</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {transactions.map((tx) => {
                const isPositive = tx.amount > 0;
                return (
                  <div key={tx.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: isPositive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {isPositive ? <ArrowDownLeft size={20} color="#10B981" /> : <ArrowUpRight size={20} color="#EF4444" />}
                      </div>
                      <div>
                        <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: TEXT_LIGHT }}>
                          {tx.description || (tx.transaction_type === 'top_up' ? '儲值' : tx.transaction_type === 'booking' ? '課程預約' : '點數交易')}
                        </p>
                        <p style={{ margin: 0, fontSize: 12, color: MUTED }}>
                          {new Date(tx.created_at).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
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
};
