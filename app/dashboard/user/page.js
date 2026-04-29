'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Wallet, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import PromotionCard from '@/components/PromotionCard';

const BLUE = '#2563EB';
const BG = '#F1F5F9';
const CARD = '#FFFFFF';
const BORDER = '#E2E8F0';
const MUTED = '#94A3B8';
const DARK = '#0F172A';
const RADIUS = '20px';
const SHADOW = '0 2px 16px rgba(0,0,0,0.06)';

const EMPTY_PROFILE = {
  name: '',
  email: '',
  phone: null,
  address: null,
  language: '中文',
  learning_goals: null,
  level: 1,
  avatar_url: null,
  coupons: [],
};

const BOOKING_STATUS = {
  pending_payment: { label: '待付款', bg: '#FEF3C7', color: '#92400E' },
  scheduled: { label: '已排程', bg: '#DBEAFE', color: '#1D4ED8' },
  in_progress: { label: '進行中', bg: '#FEF9C3', color: '#854D0E' },
  completed: { label: '已完成', bg: '#D1FAE5', color: '#065F46' },
  cancelled: { label: '已取消', bg: '#FEE2E2', color: '#991B1B' },
};

function bookingStatus(status) {
  return BOOKING_STATUS[status] || { label: status || '未知', bg: '#F1F5F9', color: '#475569' };
}

function SectionLabel({ children }) {
  return (
    <p
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.1em',
        color: MUTED,
        textTransform: 'uppercase',
        marginBottom: 8,
        paddingLeft: 2,
      }}
    >
      {children}
    </p>
  );
}

