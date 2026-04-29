'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Info, Loader2, Mail, Percent, Send } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

const BLUE = '#2563EB';
const DARK = '#0F172A';
const MUTED = '#64748B';
const WHITE = '#FFFFFF';
const BG = '#F8FAFC';

export default function PromotionsAdmin() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState('commissions');
  const [coaches, setCoaches] = useState([]);
  const [globalCommission, setGlobalCommission] = useState(20);
  const [loading, setLoading] = useState(true);

  const [notiTitle, setNotiTitle] = useState('');
  const [notiContent, setNotiContent] = useState('');
  const [notiCode, setNotiCode] = useState('');
  const [notiPercent, setNotiPercent] = useState('');
  const [sendingNoti, setSendingNoti] = useState(false);
  const [message, setMessage] = useState(null);
  
  const [levelDiscounts, setLevelDiscounts] = useState({ 1: 5, 2: 10, 3: 15, 4: 20 });
  const [usersList, setUsersList] = useState([]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'admin') {
      router.push('/dashboard/coach');
      return;
    }
    fetchData();
  }, [authLoading, router, user]);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [settingsRes, coachesRes, usersRes] = await Promise.all([
        fetch('/api/admin/settings'),
        fetch('/api/admin/coaches'),
        fetch('/api/admin/users'),
      ]);

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        if (settingsData.settings?.commission_rate !== undefined) {
          setGlobalCommission(Number(settingsData.settings.commission_rate));
        }
        
        setLevelDiscounts({
          1: settingsData.settings?.level_1_discount !== undefined ? Number(settingsData.settings.level_1_discount) : 5,
          2: settingsData.settings?.level_2_discount !== undefined ? Number(settingsData.settings.level_2_discount) : 10,
          3: settingsData.settings?.level_3_discount !== undefined ? Number(settingsData.settings.level_3_discount) : 15,
          4: settingsData.settings?.level_4_discount !== undefined ? Number(settingsData.settings.level_4_discount) : 20,
        });
      }

      if (coachesRes.ok) {
        const coachesData = await coachesRes.json();
        setCoaches(coachesData.coaches || []);
      }
      
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsersList(usersData.users || []);
      }
    } catch (error) {
      console.error('[PROMOTIONS ADMIN FETCH ERROR]', error);
      showMessage('error', '載入推廣設定失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLevelDiscount = async (level, discount) => {
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: `level_${level}_discount`, value: discount }),
      });
      if (!response.ok) throw new Error('更新等級折扣失敗');
      
      setLevelDiscounts(prev => ({ ...prev, [level]: discount }));
      showMessage('success', `Lv.${level} 等級折扣已更新`);
    } catch (err) {
      showMessage('error', err.message);
    }
  };

  const handleUpdateUser = async (userId, level, customDiscount) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level, custom_discount: customDiscount }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '更新使用者失敗');
      }
      
      setUsersList(prev => prev.map(u => u.id === userId ? { ...u, level, custom_discount: customDiscount } : u));
      showMessage('success', '使用者設定已更新');
    } catch (err) {
      showMessage('error', err.message);
    }
  };

  const handleUpdateCommission = async (coachUserId, newRate) => {
    try {
      const response = await fetch(`/api/admin/coaches/${coachUserId}/commission`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commission_rate: newRate }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || '更新教練抽成失敗');
      }

      setCoaches((prev) =>
        prev.map((coach) =>
          coach.user_id === coachUserId ? { ...coach, commission_rate: newRate } : coach
        )
      );
      showMessage('success', '教練抽成設定已更新');
    } catch (error) {
      console.error('[UPDATE COMMISSION UI ERROR]', error);
      showMessage('error', error.message || '更新教練抽成失敗');
    }
  };

  const handleSendNotification = async () => {
    if (!notiTitle.trim() || !notiContent.trim()) {
      showMessage('error', '請填寫通知標題與內容');
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
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || '發送通知失敗');
      }

      setNotiTitle('');
      setNotiContent('');
      setNotiCode('');
      setNotiPercent('');
      showMessage('success', '通知已成功送出');
    } catch (error) {
      console.error('[SEND NOTIFICATION UI ERROR]', error);
      showMessage('error', error.message || '發送通知失敗');
    } finally {
      setSendingNoti(false);
    }
  };

  if (loading || authLoading) {
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
        <p>載入推廣設定中...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, padding: '24px 16px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <header
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 24,
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              onClick={() => router.push('/dashboard/admin')}
              style={{
                padding: 10,
                background: WHITE,
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
                <Percent color={BLUE} size={24} />
                推廣與抽成管理
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: MUTED }}>
                管理教練抽成、自訂優惠通知與平台推廣設定。
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', background: '#E2E8F0', padding: 4, borderRadius: 14 }}>
            <button
              onClick={() => setActiveTab('commissions')}
              style={{
                padding: '8px 16px',
                borderRadius: 10,
                border: 'none',
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
                background: activeTab === 'commissions' ? WHITE : 'transparent',
                color: activeTab === 'commissions' ? DARK : MUTED,
                boxShadow: activeTab === 'commissions' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
              }}
            >
              教練抽成
            </button>
            <button
              onClick={() => setActiveTab('discounts')}
              style={{
                padding: '8px 16px',
                borderRadius: 10,
                border: 'none',
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
                background: activeTab === 'discounts' ? WHITE : 'transparent',
                color: activeTab === 'discounts' ? DARK : MUTED,
                boxShadow: activeTab === 'discounts' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
              }}
            >
              通知與折扣
            </button>
            <button
              onClick={() => setActiveTab('users')}
              style={{
                padding: '8px 16px',
                borderRadius: 10,
                border: 'none',
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
                background: activeTab === 'users' ? WHITE : 'transparent',
                color: activeTab === 'users' ? DARK : MUTED,
                boxShadow: activeTab === 'users' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
              }}
            >
              使用者折扣
            </button>
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

        {activeTab === 'commissions' && (
          <div
            style={{
              background: WHITE,
              borderRadius: 24,
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 20px rgba(15,23,42,0.03)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: 24, borderBottom: '1px solid #F1F5F9' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <Info size={18} color={BLUE} style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 800, color: DARK, fontSize: 14 }}>
                    目前平台預設抽成：{globalCommission}%
                  </div>
                  <div style={{ color: MUTED, fontSize: 13, marginTop: 4 }}>
                    若教練沒有自訂抽成，系統會使用平台預設值。你可以在此替個別教練設定專屬比例，空白則恢復平台預設。
                  </div>
                </div>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    <th style={{ padding: '16px 24px', color: MUTED, fontWeight: 800, fontSize: 13 }}>教練</th>
                    <th style={{ padding: '16px 24px', color: MUTED, fontWeight: 800, fontSize: 13 }}>設定狀態</th>
                    <th style={{ padding: '16px 24px', color: MUTED, fontWeight: 800, fontSize: 13 }}>抽成比例 (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {coaches.map((coach) => {
                    const isCustom = coach.commission_rate !== null && coach.commission_rate !== undefined;
                    const currentRate = isCustom ? coach.commission_rate : globalCommission;

                    return (
                      <tr key={coach.user_id || coach.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '16px 24px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            {coach.user?.avatar_url ? (
                              <img
                                src={coach.user.avatar_url}
                                alt={coach.user?.name || '教練頭像'}
                                style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: '50%',
                                  background: '#EFF6FF',
                                  color: BLUE,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 900,
                                }}
                              >
                                {coach.user?.name?.charAt(0) || 'C'}
                              </div>
                            )}
                            <div>
                              <div style={{ fontWeight: 800, color: DARK, fontSize: 14 }}>
                                {coach.user?.name || '未命名教練'}
                              </div>
                              <div style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>{coach.user?.email || '-'}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          {isCustom ? (
                            <span
                              style={{
                                background: '#FEF3C7',
                                color: '#D97706',
                                padding: '4px 10px',
                                borderRadius: 8,
                                fontSize: 12,
                                fontWeight: 800,
                              }}
                            >
                              個別設定
                            </span>
                          ) : (
                            <span
                              style={{
                                background: '#F1F5F9',
                                color: MUTED,
                                padding: '4px 10px',
                                borderRadius: 8,
                                fontSize: 12,
                                fontWeight: 800,
                              }}
                            >
                              使用預設
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <input
                              type="number"
                              defaultValue={currentRate}
                              min={0}
                              max={100}
                              onBlur={(event) => {
                                const value = event.target.value;
                                if (value === '') {
                                  if (isCustom) {
                                    handleUpdateCommission(coach.user_id, null);
                                  }
                                  event.target.value = String(globalCommission);
                                  return;
                                }

                                const nextRate = Number(value);
                                if (Number.isNaN(nextRate)) return;
                                if (nextRate !== currentRate) {
                                  handleUpdateCommission(coach.user_id, nextRate);
                                }
                              }}
                              style={{
                                width: 70,
                                padding: '8px 12px',
                                borderRadius: 10,
                                border: '1px solid #CBD5E1',
                                fontSize: 14,
                                fontWeight: 800,
                                color: DARK,
                                background: isCustom ? '#FEF3C7' : WHITE,
                              }}
                            />
                            <span style={{ color: MUTED, fontSize: 13, fontWeight: 800 }}>%</span>
                            {isCustom && (
                              <button
                                onClick={() => handleUpdateCommission(coach.user_id, null)}
                                style={{
                                  border: 'none',
                                  background: 'transparent',
                                  color: BLUE,
                                  fontSize: 12,
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  textDecoration: 'underline',
                                }}
                              >
                                恢復預設
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {coaches.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ padding: 40, textAlign: 'center', color: MUTED, fontSize: 14 }}>
                        目前沒有可管理的教練資料。
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'discounts' && (
          <div
            style={{
              background: WHITE,
              borderRadius: 24,
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 20px rgba(15,23,42,0.03)',
              padding: 32,
            }}
          >
            <h2
              style={{
                margin: '0 0 24px',
                fontSize: 18,
                fontWeight: 900,
                color: DARK,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Mail color={BLUE} /> 發送優惠通知
            </h2>

            <div style={{ display: 'grid', gap: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: MUTED, marginBottom: 8 }}>
                  通知標題 *
                </label>
                <input
                  value={notiTitle}
                  onChange={(event) => setNotiTitle(event.target.value)}
                  placeholder="例如：春季限定優惠開跑"
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: 12,
                    border: '1px solid #CBD5E1',
                    fontSize: 15,
                    fontWeight: 700,
                    color: DARK,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: MUTED, marginBottom: 8 }}>
                  通知內容 *
                </label>
                <textarea
                  value={notiContent}
                  onChange={(event) => setNotiContent(event.target.value)}
                  placeholder="輸入要發送給使用者的通知內容，例如活動說明、使用條件或截止時間。"
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: 12,
                    border: '1px solid #CBD5E1',
                    fontSize: 15,
                    fontWeight: 700,
                    color: DARK,
                    boxSizing: 'border-box',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: MUTED, marginBottom: 8 }}>
                  折扣資訊（選填）
                </label>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <input
                    value={notiCode}
                    onChange={(event) => setNotiCode(event.target.value.toUpperCase())}
                    placeholder="例如 SPRING2026"
                    style={{
                      flex: '2 1 260px',
                      padding: '14px 16px',
                      borderRadius: 12,
                      border: '1px solid #CBD5E1',
                      fontSize: 15,
                      fontWeight: 700,
                      color: DARK,
                      boxSizing: 'border-box',
                      textTransform: 'uppercase',
                    }}
                  />
                  <div style={{ flex: '1 1 140px', position: 'relative' }}>
                    <input
                      type="number"
                      value={notiPercent}
                      onChange={(event) => setNotiPercent(event.target.value)}
                      placeholder="折扣％數"
                      min="1"
                      max="100"
                      style={{
                        width: '100%',
                        padding: '14px 16px',
                        borderRadius: 12,
                        border: '1px solid #CBD5E1',
                        fontSize: 15,
                        fontWeight: 700,
                        color: DARK,
                        boxSizing: 'border-box',
                      }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        right: 16,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: MUTED,
                        fontWeight: 800,
                      }}
                    >
                      %
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 8 }}>
                <button
                  onClick={handleSendNotification}
                  disabled={sendingNoti}
                  style={{
                    width: '100%',
                    background: BLUE,
                    color: WHITE,
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
                  }}
                >
                  {sendingNoti ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                  送出通知
                </button>
                <p style={{ margin: '12px 0 0', fontSize: 12, color: MUTED, textAlign: 'center' }}>
                  發送後，通知會顯示在使用者的站內通知區；若有填入折扣碼與折扣比例，也會一併顯示。
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div style={{ display: 'grid', gap: 24 }}>
      {/* 全域等級折扣設定 */}
      <div
        style={{
          background: WHITE,
          borderRadius: 24,
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 20px rgba(15,23,42,0.03)',
          overflow: 'hidden',
          padding: 24,
        }}
      >
        <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 900, color: DARK, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Percent color={BLUE} size={20} /> 等級折扣預設值
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
          {[1, 2, 3, 4].map((lv) => (
            <div key={lv} style={{ background: BG, padding: 16, borderRadius: 12, border: '1px solid #E2E8F0' }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: MUTED, marginBottom: 8 }}>
                Lv.{lv} 折扣 (%)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number"
                  value={levelDiscounts[lv]}
                  onChange={(e) => setLevelDiscounts(prev => ({ ...prev, [lv]: Number(e.target.value) }))}
                  onBlur={(e) => handleUpdateLevelDiscount(lv, Number(e.target.value))}
                  min={0}
                  max={100}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '1px solid #CBD5E1',
                    fontSize: 15,
                    fontWeight: 700,
                    color: DARK,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <p style={{ margin: '16px 0 0', fontSize: 13, color: MUTED }}>
          修改後將自動儲存並套用至全站使用者（若使用者擁有「個別專屬折扣」，則以專屬折扣為主）。
        </p>
      </div>

      {/* 個別使用者設定 */}
      <div
        style={{
          background: WHITE,
          borderRadius: 24,
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 20px rgba(15,23,42,0.03)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: 24, borderBottom: '1px solid #F1F5F9' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: DARK, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Info color={BLUE} size={20} /> 個別使用者設定
          </h2>
          <p style={{ color: MUTED, fontSize: 13, marginTop: 8, margin: 0 }}>
            可手動調整使用者的等級，或給予專屬的客製化折扣。設定客製化折扣後，將忽略預設等級折扣。
          </p>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '16px 24px', color: MUTED, fontWeight: 800, fontSize: 13 }}>使用者</th>
                <th style={{ padding: '16px 24px', color: MUTED, fontWeight: 800, fontSize: 13 }}>等級 (Lv)</th>
                <th style={{ padding: '16px 24px', color: MUTED, fontWeight: 800, fontSize: 13 }}>個別專屬折扣 (%)</th>
              </tr>
            </thead>
            <tbody>
              {usersList.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ fontWeight: 800, color: DARK, fontSize: 14 }}>
                      {u.name || '未命名'}
                    </div>
                    <div style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>{u.email || '-'}</div>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <select
                      value={u.level || 1}
                      onChange={(e) => handleUpdateUser(u.id, Number(e.target.value), u.custom_discount)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 10,
                        border: '1px solid #CBD5E1',
                        fontSize: 14,
                        fontWeight: 800,
                        color: DARK,
                        background: WHITE,
                      }}
                    >
                      {[1, 2, 3, 4].map(lv => (
                        <option key={lv} value={lv}>Lv.{lv}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <input
                        type="number"
                        placeholder="無"
                        defaultValue={u.custom_discount ?? ''}
                        min={0}
                        max={100}
                        onBlur={(e) => {
                          const val = e.target.value;
                          const newDiscount = val === '' ? null : Number(val);
                          if (newDiscount !== u.custom_discount) {
                            handleUpdateUser(u.id, u.level || 1, newDiscount);
                          }
                        }}
                        style={{
                          width: 80,
                          padding: '8px 12px',
                          borderRadius: 10,
                          border: '1px solid #CBD5E1',
                          fontSize: 14,
                          fontWeight: 800,
                          color: DARK,
                          background: u.custom_discount !== null ? '#FEF3C7' : WHITE,
                        }}
                      />
                      {u.custom_discount !== null && (
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#D97706', background: '#FEF3C7', padding: '4px 8px', borderRadius: 6 }}>
                          覆蓋預設
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {usersList.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: 40, textAlign: 'center', color: MUTED, fontSize: 14 }}>
                    尚無使用者資料。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )}
</div>
    </div>
  );
}
