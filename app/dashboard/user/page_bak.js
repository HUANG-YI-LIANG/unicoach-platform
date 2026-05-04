'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
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
  Ticket
} from 'lucide-react';
import PromotionCard from '@/components/PromotionCard';

const BG = '#090E17';
const CARD = '#121826';
const ORANGE = '#F97316';
const MUTED = '#94A3B8';
const DARK_ORANGE = '#9A3412';
const TEXT_LIGHT = '#F8FAFC';

export default function UserDashboard() {
  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { logout } = useAuth();

  useEffect(() => {
    (async () => {
      try {
        const [profileRes, bookingsRes, notificationsData] = await Promise.all([
          fetch('/api/auth/profile'),
          fetch('/api/bookings'),
          fetch('/api/notifications').then((res) => (res.ok ? res.json() : { notifications: [] })),
        ]);

        if (!profileRes.ok) {
          router.push('/login');
          return;
        }

        const { profile: profileData } = await profileRes.json();
        if (profileData) {
          setProfile({ ...profileData, coupons: Array.isArray(profileData.coupons) ? profileData.coupons : [] });
        }

        if (bookingsRes.ok) {
          const { bookings: bookingData } = await bookingsRes.json();
          setBookings(Array.isArray(bookingData) ? bookingData : []);
        }

        setNotifications(Array.isArray(notificationsData.notifications) ? notificationsData.notifications : []);
      } catch (error) {
        console.error('[USER DASHBOARD LOAD ERROR]', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: BG }}>
        <p style={{ color: ORANGE, fontSize: 15, fontWeight: 800 }}>Loading Profile...</p>
      </div>
    );
  }

  const unreadCount = notifications.filter((notification) => !notification.is_read).length;
  const levelDiscount = `${profile?.base_discount ?? ((profile?.level ?? 1) * 5)}%`;
  const referralCode = `UNICOACH-${profile?.name?.toUpperCase() || 'USER'}`;

  return (
    <div style={{
      background: BG,
      minHeight: '100vh',
      paddingBottom: 100,
      color: TEXT_LIGHT,
      position: 'relative',
      overflowX: 'hidden'
    }}>
      {/* Background Gradient Effect */}
      <div style={{
        position: 'absolute',
        top: -100,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(249, 115, 22, 0.1) 0%, rgba(9, 14, 23, 0) 60%)',
        zIndex: 0,
        pointerEvents: 'none'
      }} />

      <div style={{ position: 'relative', zIndex: 1, padding: '24px 20px 0' }}>
        {/* Header */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button style={{ background: 'none', border: 'none', color: ORANGE, cursor: 'pointer', padding: 0 }}>
              <Menu size={24} />
            </button>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: ORANGE, fontStyle: 'italic', letterSpacing: '0.05em' }}>
              ELITE MEMBER
            </h1>
          </div>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', border: `2px solid ${MUTED}`
          }}>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: CARD, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED, fontWeight: 800 }}>
                {profile?.name?.charAt(0) ?? 'U'}
              </div>
            )}
          </div>
        </header>

        {/* Profile Avatar & Info */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <div style={{
              width: 100, height: 100, borderRadius: '50%', border: `3px solid ${ORANGE}`,
              overflow: 'hidden', background: CARD, display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 20px rgba(249, 115, 22, 0.3)`
            }}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 32, fontWeight: 900, color: MUTED }}>{profile?.name?.charAt(0) ?? 'U'}</span>
              )}
            </div>
          </div>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 900, letterSpacing: '0.02em' }}>
            {profile?.name?.toUpperCase() || 'USER'}
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: MUTED }}>{profile?.email}</p>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div style={{ background: CARD, borderRadius: 16, padding: '20px 16px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              MEMBER LEVEL
            </p>
            <p style={{ margin: '8px 0 4px', fontSize: 24, fontWeight: 900, color: ORANGE, letterSpacing: '0.05em' }}>
              Lv {profile?.level ?? 1}
            </p>
            <p style={{ margin: 0, fontSize: 12, color: MUTED, fontWeight: 600 }}>Active Member</p>
          </div>
          <div style={{ background: CARD, borderRadius: 16, padding: '20px 16px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              DISCOUNT
            </p>
            <p style={{ margin: '8px 0 4px', fontSize: 24, fontWeight: 900 }}>
              {levelDiscount}
            </p>
            <p style={{ margin: 0, fontSize: 12, color: MUTED, fontWeight: 600 }}>Active Perks</p>
          </div>
        </div>

        {/* Available Coupons */}
        <div style={{ background: CARD, borderRadius: 16, padding: '20px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Ticket size={16} color={ORANGE} />
              <span style={{ fontSize: 11, fontWeight: 800, color: MUTED, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                AVAILABLE COUPONS
              </span>
            </div>
            <span style={{ fontSize: 22, fontWeight: 900 }}>
              {profile?.coupons?.length || 0}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => router.push('/coaches')} style={{
              flex: 1, padding: '12px', background: ORANGE, color: TEXT_LIGHT, borderRadius: 12,
              fontWeight: 800, fontSize: 14, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
            }}>
              Find a Coach
            </button>
            <button onClick={() => alert('Coupon details.')} style={{
              flex: 1, padding: '12px', background: 'transparent', color: TEXT_LIGHT, borderRadius: 12,
              fontWeight: 800, fontSize: 14, border: `1px solid ${MUTED}`, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
            }}>
              <ShoppingBag size={16} /> Details
            </button>
          </div>
        </div>

        {/* Refer a Friend */}
        <div style={{
          background: `linear-gradient(180deg, #1A1108 0%, ${CARD} 100%)`,
          borderRadius: 16, padding: '24px 20px', border: `1px solid ${DARK_ORANGE}`, marginBottom: 32,
          position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: '#FFEDD5' }}>Refer a Friend</h3>
            <p style={{ margin: '0 0 20px', fontSize: 12, color: '#FDBA74', lineHeight: 1.5, maxWidth: '80%' }}>
              Invite your friends to UniCoach and earn exclusive rewards when they book their first session.
            </p>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: BG, padding: '12px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', marginBottom: 20 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: ORANGE, letterSpacing: '0.1em' }}>{referralCode}</span>
              <button style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer' }} onClick={() => navigator.clipboard.writeText(referralCode)}>
                <Copy size={18} />
              </button>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#334155', border: `2px solid ${CARD}`, marginLeft: 0, zIndex: 3 }} />
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#475569', border: `2px solid ${CARD}`, marginLeft: -10, zIndex: 2 }} />
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#64748B', border: `2px solid ${CARD}`, marginLeft: -10, zIndex: 1 }} />
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#1E293B', border: `2px solid ${CARD}`, marginLeft: -10, zIndex: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: MUTED }}>
                  +5
                </div>
              </div>
              <button style={{
                background: ORANGE, color: TEXT_LIGHT, border: 'none', padding: '8px 16px', borderRadius: 8,
                fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer'
              }}>
                <QrCode size={14} /> QR CODE
              </button>
            </div>
          </div>
        </div>

        {/* ACCOUNT SETTINGS */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ margin: '0 0 16px', fontSize: 11, fontWeight: 800, color: MUTED, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            ACCOUNT SETTINGS
          </p>
          <div style={{ background: CARD, borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
            {[
              { icon: User, label: 'Personal Information', onClick: () => router.push('/dashboard/user/edit') },
              { icon: Shield, label: 'Security & Password', onClick: () => router.push('/dashboard/user/edit') },
              { icon: MessageCircle, label: `Notifications (${unreadCount} Unread)`, onClick: () => setShowInbox(true) },
              { icon: Globe, label: 'Language Preference', right: 'English' }
            ].map((item, idx) => (
              <div key={item.label} onClick={item.onClick} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px',
                borderBottom: idx === 3 ? 'none' : '1px solid rgba(255,255,255,0.05)', cursor: item.onClick ? 'pointer' : 'default'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <item.icon size={18} color={MUTED} />
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{item.label}</span>
                </div>
                {item.right ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, color: MUTED, fontWeight: 600 }}>{item.right}</span>
                    <ChevronRight size={16} color={MUTED} />
                  </div>
                ) : (
                  <ChevronRight size={16} color={MUTED} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* RECENT ACTIVITY */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: MUTED, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              RECENT BOOKINGS
            </p>
            <button onClick={() => router.push('/bookings')} style={{ background: 'none', border: 'none', color: ORANGE, fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>
              SEE ALL
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {bookings.slice(0, 2).map((booking, idx) => (
              <div key={booking.id} onClick={() => router.push('/bookings')} style={{
                background: CARD, borderRadius: 16, padding: '16px 20px', border: '1px solid rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, background: 'rgba(249, 115, 22, 0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: ORANGE
                  }}>
                    <ArrowUpRight size={20} />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{booking.coach_name || 'Coach'} Session</p>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: MUTED, fontStyle: 'italic' }}>
                      {booking.expected_time ? new Date(booking.expected_time).toLocaleDateString() : 'Pending'} • {booking.status === 'completed' ? 'Completed' : 'Pending'}
                    </p>
                  </div>
                </div>
                <span style={{ fontSize: 15, fontWeight: 800, color: MUTED }}>
                  ${booking.final_price || booking.base_price || 0}
                </span>
              </div>
            ))}
            {bookings.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', background: CARD, borderRadius: 16 }}>
                <p style={{ margin: 0, color: MUTED, fontSize: 13 }}>No recent bookings.</p>
              </div>
            )}
          </div>
        </div>

        {/* SIGN OUT */}
        <div style={{ paddingBottom: 40 }}>
          <button onClick={logout} style={{
            width: '100%', padding: '16px', background: 'transparent', color: '#FCA5A5', border: '1px solid #7F1D1D',
            borderRadius: 16, fontSize: 14, fontWeight: 800, cursor: 'pointer', transition: '0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
          }}>
            SIGN OUT
          </button>
        </div>

      </div>
    </div>
  );
}
