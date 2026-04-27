'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import {
  CalendarDays,
  CheckCircle,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  Info,
  ListChecks,
  MessageCircle,
  Plus,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  TrendingUp,
  UserCircle,
  Wallet,
  X,
} from 'lucide-react';
import PromotionCard from '@/components/PromotionCard';
import VideoUpload from '@/components/VideoUpload';

const BLUE = '#2563EB';
const BG = '#F1F5F9';
const CARD = '#FFFFFF';
const BORDER = '#E2E8F0';
const MUTED = '#94A3B8';
const DARK = '#0F172A';
const RADIUS = '20px';
const SHADOW = '0 2px 16px rgba(0,0,0,0.06)';

const BOOKING_STATUS = {
  pending_payment: { label: '待付款', color: '#92400E' },
  scheduled: { label: '已排程', color: '#1D4ED8' },
  in_progress: { label: '進行中', color: '#854D0E' },
  pending_completion: { label: '待完課', color: '#7C3AED' },
  completed: { label: '已完成', color: '#059669' },
  cancelled: { label: '已取消', color: '#991B1B' },
};

function bookingStatus(status) {
  return BOOKING_STATUS[status] || { label: status || '未知', color: MUTED };
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

function MetricCard({ label, value, icon: Icon, color, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: CARD,
        borderRadius: 16,
        padding: '16px 14px',
        boxShadow: SHADOW,
        flex: 1,
        minWidth: 0,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <Icon size={14} style={{ color: MUTED }} />
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: MUTED,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: color || DARK }}>{value}</p>
    </div>
  );
}

function QuickAction({ icon: Icon, label, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: CARD,
        borderRadius: 16,
        padding: '16px 12px',
        boxShadow: SHADOW,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        cursor: 'pointer',
        border: 'none',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: `${color}15`,
          color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={20} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color: DARK }}>{label}</span>
    </button>
  );
}

function getApprovalBadge(status) {
  if (status === 'approved') {
    return { icon: ShieldCheck, bg: '#059669', text: '已審核通過' };
  }
  if (status === 'rejected') {
    return { icon: ShieldAlert, bg: '#EF4444', text: '審核未通過' };
  }
  if (status === 'suspended') {
    return { icon: Shield, bg: '#6B7280', text: '帳號暫停中' };
  }
  return { icon: Shield, bg: '#F59E0B', text: '等待審核中' };
}