function SettingRow({ icon, label, value, onClick }) {
  const displayValue = value || '尚未填寫';

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '15px 18px',
        border: 'none',
        borderBottom: `1px solid ${BORDER}`,
        background: CARD,
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{icon}</span>
        <span style={{ fontSize: 14, color: DARK, fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            fontSize: 13,
            color: MUTED,
            maxWidth: 160,
            textAlign: 'right',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {displayValue}
        </span>
        <span style={{ fontSize: 12, color: '#CBD5E1', fontWeight: 700 }}>{'>'}</span>
      </div>
    </button>
  );
}

export default function UserDashboard() {
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [bookings, setBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showInbox, setShowInbox] = useState(false);
  const [loading, setLoading] = useState(true);
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [applyingCode, setApplyingCode] = useState(false);
  const [usingCouponId, setUsingCouponId] = useState(null);
  const [threshold, setThreshold] = useState('15');
  const router = useRouter();
  const { logout } = useAuth();

  const handleApplyCode = async () => {
    const code = promoCodeInput.trim().toUpperCase();
    if (!code) return;
    
    setApplyingCode(true);
    try {
      const res = await fetch('/api/user/apply-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const data = await res.json();
      
      if (!res.ok) {
        alert(data.error || '套用失敗');
      } else {
        alert(data.message || '套用成功！');
        setPromoCodeInput('');
        // Reload page to reflect new referrer
        window.location.reload();
      }
    } catch (err) {
      alert('系統發生錯誤');
    } finally {
      setApplyingCode(false);
    }
  };

  const handleUseCoupon = async (couponId) => {
    if (!couponId) return;
    setUsingCouponId(couponId);
    try {
      const res = await fetch('/api/user/use-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couponId })
      });
      const data = await res.json();
      
      if (!res.ok) {
        alert(data.error || '套用失敗');
      } else {
        alert(data.message || '套用成功！');
        window.location.reload();
      }
    } catch (error) {
      console.error('Error using coupon:', error);
      alert('系統發生錯誤');
    } finally {
      setUsingCouponId(null);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const [profileRes, bookingsRes, settingsData, notificationsData] = await Promise.all([
          fetch('/api/auth/profile'),
          fetch('/api/bookings'),
          fetch('/api/admin/settings').then((res) => (res.ok ? res.json() : {})),
          fetch('/api/notifications').then((res) => (res.ok ? res.json() : { notifications: [] })),
        ]);

        if (!profileRes.ok) {
          router.push('/login');
          return;
        }

        const { profile: profileData } = await profileRes.json();
        if (profileData) {
          setProfile((prev) => ({ ...prev, ...profileData, coupons: Array.isArray(profileData.coupons) ? profileData.coupons : [] }));
        }

        if (bookingsRes.ok) {
          const { bookings: bookingData } = await bookingsRes.json();
          setBookings(Array.isArray(bookingData) ? bookingData : []);
        }

        if (settingsData.settings?.no_show_threshold) {
          setThreshold(String(settingsData.settings.no_show_threshold));
        }

        setNotifications(Array.isArray(notificationsData.notifications) ? notificationsData.notifications : []);
      } catch (error) {
        console.error('[USER DASHBOARD LOAD ERROR]', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const levelDiscount = `${profile.base_discount ?? ((profile.level ?? 1) * 5)}%`;
  const unreadCount = notifications.filter((notification) => !notification.is_read).length;

  const handleMarkAsRead = async (id, isGlobal) => {
    if (isGlobal) return;

    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, is_read: true } : item)));
    } catch (error) {
      console.error('[MARK NOTIFICATION READ ERROR]', error);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '70vh' }}>
        <p style={{ color: MUTED, fontSize: 15, fontWeight: 600 }}>載入使用者資料中...</p>
      </div>
    );
  }

  return (
    <div style={{ background: BG, minHeight: '100vh', paddingBottom: 100, position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 0' }}>
        <div style={{ fontSize: 13, color: MUTED, fontWeight: 700 }}>
          {profile.referred_by_name ? `(推薦人: ${profile.referred_by_name})` : ''}
        </div>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowInbox(true)}
            style={{
              background: CARD,
              border: 'none',
              borderRadius: '50%',
              width: 44,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: SHADOW,
            }}
          >
            <Mail size={20} color={DARK} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  background: '#EF4444',
                  color: '#FFF',
                  fontSize: 10,
                  fontWeight: 900,
                  minWidth: 18,
                  height: 18,
                  borderRadius: 9,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `2px solid ${BG}`,
                }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {showInbox && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.6)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              background: CARD,
              width: '100%',
              maxWidth: 480,
              height: '80vh',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px 24px',
                borderBottom: `1px solid ${BORDER}`,
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 900,
                  color: DARK,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Mail color={BLUE} size={20} />
                站內通知
              </h2>
              <button
                onClick={() => setShowInbox(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED }}
              >
                <X size={24} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 20, background: BG }}>
              {notifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <Mail size={48} color="#CBD5E1" style={{ margin: '0 auto 16px' }} />
                  <p style={{ margin: 0, color: MUTED, fontSize: 14, fontWeight: 600 }}>目前沒有通知</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {notifications.map((notification) => {
                    const isGlobal = notification.user_id === null;
                    return (
                      <div
                        key={notification.id}
                        onClick={() => !notification.is_read && handleMarkAsRead(notification.id, isGlobal)}
                        style={{
                          background: CARD,
                          borderRadius: 16,
                          padding: 16,
                          borderLeft: !notification.is_read ? `4px solid ${BLUE}` : '4px solid transparent',
                          boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                          cursor: !notification.is_read && !isGlobal ? 'pointer' : 'default',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            marginBottom: 6,
                            gap: 12,
                          }}
                        >
                          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: DARK }}>
                            {notification.title}
                          </h3>
                          <span style={{ fontSize: 11, color: MUTED, flexShrink: 0 }}>
                            {new Date(notification.created_at).toLocaleDateString('zh-TW')}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                          {notification.content}
                        </p>
                        {notification.discount_code && (
                          <div
                            style={{
                              marginTop: 12,
                              padding: '8px 12px',
                              background: '#F0FDF4',
                              border: '1px dashed #22C55E',
                              borderRadius: 8,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 12,
                              flexWrap: 'wrap',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 12, color: '#166534', fontWeight: 800 }}>折扣碼</span>
                              <span style={{ fontSize: 14, color: '#15803D', fontWeight: 900, letterSpacing: 1 }}>
                                {notification.discount_code}
                              </span>
                            </div>
                            {notification.discount_percent && (
                              <span
                                style={{
                                  fontSize: 12,
                                  background: '#DCFCE7',
                                  color: '#166534',
                                  padding: '2px 8px',
                                  borderRadius: 12,
                                  fontWeight: 900,
                                }}
                              >
                                {notification.discount_percent}% OFF
                              </span>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPromoCodeInput(notification.discount_code);
                                setShowInbox(false);
                                setTimeout(() => {
                                  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                                }, 100);
                              }}
                              style={{
                                background: '#16A34A',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 6,
                                padding: '4px 12px',
                                fontSize: 13,
                                fontWeight: 800,
                                cursor: 'pointer',
                                transition: '0.2s',
                                marginLeft: 4,
                              }}
                            >
                              使用
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: '20px 16px 0' }}>
        <SectionLabel>我的帳號</SectionLabel>
        <div style={{ background: CARD, borderRadius: RADIUS, boxShadow: SHADOW, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 20px 0' }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${BLUE}, #3B82F6)`,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                fontWeight: 900,
                flexShrink: 0,
                boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
                overflow: 'hidden',
              }}
            >
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.name || 'avatar'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                profile.name?.charAt(0) ?? 'U'
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: DARK }}>{profile.name || '未命名使用者'}</p>
              <p
                style={{
                  margin: '3px 0 0',
                  fontSize: 12,
                  color: MUTED,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {profile.email || '-'}
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: BORDER, margin: '16px 0 0', borderTop: `1px solid ${BORDER}` }}>
            {[
              { label: '會員等級', value: `Lv ${profile.level ?? 1}`, color: BLUE },
              { label: '等級折扣', value: `${levelDiscount} OFF`, color: '#059669' },
            ].map((item) => (
              <div key={item.label} style={{ background: CARD, padding: '14px 0', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 11, color: MUTED, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  {item.label}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 19, fontWeight: 900, color: item.color }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: '20px 16px 0' }}>
        <PromotionCard user={profile} />
      </div>

      <div style={{ padding: '20px 16px 0' }}>
        <SectionLabel>優惠與錢包</SectionLabel>
        <div style={{ background: CARD, borderRadius: RADIUS, boxShadow: SHADOW, overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                background: '#EFF6FF',
                color: BLUE,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Wallet size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 800, color: DARK }}>可用優惠資訊</div>
              <div style={{ color: MUTED, fontSize: 13, marginTop: 2 }}>
                目前尚未建立正式優惠券系統，請先以站內通知中的折扣碼為主。
              </div>
            </div>
          </div>
          <div style={{ padding: '24px 20px', textAlign: 'center' }}>
            {Array.isArray(profile.coupons) && profile.coupons.length > 0 ? (
              <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
                {profile.coupons.map((coupon) => (
                  <div
                    key={coupon.id}
                    style={{
                      minWidth: 150,
                      background: '#F8FAFC',
                      borderRadius: 16,
                      padding: '16px 18px',
                      borderTop: `3px solid ${BLUE}`,
                      textAlign: 'left',
                      flexShrink: 0,
                    }}
                  >
                    <p style={{ margin: 0, fontSize: 26, fontWeight: 900, color: BLUE }}>{coupon.discount}%</p>
                    <p style={{ margin: '4px 0 2px', fontSize: 13, fontWeight: 700, color: DARK }}>{coupon.label}</p>
                    <p style={{ margin: 0, fontSize: 11, color: MUTED, marginBottom: 12 }}>到期日：{coupon.expires}</p>
                    
                    <button
                      onClick={() => handleUseCoupon(coupon.id)}
                      disabled={usingCouponId === coupon.id || profile.active_coupon?.id === coupon.id}
                      style={{
                        width: '100%',
                        padding: '8px 0',
                        background: profile.active_coupon?.id === coupon.id ? '#10B981' : BLUE,
                        color: 'white',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: profile.active_coupon?.id === coupon.id ? 'default' : 'pointer',
                        opacity: usingCouponId === coupon.id ? 0.7 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6
                      }}
                    >
                      {usingCouponId === coupon.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : null}
                      {profile.active_coupon?.id === coupon.id ? '使用中' : '使用'}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <p style={{ margin: 0, color: DARK, fontWeight: 700 }}>目前沒有可直接套用的優惠券</p>
                <p style={{ margin: '8px 0 0', color: MUTED, fontSize: 13 }}>
                  若平台發送折扣活動，你會在右上角通知中看到折扣碼與使用說明。
                </p>
              </>
            )}

            <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="輸入優惠碼或推薦人推廣碼"
                value={promoCodeInput}
                onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 700,
                  outline: 'none',
                  color: DARK,
                }}
              />
              <button
                onClick={handleApplyCode}
                disabled={applyingCode || !promoCodeInput.trim()}
                style={{
                  padding: '0 20px',
                  background: promoCodeInput.trim() ? BLUE : '#cbd5e1',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 12,
                  fontWeight: 800,
                  fontSize: 14,
                  cursor: promoCodeInput.trim() ? 'pointer' : 'not-allowed',
                  transition: '0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                {applyingCode ? <Loader2 size={16} className="animate-spin" /> : '套用'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
          <SectionLabel>個人資料</SectionLabel>
          <button
            style={{ fontSize: 12, fontWeight: 700, color: BLUE, background: 'none', border: 'none', padding: 0, cursor: 'pointer', marginBottom: 8 }}
            onClick={() => router.push('/dashboard/user/edit')}
          >
            編輯
          </button>
        </div>
        <div style={{ background: CARD, borderRadius: RADIUS, boxShadow: SHADOW, overflow: 'hidden' }}>
          <SettingRow icon="📞" label="手機號碼" value={profile.phone} onClick={() => router.push('/dashboard/user/edit')} />
          <SettingRow icon="📍" label="地址" value={profile.address} onClick={() => router.push('/dashboard/user/edit')} />
          <SettingRow icon="🌐" label="語言" value={profile.language ?? '中文'} onClick={() => router.push('/dashboard/user/edit')} />
          <SettingRow icon="🎯" label="學習目標" value={profile.learning_goals} onClick={() => router.push('/dashboard/user/edit')} />
        </div>
      </div>

      <div style={{ padding: '20px 16px 0' }}>
        <SectionLabel>最近預約</SectionLabel>
        <div style={{ background: CARD, borderRadius: RADIUS, boxShadow: SHADOW, overflow: 'hidden' }}>
          {bookings.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: 36, margin: '0 0 8px' }}>📅</p>
              <p style={{ margin: 0, fontSize: 14, color: MUTED, fontWeight: 500 }}>目前還沒有預約紀錄</p>
              <button
                onClick={() => router.push('/coaches')}
                style={{
                  marginTop: 16,
                  padding: '10px 28px',
                  background: BLUE,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                開始找教練
              </button>
            </div>
          ) : (
            bookings.slice(0, 4).map((booking) => {
              const status = bookingStatus(booking.status);
              return (
                <div
                  key={booking.id}
                  onClick={() => router.push('/bookings')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    borderBottom: `1px solid ${BORDER}`,
                    cursor: 'pointer',
                    gap: 12,
                  }}
                >
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: DARK }}>
                      {booking.coach_name ?? `教練 #${booking.coach_id?.substring(0, 6)}`}
                    </p>
                    <p style={{ margin: '3px 0 0', fontSize: 12, color: MUTED }}>
                      {booking.expected_time ? new Date(booking.expected_time).toLocaleDateString('zh-TW') : '尚未安排時間'}
                      {' ・ '}
                      NT${booking.final_price ?? booking.base_price ?? 0}
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: 100,
                      background: status.bg,
                      color: status.color,
                      flexShrink: 0,
                    }}
                  >
                    {status.label}
                  </span>
                </div>
              );
            })
          )}
        </div>
        <p style={{ marginTop: 12, fontSize: 11, color: MUTED, display: 'flex', flexDirection: 'column', gap: 4, padding: '0 4px', lineHeight: 1.5 }}>
          <span>付款後系統會先保留時段，待管理員確認後才會轉為正式排程。</span>
          <span style={{ color: '#F59E0B', fontWeight: 700 }}>
            若超過 {threshold} 分鐘未完成付款或回報，預留時段可能會自動釋出。
          </span>
        </p>
      </div>

      <div style={{ padding: '28px 16px 0' }}>
        <button
          onClick={logout}
          style={{
            width: '100%',
            padding: 14,
            background: '#F1F5F9',
            border: 'none',
            borderRadius: 16,
            color: '#64748B',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          登出
        </button>
      </div>
    </div>
  );
}
