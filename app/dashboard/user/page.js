'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { getDashboardPathForRole } from '@/lib/authRedirects';
import { QRCodeSVG } from 'qrcode.react';
import {
  Menu,
  Copy,
  QrCode,
  User,
  Shield,
  Bell,
  Globe,
  ArrowUpRight,
  LogOut,
  ChevronRight,
  Wallet,
  Clock,
  MessageCircle,
  ShoppingBag,
  Ticket,
  X,
  Mail,
  Loader2,
  Check
} from 'lucide-react';

const BG = 'var(--color-bg)';
const CARD = 'var(--color-surface)';
const ORANGE = 'var(--color-accent)';
const MUTED = 'var(--color-text-muted)';
const DARK_ORANGE = 'var(--color-warning)';
const TEXT_LIGHT = 'var(--color-text)';
const BORDER = 'var(--color-border)';
const SHADOW = 'var(--shadow-card)';
const RADIUS = '20px';

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
  wallet_balance: 0,
  promotion_code: ''
};

const BOOKING_STATUS = {
  pending_payment: { label: '待付款', bg: 'rgba(245, 158, 11, 0.15)', color: 'var(--color-warning)' },
  scheduled: { label: '已排程', bg: 'rgba(96, 165, 250, 0.15)', color: 'var(--color-primary)' },
  in_progress: { label: '進行中', bg: 'rgba(245, 158, 11, 0.15)', color: 'var(--color-warning)' },
  completed: { label: '已完成', bg: 'rgba(34, 197, 94, 0.15)', color: 'var(--color-success)' },
  cancelled: { label: '已取消', bg: 'rgba(239, 68, 68, 0.15)', color: 'var(--color-danger)' },
};