export default function CoachDashboard() {
  const [profile, setProfile] = useState(null);
  const [coachDetail, setCoachDetail] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [chatRooms, setChatRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [threshold, setThreshold] = useState('15');
  const router = useRouter();
  const { logout } = useAuth();

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      fetch('/api/auth/profile'),
      fetch('/api/bookings'),
      fetch('/api/chat/rooms'),
      fetch('/api/admin/settings'),
    ])
      .then(async ([profileRes, bookingsRes, roomsRes, settingsRes]) => {
        if (!profileRes.ok) {
          router.push('/login');
          return;
        }

        const [profileData, bookingsData, roomsData, settingsData] = await Promise.all([
          profileRes.json(),
          bookingsRes.ok ? bookingsRes.json() : Promise.resolve({ bookings: [] }),
          roomsRes.ok ? roomsRes.json() : Promise.resolve({ rooms: [] }),
          settingsRes.ok ? settingsRes.json() : Promise.resolve({}),
        ]);

        if (!isMounted) return;

        setProfile(profileData.profile || null);
        setCoachDetail(profileData.coach || null);
        setBookings(Array.isArray(bookingsData.bookings) ? bookingsData.bookings : []);
        setChatRooms(Array.isArray(roomsData.rooms) ? roomsData.rooms : []);
        if (settingsData.settings?.no_show_threshold) {
          setThreshold(String(settingsData.settings.no_show_threshold));
        }
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '70vh' }}>
        <p style={{ color: MUTED, fontSize: 15, fontWeight: 600 }}>載入教練後台中...</p>
      </div>
    );
  }

  const confirmedBookings = bookings.filter((booking) =>
    ['scheduled', 'in_progress', 'pending_completion'].includes(booking.status)
  ).length;
  const pendingMessages = chatRooms.reduce((sum, room) => sum + (room.unread_count || 0), 0);
  const latestRoomId = chatRooms[0]?.id;
  const netEarnings = bookings.reduce(
    (sum, booking) => (booking.status === 'completed' ? sum + (booking.coach_payout || 0) : sum),
    0
  );
  const commissionRate = coachDetail?.commission_rate ?? 45;
  const instructorShare = 100 - commissionRate;
  const approvalBadge = getApprovalBadge(coachDetail?.approval_status);
  const ApprovalIcon = approvalBadge.icon;

  return (
    <div style={{ background: BG, minHeight: '100vh', paddingBottom: 100 }}>
      <header style={{ padding: '20px 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: BLUE, letterSpacing: '-0.02em' }}>
          UniCoach
        </h1>
        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: '#059669',
            background: '#D1FAE5',
            padding: '4px 10px',
            borderRadius: 100,
          }}
        >
          教練後台
        </span>
      </header>

      <div style={{ padding: '20px 16px 0' }}>
        <div
          style={{
            background: `linear-gradient(135deg, ${BLUE}, #1E40AF)`,
            borderRadius: RADIUS,
            boxShadow: '0 8px 30px rgba(37,99,235,0.2)',
            padding: '24px',
            color: '#fff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                fontWeight: 900,
                border: '2px solid rgba(255,255,255,0.4)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={profile?.name || '教練頭像'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                profile?.name?.charAt(0) ?? 'C'
              )}
              <div
                style={{
                  position: 'absolute',
                  bottom: -2,
                  right: -2,
                  background: approvalBadge.bg,
                  border: '2px solid #1E40AF',
                  borderRadius: '50%',
                  padding: 4,
                  display: 'flex',
                }}
              >
                <ApprovalIcon size={12} color="white" />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{profile?.name || '教練'} 教練</p>
                {coachDetail?.approval_status === 'approved' && <CheckCircle size={16} color="#34D399" />}
              </div>
              <p style={{ margin: 0, fontSize: 12, opacity: 0.8 }}>{approvalBadge.text}</p>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 1,
              background: 'rgba(255,255,255,0.1)',
              borderRadius: 16,
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {[
              { label: '基本單價', value: `NT$${coachDetail?.base_price ?? 0}`, clickable: true },
              { label: '平台抽成', value: `${commissionRate}%` },
              { label: '教練分潤', value: `${instructorShare}%` },
            ].map((item) => (
              <div
                key={item.label}
                onClick={item.clickable ? () => router.push('/coach/profile/edit') : undefined}
                style={{
                  padding: '12px 0',
                  textAlign: 'center',
                  background: 'rgba(255,255,255,0.05)',
                  cursor: item.clickable ? 'pointer' : 'default',
                }}
              >
                <p style={{ margin: 0, fontSize: 10, opacity: 0.7, textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>
                  {item.label}
                </p>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 16px 0', display: 'flex', gap: 12 }}>
        <MetricCard
          label="未讀訊息"
          value={pendingMessages}
          icon={MessageCircle}
          color={BLUE}
          onClick={() => (latestRoomId ? router.push(`/chat/${latestRoomId}`) : router.push('/chat'))}
        />
        <MetricCard
          label="有效預約"
          value={confirmedBookings}
          icon={Clock}
          color="#F59E0B"
          onClick={() => router.push('/bookings')}
        />
        <MetricCard
          label="累計收入"
          value={`NT$${netEarnings.toLocaleString()}`}
          icon={Wallet}
          color="#059669"
          onClick={() => router.push('/dashboard/coach/earnings')}
        />
      </div>

      <div style={{ padding: '24px 16px 0' }}>
        <PromotionCard user={profile} />
      </div>

      <div style={{ padding: '24px 16px 0' }}>
        <SectionLabel>快速操作</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <QuickAction icon={ShoppingBag} label="預約管理" color="#6366F1" onClick={() => router.push('/bookings')} />
          <QuickAction icon={TrendingUp} label="教練資料" color="#10B981" onClick={() => router.push('/coach/profile/edit')} />
          <QuickAction icon={ListChecks} label="課程方案" color="#7C3AED" onClick={() => router.push('/coach/plans')} />
          <QuickAction icon={UserCircle} label="我的頁面" color="#F59E0B" onClick={() => router.push('/coach/profile/edit')} />
          <QuickAction icon={FileText} label="課後報告" color="#EC4899" onClick={() => router.push('/bookings')} />
          <QuickAction icon={CalendarDays} label="排程設定" color="#2563EB" onClick={() => router.push('/coach/schedule')} />
        </div>
      </div>

      <div style={{ padding: '24px 16px 0' }}>
        <VideoUpload />
      </div>

      <div style={{ padding: '24px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingLeft: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <SectionLabel>近期預約</SectionLabel>
            <button
              onClick={() => setIsModalOpen(true)}
              style={{
                background: `${BLUE}15`,
                color: BLUE,
                border: 'none',
                padding: '4px 12px',
                borderRadius: 100,
                fontSize: 11,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Plus size={12} strokeWidth={3} /> 找學生
            </button>
          </div>
          <button
            onClick={() => router.push('/bookings')}
            style={{ background: 'none', border: 'none', color: BLUE, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            查看全部
          </button>
        </div>

        <div style={{ background: CARD, borderRadius: RADIUS, boxShadow: SHADOW, overflow: 'hidden' }}>
          {bookings.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>📘</div>
              <p style={{ margin: 0, fontSize: 15, color: DARK, fontWeight: 700 }}>目前沒有預約</p>
              <p style={{ margin: '4px 0 20px', fontSize: 12, color: MUTED }}>完成教練資料後，學員才能更順利找到你並預約課程。</p>
              <button
                onClick={() => router.push('/coach/profile/edit')}
                style={{
                  background: BLUE,
                  color: '#fff',
                  border: 'none',
                  padding: '10px 24px',
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(37,99,235,0.2)',
                }}
              >
                完成教練資料
              </button>
            </div>
          ) : (
            bookings.slice(0, 3).map((booking) => {
              const status = bookingStatus(booking.status);
              return (
                <div
                  key={booking.id}
                  style={{
                    padding: '16px 20px',
                    borderBottom: `1px solid ${BORDER}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                  }}
                  onClick={() => router.push('/bookings')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: BG,
                        color: MUTED,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                      }}
                    >
                      {booking.user_name?.charAt(0) ?? 'U'}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: DARK }}>{booking.user_name || '學員'}</p>
                      <p style={{ margin: 0, fontSize: 11, color: MUTED }}>
                        {booking.expected_time ? new Date(booking.expected_time).toLocaleDateString('zh-TW') : '尚未安排時間'}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: status.color }}>{status.label}</span>
                    <ChevronRight size={14} color={MUTED} />
                  </div>
                </div>
              );
            })
          )}
        </div>
        <p style={{ marginTop: 12, fontSize: 11, color: MUTED, display: 'flex', flexDirection: 'column', gap: 4, padding: '0 4px', lineHeight: 1.5 }}>
          <span>待付款預約會暫時保留時段，管理員確認收款後才會正式進入排程。</span>
          <span style={{ color: '#F59E0B', fontWeight: 700 }}>若超過 {threshold} 分鐘未完成付款或回報，預留時段可能會自動釋出。</span>
        </p>
      </div>

      <div style={{ padding: '24px 16px 0' }}>
        <SectionLabel>收入說明</SectionLabel>
        <div style={{ background: CARD, borderRadius: RADIUS, boxShadow: SHADOW, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: MUTED, fontWeight: 600 }}>目前累計已完成收入</span>
            <span style={{ fontSize: 15, fontWeight: 900, color: '#059669' }}>NT${netEarnings.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#F8FAFC', padding: 12, borderRadius: 12 }}>
            <Info size={16} color={BLUE} />
            <p style={{ margin: 0, fontSize: 11, color: '#64748B', lineHeight: 1.6 }}>
              系統目前會依照 <b>{commissionRate}%</b> 平台抽成計算教練分潤。完成課程後，可到收入頁查看每筆實際入帳金額與完成時間。
            </p>
          </div>
        </div>
      </div>

      <div style={{ padding: '32px 16px 0' }}>
        <button
          onClick={logout}
          style={{
            width: '100%',
            padding: 14,
            background: '#FFFFFF',
            border: `1px solid ${BORDER}`,
            borderRadius: 16,
            color: '#EF4444',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            boxShadow: SHADOW,
          }}
        >
          登出教練帳號
        </button>
      </div>

      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            style={{
              background: CARD,
              borderRadius: RADIUS,
              width: '100%',
              maxWidth: 400,
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div style={{ padding: '20px 20px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: DARK }}>找學生入口</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: MUTED }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div
                style={{
                  padding: 20,
                  borderRadius: 16,
                  border: `2px solid ${BLUE}`,
                  background: `${BLUE}05`,
                  cursor: 'pointer',
                }}
                onClick={() => {
                  setIsModalOpen(false);
                  router.push('/bookings');
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 800, color: BLUE, background: `${BLUE}15`, padding: '2px 8px', borderRadius: 100 }}>
                  站內主流程
                </span>
                <h3 style={{ margin: '10px 0 0', fontSize: 16, fontWeight: 800, color: DARK }}>查看平台內預約</h3>
                <p style={{ margin: '4px 0 12px', fontSize: 13, color: MUTED }}>先以平台內已建立的學員預約與對話為主，這是目前最穩定的合作來源。</p>
                <button style={{ width: '100%', padding: '10px', background: BLUE, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700 }}>
                  前往預約管理
                </button>
              </div>

              <div
                style={{
                  padding: 16,
                  borderRadius: 16,
                  border: `1px solid ${BORDER}`,
                  background: '#F8FAFC',
                  cursor: 'pointer',
                }}
                onClick={() => window.open('https://www.facebook.com/groups/764311090264010', '_blank')}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, marginBottom: 4 }}>外部補充入口</div>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: DARK }}>FB 社團招生</h4>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                  <span style={{ fontSize: 12, color: MUTED }}>需要額外招生時，可先導向外部社群。</span>
                  <span style={{ color: BLUE, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2 }}>
                    前往連結 <ExternalLink size={12} />
                  </span>
                </div>
              </div>
            </div>

            <div style={{ padding: '0 20px 20px' }}>
              <p style={{ margin: 0, fontSize: 11, color: MUTED, textAlign: 'center' }}>後續若要做正式的教練找學生系統，這裡可以再改成站內媒合或學生池。</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
