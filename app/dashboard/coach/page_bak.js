'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import {
  Menu,
  CheckCircle2,
  Copy,
  QrCode,
  ShoppingCart,
  User,
  Shield,
  Bell,
  Globe,
  ArrowUpRight,
  CreditCard,
  LogOut,
  ChevronRight,
  Wallet,
  Clock,
  MessageCircle,
  FileText
} from 'lucide-react';
import VideoUpload from '@/components/VideoUpload';

const BG = '#090E17';
const CARD = '#121826';
const ORANGE = '#F97316';
const MUTED = '#94A3B8';
const DARK_ORANGE = '#9A3412';
const TEXT_LIGHT = '#F8FAFC';

export default function CoachDashboard() {
  const [profile, setProfile] = useState(null);
  const [coachDetail, setCoachDetail] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [chatRooms, setChatRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { logout } = useAuth();

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      fetch('/api/auth/profile'),
      fetch('/api/bookings'),
      fetch('/api/chat/rooms')
    ])
      .then(async ([profileRes, bookingsRes, roomsRes]) => {
        if (!profileRes.ok) {
          router.push('/login');
          return;
        }

        const [profileData, bookingsData, roomsData] = await Promise.all([
          profileRes.json(),
          bookingsRes.ok ? bookingsRes.json() : Promise.resolve({ bookings: [] }),
          roomsRes.ok ? roomsRes.json() : Promise.resolve({ rooms: [] })
        ]);

        if (!isMounted) return;

        setProfile(profileData.profile || null);
        setCoachDetail(profileData.coach || null);
        setBookings(Array.isArray(bookingsData.bookings) ? bookingsData.bookings : []);
        setChatRooms(Array.isArray(roomsData.rooms) ? roomsData.rooms : []);
      })
      .catch((error) => {
        console.error('[COACH DASHBOARD LOAD ERROR]', error);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: BG }}>
        <p style={{ color: ORANGE, fontSize: 15, fontWeight: 800 }}>Loading Dashboard...</p>
      </div>
    );
  }

  const pendingMessages = chatRooms.reduce((sum, room) => sum + (room.unread_count || 0), 0);
  const netEarnings = bookings.reduce(
    (sum, booking) => (booking.status === 'completed' ? sum + (booking.coach_payout || 0) : sum),
    0
  );
  
  const referralCode = `UNICOACH-${profile?.name?.toUpperCase() || 'COACH'}`;

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
              PRO COACH
            </h1>
          </div>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', border: `2px solid ${MUTED}`
          }}>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: CARD, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED, fontWeight: 800 }}>
                {profile?.name?.charAt(0) ?? 'C'}
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
                <span style={{ fontSize: 32, fontWeight: 900, color: MUTED }}>{profile?.name?.charAt(0) ?? 'C'}</span>
              )}
            </div>
            {coachDetail?.approval_status === 'approved' && (
              <div style={{
                position: 'absolute', bottom: 0, right: 0, background: ORANGE, borderRadius: '50%', padding: 4,
                border: `2px solid ${BG}`
              }}>
                <CheckCircle2 size={16} color={TEXT_LIGHT} />
              </div>
            )}
          </div>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 900, letterSpacing: '0.02em' }}>
            {profile?.name?.toUpperCase() || 'COACH'}
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
              ELITE
            </p>
            <p style={{ margin: 0, fontSize: 12, color: MUTED, fontWeight: 600 }}>Level {coachDetail?.level || 4} Coach</p>
          </div>
          <div style={{ background: CARD, borderRadius: 16, padding: '20px 16px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              DISCOUNT
            </p>
            <p style={{ margin: '8px 0 4px', fontSize: 24, fontWeight: 900 }}>
              15%
            </p>
            <p style={{ margin: 0, fontSize: 12, color: MUTED, fontWeight: 600 }}>Active Perks</p>
          </div>
        </div>

        {/* Wallet Balance Card */}
        <div style={{ background: CARD, borderRadius: 16, padding: '20px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Wallet size={16} color={ORANGE} />
              <span style={{ fontSize: 11, fontWeight: 800, color: MUTED, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                WALLET BALANCE
              </span>
            </div>
            <span style={{ fontSize: 22, fontWeight: 900 }}>
              ${netEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button style={{
              flex: 1, padding: '12px', background: ORANGE, color: TEXT_LIGHT, borderRadius: 12,
              fontWeight: 800, fontSize: 14, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
            }}>
              Top Up
            </button>
            <button onClick={() => router.push('/dashboard/coach/earnings')} style={{
              flex: 1, padding: '12px', background: 'transparent', color: TEXT_LIGHT, borderRadius: 12,
              fontWeight: 800, fontSize: 14, border: `1px solid ${MUTED}`, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
            }}>
              <Clock size={16} /> Details
            </button>
          </div>
        </div>

        {/* Refer a Fellow Coach */}
        <div style={{
          background: `linear-gradient(180deg, #1A1108 0%, ${CARD} 100%)`,
          borderRadius: 16, padding: '24px 20px', border: `1px solid ${DARK_ORANGE}`, marginBottom: 32,
          position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: '#FFEDD5' }}>Refer a Fellow Coach</h3>
            <p style={{ margin: '0 0 20px', fontSize: 12, color: '#FDBA74', lineHeight: 1.5, maxWidth: '80%' }}>
              Earn $50 for every coach who joins the Elite Circle using your link.
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
                  +12
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

        {/* Video Upload Section */}
        <div style={{ marginBottom: 32 }}>
          <VideoUpload />
        </div>

        {/* ACCOUNT SETTINGS */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ margin: '0 0 16px', fontSize: 11, fontWeight: 800, color: MUTED, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            ACCOUNT SETTINGS
          </p>
          <div style={{ background: CARD, borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
            {[
              { icon: User, label: 'Personal Information', onClick: () => router.push('/coach/profile/edit') },
              { icon: Shield, label: 'Security & Password', onClick: () => router.push('/coach/profile/edit') },
              { icon: Clock, label: 'Schedule Settings', onClick: () => router.push('/coach/schedule') },
              { icon: MessageCircle, label: `Notifications (${pendingMessages} Unread)`, onClick: () => router.push('/chat') },
              { icon: FileText, label: 'Manage Plans', onClick: () => router.push('/coach/plans') },
              { icon: Globe, label: 'Language Preference', right: 'English' }
            ].map((item, idx) => (
              <div key={item.label} onClick={item.onClick} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px',
                borderBottom: idx === 5 ? 'none' : '1px solid rgba(255,255,255,0.05)', cursor: item.onClick ? 'pointer' : 'default'
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
              RECENT ACTIVITY
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
                    width: 40, height: 40, borderRadius: 10, background: idx === 0 ? 'rgba(249, 115, 22, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: idx === 0 ? ORANGE : '#3B82F6'
                  }}>
                    {idx === 0 ? <ArrowUpRight size={20} /> : <CreditCard size={20} />}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{booking.user_name || 'Student'} Session</p>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: MUTED, fontStyle: 'italic' }}>
                      {booking.expected_time ? new Date(booking.expected_time).toLocaleDateString() : 'Pending'} • {booking.status === 'completed' ? 'Completed' : 'Pending'}
                    </p>
                  </div>
                </div>
                <span style={{ fontSize: 15, fontWeight: 800, color: booking.status === 'completed' ? '#10B981' : MUTED }}>
                  {booking.status === 'completed' ? '+' : ''}${booking.coach_payout || booking.final_price || booking.base_price || 0}
                </span>
              </div>
            ))}
            {bookings.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', background: CARD, borderRadius: 16 }}>
                <p style={{ margin: 0, color: MUTED, fontSize: 13 }}>No recent activity.</p>
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