function bookingStatus(status) {
  return BOOKING_STATUS[status] || { label: status || '未知', bg: 'var(--bg-input)', color: MUTED };
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

export default function UserDashboard() {
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [bookings, setBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showInbox, setShowInbox] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [loading, setLoading] = useState(true);
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [applyingCode, setApplyingCode] = useState(false);
  const [usingCouponId, setUsingCouponId] = useState(null);
  const [threshold, setThreshold] = useState('15');
  const [copiedCode, setCopiedCode] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [couponTab, setCouponTab] = useState('usable');
  const router = useRouter();
  const { logout } = useAuth();

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

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
        showToast(data.error || '套用失敗', 'error');
      } else {
        showToast(data.message || '套用成功！', 'success');
        setPromoCodeInput('');
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (err) {
      showToast('系統發生錯誤', 'error');
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
        showToast(data.error || '套用失敗', 'error');
      } else {
        showToast(data.message || '套用成功！', 'success');
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (error) {
      console.error('Error using coupon:', error);
      showToast('系統發生錯誤', 'error');
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
        if (!profileData) {
          router.replace('/login');
          return;
        }

        if (profileData.role !== 'user') {
          router.replace(getDashboardPathForRole(profileData.role));
          return;
        }

        setProfile((prev) => ({ ...prev, ...profileData, coupons: Array.isArray(profileData.coupons) ? profileData.coupons : [] }));

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

  const defaultDiscounts = { 1: 0, 2: 5, 3: 10, 4: 12 };
  const fallbackDiscount = defaultDiscounts[profile.level ?? 1] ?? 12;
  const levelDiscount = `${profile.base_discount ?? fallbackDiscount}%`;
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

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(profile.promotion_code || '');
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (error) {
      console.error('[COPY ERROR]', error);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: BG }}>
        <Loader2 className="animate-spin" size={32} color={ORANGE} />
      </div>
    );
  }

  const promotionUrl = typeof window !== 'undefined' && profile.promotion_code
    ? `${window.location.origin}/register?ref=${profile.promotion_code}`
    : '';

  const now = new Date();
  const usableCoupons = [];
  const expiredCoupons = [];
  
  (profile.coupons || []).forEach(coupon => {
    if (coupon.expires && new Date(coupon.expires) < now) {
      expiredCoupons.push(coupon);
    } else {
      usableCoupons.push(coupon);
    }
  });

  return (
    <div style={{ background: BG, minHeight: '100vh', paddingBottom: 100, position: 'relative', color: TEXT_LIGHT, overflowX: 'hidden' }}>
      {/* Toast Notification */}
      {toast.show && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          background: toast.type === 'error' ? 'var(--color-danger)' : 'var(--color-success)', color: 'var(--text-light)',
          padding: '12px 24px', borderRadius: 100, fontSize: 14, fontWeight: 800,
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', gap: 8,
          animation: 'fadeInDown 0.3s ease-out'
        }}>
          {toast.type === 'error' ? <X size={16} /> : <Check size={16} />}
          {toast.message}
        </div>
      )}
      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translate(-50%, -20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>

      {/* Background Gradient Effect */}
      <div style={{
        position: 'absolute', top: -100, left: '50%', transform: 'translateX(-50%)',
        width: '600px', height: '600px',
        background: 'radial-gradient(circle, rgba(249, 115, 22, 0.1) 0%, rgba(9, 14, 23, 0) 60%)',
        zIndex: 0, pointerEvents: 'none'
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 0' }}>
          <div style={{ fontSize: 13, color: MUTED, fontWeight: 700, display: 'flex', gap: 8, alignItems: 'center' }}>
            <button 
              onClick={() => setShowGuide(true)}
              style={{ background: 'var(--primary-bg)', color: 'var(--primary)', border: 'none', padding: '4px 10px', borderRadius: 100, fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              新手指南
            </button>
            {profile.referred_by_name ? `(推薦人: ${profile.referred_by_name})` : ''}
          </div>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowInbox(true)}
              style={{
                background: 'var(--color-surface)', border: `1px solid ${BORDER}`, borderRadius: '50%', width: 44, height: 44,
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: SHADOW,
              }}
            >
              <Mail size={20} color={TEXT_LIGHT} />
              {unreadCount > 0 && (
                <span
                  style={{
                    position: 'absolute', top: 0, right: 0, background: 'var(--color-danger)', color: 'var(--text-light)',
                    fontSize: 10, fontWeight: 900, minWidth: 18, height: 18, borderRadius: 9,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${CARD}`,
                  }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* 新手指南 Modal */}
        {showGuide && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(9,14,23,0.8)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div style={{ background: 'var(--color-surface)', width: '100%', maxWidth: 400, borderRadius: 24, overflow: 'hidden', border: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: `1px solid ${BORDER}` }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: TEXT_LIGHT }}>新手快速指南</h2>
                <button onClick={() => setShowGuide(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED }}>
                  <X size={24} />
                </button>
              </div>
              <div style={{ padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 16, background: 'rgba(245, 158, 11, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, flexShrink: 0 }}>1</div>
                  <div>
                    <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800 }}>尋找教練</h3>
                    <p style={{ margin: 0, fontSize: 13, color: MUTED, lineHeight: 1.5 }}>在首頁或找教練頁面，篩選你想要的教學項目、時間與地區。</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 16, background: 'rgba(245, 158, 11, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, flexShrink: 0 }}>2</div>
                  <div>
                    <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800 }}>先聊聊再決定</h3>
                    <p style={{ margin: 0, fontSize: 13, color: MUTED, lineHeight: 1.5 }}>不確定教練適不適合？點擊教練頁面的「先聊聊」按鈕，直接與教練確認上課細節。</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 16, background: 'rgba(245, 158, 11, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, flexShrink: 0 }}>3</div>
                  <div>
                    <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800 }}>選擇時段與預約</h3>
                    <p style={{ margin: 0, fontSize: 13, color: MUTED, lineHeight: 1.5 }}>選定教練後，直接點選教練有空的時段，送出預約並完成付款。</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 16, background: 'rgba(245, 158, 11, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, flexShrink: 0 }}>4</div>
                  <div>
                    <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800 }}>分享賺取回饋</h3>
                    <p style={{ margin: 0, fontSize: 13, color: MUTED, lineHeight: 1.5 }}>分享你的專屬推廣碼給朋友，他們完成註冊與預約後，你就能獲得推廣獎勵！</p>
                  </div>
                </div>
              </div>
              <div style={{ padding: 20, borderTop: `1px solid ${BORDER}` }}>
                <button onClick={() => setShowGuide(false)} style={{ width: '100%', padding: '14px', background: 'var(--primary)', color: 'var(--text-light)', borderRadius: 100, border: 'none', fontSize: 15, fontWeight: 900, cursor: 'pointer' }}>
                  我了解了
                </button>
              </div>
            </div>
          </div>
        )}

        {showInbox && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(9,14,23,0.8)', backdropFilter: 'blur(4px)', zIndex: 999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <div style={{ background: 'var(--color-surface)', width: '100%', maxWidth: 480, height: '80vh', borderTopLeftRadius: 24, borderTopRightRadius: 24, display: 'flex', flexDirection: 'column', overflow: 'hidden', border: `1px solid ${BORDER}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: `1px solid ${BORDER}` }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: TEXT_LIGHT, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Mail color={ORANGE} size={20} /> 站內通知
                </h2>
                <button onClick={() => setShowInbox(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED }}>
                  <X size={24} />
                </button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: 20, background: BG }}>
                {notifications.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <Mail size={48} color={MUTED} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
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
                            background: 'var(--color-surface)', borderRadius: 16, padding: 16,
                            borderLeft: !notification.is_read ? `4px solid ${ORANGE}` : '4px solid transparent',
                            boxShadow: SHADOW, cursor: !notification.is_read && !isGlobal ? 'pointer' : 'default',
                            border: `1px solid ${BORDER}`
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: 12 }}>
                            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: TEXT_LIGHT }}>{notification.title}</h3>
                            <span style={{ fontSize: 11, color: MUTED, flexShrink: 0 }}>
                              {new Date(notification.created_at).toLocaleDateString('zh-TW')}
                            </span>
                          </div>
                          <p style={{ margin: 0, fontSize: 13, color: MUTED, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                            {notification.content}
                          </p>
                          {notification.discount_code && (
                            <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px dashed #10B981', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 12, color: '#34D399', fontWeight: 800 }}>折扣碼</span>
                                <span style={{ fontSize: 14, color: '#10B981', fontWeight: 900, letterSpacing: 1 }}>{notification.discount_code}</span>
                              </div>
                              {notification.discount_percent && (
                                <span style={{ fontSize: 12, background: 'rgba(16, 185, 129, 0.2)', color: '#34D399', padding: '2px 8px', borderRadius: 12, fontWeight: 900 }}>
                                  {notification.discount_percent}% OFF
                               </span>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPromoCodeInput(notification.discount_code);
                                  setShowInbox(false);
                                  setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100);
                                }}
                                style={{ background: '#10B981', color: 'var(--text-light)', border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: 13, fontWeight: 800, cursor: 'pointer', transition: '0.2s', marginLeft: 4 }}
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
          <div style={{ background: 'var(--color-surface)', borderRadius: RADIUS, boxShadow: SHADOW, overflow: 'hidden', border: `1px solid ${BORDER}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 20px 0' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: `linear-gradient(135deg, ${ORANGE}, #FDBA74)`, color: 'var(--text-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, flexShrink: 0, boxShadow: `0 0 15px rgba(249, 115, 22, 0.3)`, overflow: 'hidden', border: `2px solid ${CARD}` }}>
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.name || 'avatar'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  profile.name?.charAt(0) ?? 'U'
                )}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: TEXT_LIGHT }}>{profile.name || '未命名使用者'}</p>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {profile.email || '-'}
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: BORDER, margin: '16px 0 0', borderTop: `1px solid ${BORDER}` }}>
              {[
                { label: '會員等級', value: `Lv ${profile.level ?? 1}`, color: ORANGE },
                { label: '等級折扣', value: `${levelDiscount} OFF`, color: 'var(--color-success)' },
              ].map((item) => (
                <div key={item.label} style={{ background: 'var(--color-surface)', padding: '14px 0', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: 11, color: MUTED, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{item.label}</p>
                  <p style={{ margin: '4px 0 0', fontSize: 19, fontWeight: 900, color: item.color }}>{item.value}</p>
                </div>
              ))}
            </div>
            <div style={{ background: 'var(--color-surface)', padding: '10px 16px', textAlign: 'center', borderTop: `1px solid ${BORDER}` }}>
              <p style={{ margin: 0, fontSize: 11, color: MUTED }}>此折扣將在預約時<span style={{ color: ORANGE, fontWeight: 700 }}>自動套用</span></p>
            </div>
          </div>
        </div>

        {/* ── REFERRAL CARD (Integrated directly into dashboard) ── */}
        <div style={{ padding: '20px 16px 0' }}>
          <div style={{ background: 'var(--color-surface)', borderRadius: RADIUS, padding: 24, boxShadow: SHADOW, display: 'flex', flexDirection: 'column', gap: 24, border: `1px solid ${BORDER}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--color-surface-soft)', border: '1px solid var(--color-border)', padding: '16px 20px', borderRadius: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.1)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Wallet size={20} color={ORANGE} />
                </div>
                <div>
                  <div style={{ fontSize: 13, color: MUTED, fontWeight: 700, letterSpacing: '0.05em' }}>推廣錢包餘額</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: TEXT_LIGHT }}>NT$ {(profile.wallet_balance || 0).toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>僅用於上課</div>
                </div>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 800, color: MUTED, marginBottom: 8, display: 'block' }}>我的推廣碼</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  readOnly
                  value={profile.promotion_code || '尚未建立'}
                  style={{ flex: 1, padding: '12px 16px', background: 'var(--color-surface-soft)', border: `1px solid ${BORDER}`, borderRadius: 12, fontSize: 18, fontWeight: 900, color: TEXT_LIGHT, letterSpacing: '0.1em', textAlign: 'center' }}
                />
                {profile.promotion_code && (
                  <button onClick={handleCopyCode} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', background: copiedCode ? 'var(--color-success)' : 'var(--color-surface-soft)', color: copiedCode ? 'var(--text-light)' : ORANGE, border: 'none', borderRadius: 12, cursor: 'pointer', transition: '0.2s', fontWeight: 800 }}>
                    {copiedCode ? <Check size={18} /> : <Copy size={18} />}
                  </button>
                )}
              </div>
              <p style={{ fontSize: 12, color: MUTED, marginTop: 8, lineHeight: 1.5 }}>
                分享這個代碼或下方 QR Code 給朋友。他們註冊並完成付款後，系統會自動發放推廣獎勵到這個錢包！
              </p>
            </div>

            {promotionUrl && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--color-surface-soft)', borderRadius: 20, border: `1px solid ${BORDER}` }}>
                <label style={{ fontSize: 13, fontWeight: 800, color: TEXT_LIGHT, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: ORANGE }}>✨</span> 推廣專屬 QR Code
                </label>
                <div style={{ background: 'var(--color-surface)', padding: 14, borderRadius: 18, boxShadow: `0 8px 24px rgba(249, 115, 22, 0.15)`, border: '1px solid rgba(226, 232, 240, 0.8)' }}>
                  <QRCodeSVG
                    value={promotionUrl}
                    size={160}
                    level="H"
                    imageSettings={{
                      src: '/apple-touch-icon.png',
                      x: undefined, y: undefined, height: 32, width: 32, excavate: true,
                    }}
                  />
                </div>
                <div style={{ fontSize: 12, color: MUTED, marginTop: 12, fontWeight: 700 }}>
                  可直接讓對方掃碼註冊與進站
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: '20px 16px 0' }}>
          <SectionLabel>優惠與折扣管理</SectionLabel>
          <div style={{ background: 'var(--color-surface)', borderRadius: RADIUS, boxShadow: SHADOW, overflow: 'hidden', border: `1px solid ${BORDER}` }}>
            
            {/* Promo Code Input Area */}
            <div style={{ padding: '20px', borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ fontWeight: 800, color: TEXT_LIGHT, marginBottom: 12 }}>輸入優惠碼或推薦碼</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="請輸入代碼"
                  value={promoCodeInput}
                  onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                  style={{ flex: 1, padding: '12px 16px', background: 'var(--color-surface-soft)', border: `1px solid ${BORDER}`, borderRadius: 12, fontSize: 14, fontWeight: 700, outline: 'none', color: TEXT_LIGHT }}
                />
                <button
                  onClick={handleApplyCode}
                  disabled={applyingCode || !promoCodeInput.trim()}
                  style={{ padding: '0 20px', background: promoCodeInput.trim() ? ORANGE : 'var(--border-input)', color: 'var(--text-light)', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 14, cursor: promoCodeInput.trim() ? 'pointer' : 'not-allowed', transition: '0.2s', display: 'flex', alignItems: 'center', gap: 6, boxShadow: promoCodeInput.trim() ? `0 4px 14px rgba(249, 115, 22, 0.3)` : 'none' }}
                >
                  {applyingCode ? <Loader2 size={16} className="animate-spin" /> : '套用'}
                </button>
              </div>
            </div>

            {/* Discount Preview Area */}
            <div style={{ padding: '20px', background: 'var(--color-surface-soft)', borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ fontSize: 13, color: MUTED, fontWeight: 700, marginBottom: 12 }}>你目前可享：</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, color: TEXT_LIGHT, fontWeight: 600 }}>會員等級折扣（自動）</span>
                  <span style={{ fontSize: 14, color: 'var(--color-success)', fontWeight: 800 }}>{levelDiscount} OFF</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, color: TEXT_LIGHT, fontWeight: 600 }}>已選優惠券</span>
                  {profile.active_coupon ? (
                    <span style={{ fontSize: 14, color: ORANGE, fontWeight: 800 }}>
                      {profile.active_coupon.label} ({profile.active_coupon.discount}%)
                    </span>
                  ) : (
                    <span style={{ fontSize: 14, color: MUTED, fontWeight: 600 }}>無</span>
                  )}
                </div>
              </div>
              <div style={{ fontSize: 11, color: MUTED, marginTop: 12, textAlign: 'right' }}>
                * 實際折扣將於預約時套用
              </div>
            </div>

            {/* Coupon Section */}
            <div style={{ padding: '20px' }}>
              <div style={{ fontWeight: 800, color: TEXT_LIGHT, marginBottom: 16 }}>我的優惠券</div>
              
              {/* Tabs */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: `1px solid ${BORDER}`, paddingBottom: 12 }}>
                {[
                  { id: 'usable', label: '可使用' },
                  { id: 'used', label: '已使用' },
                  { id: 'expired', label: '已過期' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setCouponTab(tab.id)}
                    style={{
                      background: couponTab === tab.id ? 'rgba(249, 115, 22, 0.1)' : 'transparent',
                      color: couponTab === tab.id ? ORANGE : MUTED,
                      border: 'none', padding: '6px 12px', borderRadius: 100,
                      fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: '0.2s'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Coupon List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {couponTab === 'usable' && (
                  usableCoupons.length > 0 ? usableCoupons.map((coupon) => {
                    const isSelected = profile.active_coupon?.id === coupon.id;
                    return (
                      <div key={coupon.id} style={{ background: 'var(--color-surface-soft)', borderRadius: 16, padding: '16px', borderLeft: `4px solid ${ORANGE}`, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: ORANGE }}>{coupon.discount}%</p>
                            <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 800, color: TEXT_LIGHT }}>{coupon.label}</p>
                          </div>
                          <button
                            onClick={() => handleUseCoupon(coupon.id)}
                            disabled={usingCouponId === coupon.id || isSelected}
                            style={{
                              padding: '6px 14px', background: isSelected ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
                              color: isSelected ? 'var(--color-success)' : ORANGE, border: `1.5px solid ${isSelected ? 'var(--color-success)' : ORANGE}`,
                              borderRadius: 100, fontSize: 12, fontWeight: 800,
                              cursor: isSelected ? 'default' : 'pointer', opacity: usingCouponId === coupon.id ? 0.7 : 1,
                              display: 'flex', alignItems: 'center', gap: 4
                            }}
                          >
                            {usingCouponId === coupon.id ? <Loader2 size={12} className="animate-spin" /> : null}
                            {isSelected ? '已選擇 ✓' : '使用這張'}
                          </button>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px dashed ${BORDER}`, paddingTop: 10 }}>
                          <p style={{ margin: 0, fontSize: 11, color: MUTED }}>到期日：{coupon.expires || '無期限'}</p>
                          <p style={{ margin: 0, fontSize: 11, color: MUTED }}>無特殊條件限制</p>
                        </div>
                      </div>
                    );
                  }) : (
                    <div style={{ textAlign: 'center', padding: '30px 0' }}>
                      <Ticket size={40} color={MUTED} style={{ opacity: 0.5, marginBottom: 12 }} />
                      <p style={{ margin: 0, color: TEXT_LIGHT, fontWeight: 700 }}>目前沒有可使用的優惠券</p>
                    </div>
                  )
                )}

                {couponTab === 'used' && (
                  <div style={{ textAlign: 'center', padding: '30px 0' }}>
                    <Ticket size={40} color={MUTED} style={{ opacity: 0.3, marginBottom: 12 }} />
                    <p style={{ margin: 0, color: MUTED, fontWeight: 600 }}>目前沒有已使用的優惠券</p>
                  </div>
                )}

                {couponTab === 'expired' && (
                  expiredCoupons.length > 0 ? expiredCoupons.map((coupon) => (
                    <div key={coupon.id} style={{ background: 'var(--color-surface-soft)', borderRadius: 16, padding: '16px', borderLeft: `4px solid ${MUTED}`, opacity: 0.6, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: MUTED }}>{coupon.discount}%</p>
                          <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 800, color: MUTED }}>{coupon.label}</p>
                        </div>
                        <div style={{ padding: '6px 14px', background: 'transparent', color: MUTED, border: `1.5px solid ${MUTED}`, borderRadius: 100, fontSize: 12, fontWeight: 800 }}>
                          已過期
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px dashed ${BORDER}`, paddingTop: 10 }}>
                        <p style={{ margin: 0, fontSize: 11, color: MUTED }}>到期日：{coupon.expires}</p>
                      </div>
                    </div>
                  )) : (
                    <div style={{ textAlign: 'center', padding: '30px 0' }}>
                      <Ticket size={40} color={MUTED} style={{ opacity: 0.3, marginBottom: 12 }} />
                      <p style={{ margin: 0, color: MUTED, fontWeight: 600 }}>目前沒有已過期的優惠券</p>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '20px 16px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
            <SectionLabel>個人資料</SectionLabel>
            <button style={{ fontSize: 12, fontWeight: 700, color: ORANGE, background: 'none', border: 'none', padding: 0, cursor: 'pointer', marginBottom: 8 }} onClick={() => router.push('/dashboard/user/edit')}>
              編輯
            </button>
          </div>
          <div style={{ background: 'var(--color-surface)', borderRadius: RADIUS, boxShadow: SHADOW, overflow: 'hidden', border: `1px solid ${BORDER}` }}>
            {[
              { icon: '📞', label: '手機號碼', value: profile.phone },
              { icon: '📍', label: '地址', value: profile.address },
              { icon: '🌐', label: '語言', value: profile.language ?? '中文' },
              { icon: '🎯', label: '學習目標', value: profile.learning_goals },
            ].map((item, idx) => (
              <button key={item.label} onClick={() => router.push('/dashboard/user/edit')} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 18px', border: 'none', borderBottom: idx === 3 ? 'none' : `1px solid ${BORDER}`, background: 'var(--color-surface)', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{item.icon}</span>
                  <span style={{ fontSize: 14, color: TEXT_LIGHT, fontWeight: 600 }}>{item.label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, color: MUTED, maxWidth: 160, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.value || '尚未填寫'}
                  </span>
                  <span style={{ fontSize: 12, color: MUTED, fontWeight: 700 }}>{'>'}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: '20px 16px 0' }}>
          <SectionLabel>最近預約</SectionLabel>
          <div style={{ background: 'var(--color-surface)', borderRadius: RADIUS, boxShadow: SHADOW, overflow: 'hidden', border: `1px solid ${BORDER}` }}>
            {bookings.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                <p style={{ fontSize: 36, margin: '0 0 8px' }}>📅</p>
                <p style={{ margin: 0, fontSize: 14, color: MUTED, fontWeight: 500 }}>目前還沒有預約紀錄</p>
                <button onClick={() => router.push('/coaches')} style={{ marginTop: 16, padding: '10px 28px', background: ORANGE, color: 'var(--text-light)', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: `0 4px 14px rgba(249, 115, 22, 0.3)` }}>
                  開始找教練
                </button>
              </div>
            ) : (
              bookings.slice(0, 4).map((booking, idx) => {
                const status = bookingStatus(booking.status);
                return (
                  <div key={booking.id} onClick={() => router.push('/bookings')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: idx === bookings.length - 1 ? 'none' : `1px solid ${BORDER}`, cursor: 'pointer', gap: 12 }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: TEXT_LIGHT }}>
                        {booking.coach_name ?? `教練 #${booking.coach_id?.substring(0, 6)}`}
                      </p>
                      <p style={{ margin: '3px 0 0', fontSize: 12, color: MUTED }}>
                        {booking.expected_time ? new Date(booking.expected_time).toLocaleDateString('zh-TW') : '尚未安排時間'}
                        {' ・ '}
                        NT${booking.final_price ?? booking.base_price ?? 0}
                      </p>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 100, background: status.bg, color: status.color, flexShrink: 0 }}>
                      {status.label}
                    </span>
                  </div>
                );
              })
            )}
          </div>
          <p style={{ marginTop: 12, fontSize: 11, color: MUTED, display: 'flex', flexDirection: 'column', gap: 4, padding: '0 4px', lineHeight: 1.5 }}>
            <span>付款後系統會先保留時段，待管理員確認後才會轉為正式排程。</span>
            <span style={{ color: ORANGE, fontWeight: 700 }}>
              若超過 {threshold} 分鐘未完成付款或回報，預留時段可能會自動釋出。
            </span>
          </p>
        </div>

        <div style={{ padding: '28px 16px 0' }}>
          <button onClick={logout} style={{ width: '100%', padding: 14, background: 'var(--color-surface-soft)', borderRadius: 16, color: 'var(--color-danger)', fontWeight: 800, fontSize: 14, cursor: 'pointer', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            登出
          </button>
        </div>
      </div>
    </div>
  );
}
