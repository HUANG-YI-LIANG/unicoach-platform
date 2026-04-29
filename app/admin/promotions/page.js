'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  Info,
  Loader2,
  Mail,
  Percent,
  Send,
  Users,
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

const BLUE = '#2563EB';
const DARK = '#0F172A';
const MUTED = '#64748B';
const WHITE = '#FFFFFF';
const BG = '#F8FAFC';

const DEFAULT_LEVEL_DISCOUNTS = { 1: 5, 2: 10, 3: 15, 4: 20 };

export default function PromotionsAdmin() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState('commissions');
  const [coaches, setCoaches] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [globalCommission, setGlobalCommission] = useState(20);
  const [levelDiscounts, setLevelDiscounts] = useState(DEFAULT_LEVEL_DISCOUNTS);
  const [loading, setLoading] = useState(true);

  const [notiTitle, setNotiTitle] = useState('');
  const [notiContent, setNotiContent] = useState('');
  const [notiCode, setNotiCode] = useState('');
  const [notiPercent, setNotiPercent] = useState('');
  const [sendingNoti, setSendingNoti] = useState(false);
  const [message, setMessage] = useState(null);

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

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || '更新等級折扣失敗');
      }

      setLevelDiscounts((prev) => ({ ...prev, [level]: discount }));
      showMessage('success', `Lv.${level} 折扣已更新`);
    } catch (error) {
      showMessage('error', error.message || '更新等級折扣失敗');
    }
  };

  const handleUpdateUser = async (userId, updates) => {
    const previousUsers = [...usersList];
    setUsersList((prev) => prev.map((item) => (item.id === userId ? { ...item, ...updates } : item)));

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || '更新使用者失敗');
      }

      showMessage('success', '使用者設定已更新');
    } catch (error) {
      setUsersList(previousUsers);
      showMessage('error', error.message || '更新使用者失敗');
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
                管理教練抽成、會員折扣與通知推播。
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', background: '#E2E8F0', padding: 4, borderRadius: 14, flexWrap: 'wrap' }}>
            {[
              ['commissions', '教練抽成'],
              ['discounts', '通知與折扣'],
              ['members', '會員設定'],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 10,
                  border: 'none',
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer',
                  background: activeTab === key ? WHITE : 'transparent',
                  color: activeTab === key ? DARK : MUTED,
                  boxShadow: activeTab === key ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                }}
              >
                {label}
              </button>
            ))}
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
                  <div style={{ fontWeight: 800, color: DARK, fontSize: 14 }}>目前平台預設抽成：{globalCommission}%</div>
                  <div style={{ color: MUTED, fontSize: 13, marginTop: 4 }}>
                    沒有個別設定的教練，系統會使用平台預設抽成比例。
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
                            <span style={{ background: '#FEF3C7', color: '#D97706', padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 800 }}>
                              個別設定
                            </span>
                          ) : (
                            <span style={{ background: '#F1F5F9', color: MUTED, padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 800 }}>
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
                                  if (isCustom) handleUpdateCommission(coach.user_id, null);
                                  event.target.value = String(globalCommission);
                                  return;
                                }
                                const nextRate = Number(value);
                                if (!Number.isNaN(nextRate) && nextRate !== currentRate) {
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
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'discounts' && (
          <div style={{ display: 'grid', gap: 24 }}>
            <div
              style={{
                background: WHITE,
                borderRadius: 24,
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 20px rgba(15,23,42,0.03)',
                padding: 32,
              }}
            >
              <h2 style={{ margin: '0 0 24px', fontSize: 18, fontWeight: 900, color: DARK, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Mail color={BLUE} /> 發送優惠通知
              </h2>

              <div style={{ display: 'grid', gap: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: MUTED, marginBottom: 8 }}>通知標題 *</label>
                  <input value={notiTitle} onChange={(event) => setNotiTitle(event.target.value)} placeholder="例如：春季限定優惠開跑" style={inputStyle} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: MUTED, marginBottom: 8 }}>通知內容 *</label>
                  <textarea value={notiContent} onChange={(event) => setNotiContent(event.target.value)} placeholder="輸入活動說明、使用方式或截止日期。" rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: MUTED, marginBottom: 8 }}>折扣資訊（選填）</label>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <input value={notiCode} onChange={(event) => setNotiCode(event.target.value.toUpperCase())} placeholder="例如 SPRING2026" style={{ ...inputStyle, flex: '2 1 260px', textTransform: 'uppercase' }} />
                    <div style={{ flex: '1 1 140px', position: 'relative' }}>
                      <input type="number" value={notiPercent} onChange={(event) => setNotiPercent(event.target.value)} placeholder="折扣％數" min="1" max="100" style={{ ...inputStyle, width: '100%' }} />
                      <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: MUTED, fontWeight: 800 }}>%</span>
                    </div>
                  </div>
                </div>

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
              </div>
            </div>

            <div
              style={{
                background: WHITE,
                borderRadius: 24,
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 20px rgba(15,23,42,0.03)',
                padding: 32,
              }}
            >
              <h2 style={{ margin: '0 0 24px', fontSize: 18, fontWeight: 900, color: DARK, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Percent color={BLUE} /> 會員等級預設折扣
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                {[1, 2, 3, 4].map((level) => (
                  <div key={level} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 18, padding: 18 }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: DARK, marginBottom: 10 }}>Lv.{level}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="number"
                        defaultValue={levelDiscounts[level]}
                        min={0}
                        max={100}
                        onBlur={(event) => {
                          const discount = Number(event.target.value);
                          if (!Number.isNaN(discount) && discount !== levelDiscounts[level]) {
                            handleUpdateLevelDiscount(level, discount);
                          }
                        }}
                        style={{ ...inputStyle, width: 88 }}
                      />
                      <span style={{ color: MUTED, fontWeight: 800 }}>%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'members' && (
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
                <Users color={BLUE} size={20} /> 會員等級與個別折扣
              </h2>
              <p style={{ color: MUTED, fontSize: 13, marginTop: 8, marginBottom: 0 }}>
                調整會員等級時只會更新等級；只有你實際修改「個別折扣」時，才會寫入該會員的自訂折扣。
              </p>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    <th style={thStyle}>會員</th>
                    <th style={thStyle}>等級 (Lv)</th>
                    <th style={thStyle}>個別折扣 (%)</th>
                    <th style={thStyle}>最終總折扣 (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map((userItem) => (
                    <tr key={userItem.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 800, color: DARK, fontSize: 14 }}>{userItem.name || '未命名使用者'}</div>
                        <div style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>{userItem.email || '-'}</div>
                      </td>
                      <td style={tdStyle}>
                        <select
                          value={userItem.level || 1}
                          onChange={(event) => handleUpdateUser(userItem.id, { level: Number(event.target.value) })}
                          style={selectStyle}
                        >
                          {[1, 2, 3, 4].map((level) => (
                            <option key={level} value={level}>
                              Lv.{level}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <input
                            type="number"
                            placeholder="無"
                            defaultValue={userItem.custom_discount ?? ''}
                            min={0}
                            max={100}
                            onBlur={(event) => {
                              const value = event.target.value;
                              const nextDiscount = value === '' ? null : Number(value);
                              if (nextDiscount !== userItem.custom_discount) {
                                handleUpdateUser(userItem.id, { custom_discount: nextDiscount });
                              }
                            }}
                            style={{
                              ...inputStyle,
                              width: 80,
                              background: userItem.custom_discount !== null ? '#FEF3C7' : WHITE,
                            }}
                          />
                          {userItem.custom_discount !== null && (
                            <span style={{ fontSize: 12, fontWeight: 800, color: '#D97706', background: '#FEF3C7', padding: '4px 8px', borderRadius: 6 }}>
                              個別設定
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ 
                          fontSize: 16, 
                          fontWeight: 900, 
                          color: userItem.custom_discount !== null ? '#D97706' : BLUE 
                        }}>
                          {userItem.custom_discount !== null 
                            ? userItem.custom_discount 
                            : (levelDiscounts[userItem.level || 1] ?? 5)}%
                        </div>
                      </td>
                    </tr>
                  ))}
                  {usersList.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ padding: 40, textAlign: 'center', color: MUTED, fontSize: 14 }}>
                        目前沒有會員資料。
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: 12,
  border: '1px solid #CBD5E1',
  fontSize: 15,
  fontWeight: 700,
  color: DARK,
  boxSizing: 'border-box',
};

const selectStyle = {
  padding: '8px 12px',
  borderRadius: 10,
  border: '1px solid #CBD5E1',
  fontSize: 14,
  fontWeight: 800,
  color: DARK,
  background: WHITE,
};

const thStyle = {
  padding: '16px 24px',
  color: MUTED,
  fontWeight: 800,
  fontSize: 13,
};

const tdStyle = {
  padding: '16px 24px',
};
