'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getDashboardPathForRole } from '@/lib/authRedirects';
import {
  ArrowUpRight, Bell, Calendar, Check, ChevronRight, Circle, Clock,
  FileText, MessageCircle, ShieldCheck, UserCheck, Wallet
} from 'lucide-react';

const BG = 'var(--bg-primary)';
const CARD = 'var(--bg-card)';
const ORANGE = 'var(--accent)';
const MUTED = 'var(--text-muted)';
const TEXT_LIGHT = 'var(--text-primary)';
const BORDER = 'var(--border)';

function SectionLabel({ children, style = {} }) {
  return (
    <p style={{
      fontSize: 12, fontWeight: 700, letterSpacing: '0.1em',
      color: MUTED, textTransform: 'uppercase', marginBottom: 16, paddingLeft: 4,
      ...style,
    }}>
      {children}
    </p>
  );
}

function isSameLocalDay(dateValue, referenceDate = new Date()) {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;
  return date.toDateString() === referenceDate.toDateString();
}

function safeStatus(booking) {
  return String(booking?.status || '').toLowerCase();
}

function getStudentKey(booking) {
  return booking?.student_id || booking?.user_id || booking?.student?.id || booking?.user?.id || booking?.user_name || null;
}

function TodoRow({ icon: Icon, label, detail, count, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="btn-press"
      style={{
        width: '100%', border: `1px solid ${active ? 'rgba(255, 138, 61, 0.35)' : BORDER}`,
        background: active ? 'rgba(255, 138, 61, 0.08)' : 'rgba(255,255,255,0.025)',
        borderRadius: 18, padding: '14px 16px', cursor: 'pointer', color: TEXT_LIGHT,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <span style={{
          width: 36, height: 36, borderRadius: 12, flex: '0 0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: active ? 'rgba(255, 138, 61, 0.14)' : 'rgba(255,255,255,0.045)', color: active ? ORANGE : MUTED,
        }}>
          <Icon size={18} />
        </span>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 14, fontWeight: 800, marginBottom: 3 }}>{label}</span>
          <span style={{ display: 'block', fontSize: 12, color: MUTED, lineHeight: 1.45 }}>{detail}</span>
        </span>
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 12 }}>
        {active && (
          <span style={{
            minWidth: 24, height: 24, padding: '0 8px', borderRadius: 999,
            background: ORANGE, color: '#120B06', fontSize: 12, fontWeight: 900,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {count}
          </span>
        )}
        <ChevronRight size={16} color={MUTED} />
      </span>
    </button>
  );
}

function ChecklistItem({ done, label, hint }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 0', borderTop: `1px solid ${BORDER}` }}>
      <span style={{
        width: 22, height: 22, borderRadius: 999, flex: '0 0 auto', marginTop: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: done ? 'rgba(16, 185, 129, 0.14)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${done ? 'rgba(16, 185, 129, 0.45)' : BORDER}`,
        color: done ? '#10B981' : MUTED,
      }}>
        {done ? <Check size={14} /> : <Circle size={10} />}
      </span>
      <span>
        <span style={{ display: 'block', fontSize: 14, fontWeight: 750, color: TEXT_LIGHT }}>{label}</span>
        <span style={{ display: 'block', fontSize: 12, color: MUTED, lineHeight: 1.45, marginTop: 2 }}>{hint}</span>
      </span>
    </div>
  );
}

export default function CoachDashboard() {
  const [profile, setProfile] = useState(null);
  const [coachDetail, setCoachDetail] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [plans, setPlans] = useState([]);
  const [usingDefaultPlans, setUsingDefaultPlans] = useState(false);
  const [availabilityRules, setAvailabilityRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const [profileRes, bookingsRes, unreadRes, plansRes, availabilityRes] = await Promise.all([
          fetch('/api/auth/profile'),
          fetch('/api/bookings'),
          fetch('/api/user/unread-counts'),
          fetch('/api/coach/plans'),
          fetch('/api/coach/availability'),
        ]);

        if (!profileRes.ok) return router.push('/login');
        const profilePayload = await profileRes.json();
        const profileData = profilePayload.profile;
        if (!profileData) return router.replace('/login');
        if (profileData.role !== 'coach') return router.replace(getDashboardPathForRole(profileData.role));

        setProfile(profileData);
        setCoachDetail(profilePayload.coach || null);

        if (bookingsRes.ok) {
          const { bookings: bookingData } = await bookingsRes.json();
          setBookings(Array.isArray(bookingData) ? bookingData : []);
        }
        if (unreadRes.ok) {
          const data = await unreadRes.json();
          setUnreadCount(Number(data.unreadChatCount) || 0);
        }
        if (plansRes.ok) {
          const data = await plansRes.json();
          setPlans(Array.isArray(data.plans) ? data.plans : []);
          setUsingDefaultPlans(Boolean(data.using_defaults));
        }
        if (availabilityRes.ok) {
          const data = await availabilityRes.json();
          setAvailabilityRules(Array.isArray(data.rules) ? data.rules : []);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const dashboardData = useMemo(() => {
    const activeBookings = bookings.filter((booking) => !['cancelled', 'refunded'].includes(safeStatus(booking)));
    const todayBookings = activeBookings.filter((booking) => isSameLocalDay(booking.booking_date));
    const pendingOrders = activeBookings.filter((booking) => ['pending', 'pending_confirmation', 'requested'].includes(safeStatus(booking)));
    const pendingPayments = activeBookings.filter((booking) => safeStatus(booking) === 'pending_payment');
    const pendingReports = activeBookings.filter((booking) => (
      ['pending_completion', 'completed'].includes(safeStatus(booking)) &&
      !(booking.learning_report_id || booking.report_id || booking.report)
    ));
    const completedBookings = bookings.filter((booking) => safeStatus(booking) === 'completed');
    const uniqueStudentIds = new Set(activeBookings.map(getStudentKey).filter(Boolean));
    const activePlans = plans.filter((plan) => plan?.is_active !== false);
    const hasRealPlans = activePlans.length > 0 && !usingDefaultPlans;
    const hasAvailability = availabilityRules.some((rule) => rule?.is_active !== false);
    const hasIntro = Boolean(
      coachDetail?.intro_video_url || coachDetail?.video_url || coachDetail?.teaching_video_url ||
      coachDetail?.philosophy || coachDetail?.teaching_features || coachDetail?.experience || profile?.bio
    );
    const isApproved = coachDetail?.approval_status === 'approved' || profile?.approval_status === 'approved';
    const canReceiveOrders = Boolean(isApproved && hasRealPlans && hasAvailability);

    return {
      todayBookings,
      pendingOrders,
      pendingPayments,
      pendingReports,
      completedBookings,
      uniqueStudentIds,
      activePlans,
      hasRealPlans,
      hasAvailability,
      hasIntro,
      isApproved,
      canReceiveOrders,
      hasTodo: todayBookings.length > 0 || unreadCount > 0 || pendingOrders.length > 0 || pendingPayments.length > 0 || pendingReports.length > 0,
    };
  }, [availabilityRules, bookings, coachDetail, plans, profile, unreadCount, usingDefaultPlans]);

  if (loading) {
    return (
      <div className="mobile-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <p style={{ color: MUTED }}>載入中...</p>
      </div>
    );
  }

  const checklist = [
    {
      label: '身分 / 學生證審核通過',
      done: dashboardData.isApproved,
      hint: dashboardData.isApproved ? '平台已通過你的教練身分審核。' : '尚未看到審核通過狀態，請確認教練資料。',
    },
    {
      label: '已建立課程方案',
      done: dashboardData.hasRealPlans,
      hint: dashboardData.hasRealPlans ? '已有可接單方案。' : '尚未建立可接單服務',
    },
    {
      label: '已設定可上課時段',
      done: dashboardData.hasAvailability,
      hint: dashboardData.hasAvailability ? '學生可以依你的開放時段預約。' : '尚未看到固定可預約時段。',
    },
    {
      label: '已上傳教學影片或自介',
      done: dashboardData.hasIntro,
      hint: dashboardData.hasIntro ? '已有自介/教學內容可協助學生判斷。' : '建議補上自介、教學特色或影片，提高轉換率。',
    },
    {
      label: '已開啟可接單狀態',
      done: dashboardData.canReceiveOrders,
      hint: dashboardData.canReceiveOrders ? '基本接單條件已就緒。' : '完成審核、方案與時段後再開放接單較安全。',
    },
  ];

  return (
    <div className="mobile-container fade-in" style={{ backgroundColor: BG, minHeight: '100vh' }}>
      <header style={{
        padding: 'var(--padding-page)', paddingTop: '40px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <p style={{ fontSize: 13, color: MUTED, marginBottom: 2 }}>教練中心</p>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: TEXT_LIGHT, letterSpacing: '-0.02em', margin: 0 }}>
            {profile?.name || '教練'} 的工作台
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div onClick={() => router.push('/chat')} className="btn-press" style={{ position: 'relative', cursor: 'pointer', background: CARD, border: `1px solid ${BORDER}`, width: 44, height: 44, borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', color: TEXT_LIGHT }}>
            <MessageCircle size={20} />
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', top: -2, right: -2, background: '#EF4444', width: 12, height: 12, borderRadius: 6, border: `2px solid ${BG}` }} />
            )}
          </div>
          <div style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: CARD, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
            {profile?.avatar_url && <img src={profile.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
          </div>
        </div>
      </header>

      <main style={{ padding: '0 var(--padding-page) 100px', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-section)' }}>
        <section style={{
          background: CARD, border: `1px solid ${BORDER}`, borderRadius: 24, padding: 20,
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 18 }}>
            <div>
              <SectionLabel style={{ marginBottom: 8, paddingLeft: 0 }}>今日待辦</SectionLabel>
              <h2 style={{ fontSize: 24, fontWeight: 900, color: TEXT_LIGHT, margin: 0, lineHeight: 1.25 }}>
                今天要做什麼
              </h2>
            </div>
            <span style={{
              border: `1px solid ${BORDER}`, borderRadius: 999, padding: '7px 10px',
              color: dashboardData.hasTodo ? ORANGE : MUTED, fontSize: 12, fontWeight: 800,
              background: dashboardData.hasTodo ? 'rgba(255, 138, 61, 0.08)' : 'rgba(255,255,255,0.025)',
            }}>
              {dashboardData.hasTodo ? '需要處理' : '暫無待辦'}
            </span>
          </div>

          {!dashboardData.hasTodo && (
            <div style={{
              border: `1px dashed ${BORDER}`, borderRadius: 18, padding: 18,
              color: MUTED, fontSize: 14, lineHeight: 1.6, marginBottom: 14,
              background: 'rgba(255,255,255,0.02)',
            }}>
              今天還沒有待辦，先確認你的服務與時段是否已開放。
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <TodoRow
              icon={Calendar}
              label="今日預約"
              detail={dashboardData.todayBookings.length ? `${dashboardData.todayBookings.length} 堂課需要準備或上課` : '今天沒有已排程課程'}
              count={dashboardData.todayBookings.length}
              active={dashboardData.todayBookings.length > 0}
              onClick={() => router.push('/bookings')}
            />
            <TodoRow
              icon={MessageCircle}
              label="未讀訊息"
              detail={unreadCount ? '有學生訊息尚未回覆' : '沒有未讀聊天訊息'}
              count={unreadCount}
              active={unreadCount > 0}
              onClick={() => router.push('/chat')}
            />
            <TodoRow
              icon={Bell}
              label="待確認訂單"
              detail={dashboardData.pendingOrders.length ? '有新預約需要確認下一步' : '沒有待確認的新訂單'}
              count={dashboardData.pendingOrders.length}
              active={dashboardData.pendingOrders.length > 0}
              onClick={() => router.push('/bookings')}
            />
            <TodoRow
              icon={Wallet}
              label="待付款提醒"
              detail={dashboardData.pendingPayments.length ? '有訂單仍在等待付款或付款確認' : '沒有待付款提醒'}
              count={dashboardData.pendingPayments.length}
              active={dashboardData.pendingPayments.length > 0}
              onClick={() => router.push('/bookings')}
            />
            <TodoRow
              icon={FileText}
              label="待填課後日誌"
              detail={dashboardData.pendingReports.length ? '完成課程後請補上學習紀錄' : '沒有待補課後日誌'}
              count={dashboardData.pendingReports.length}
              active={dashboardData.pendingReports.length > 0}
              onClick={() => router.push('/bookings')}
            />
          </div>
        </section>

        <section>
          <SectionLabel>接單狀態 Checklist</SectionLabel>
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 22, padding: '6px 18px 8px' }}>
            {checklist.map((item) => (
              <ChecklistItem key={item.label} done={item.done} label={item.label} hint={item.hint} />
            ))}
          </div>
        </section>

        <section>
          <SectionLabel>營運摘要</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Check size={16} color={MUTED} />
                <span style={{ fontSize: 13, color: MUTED }}>完成課程</span>
              </div>
              <p style={{ fontSize: 14, fontWeight: 800, color: TEXT_LIGHT, margin: 0 }}>
                {dashboardData.completedBookings.length > 0 ? `${dashboardData.completedBookings.length} 堂` : '尚無完成課程'}
              </p>
            </div>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <UserCheck size={16} color={MUTED} />
                <span style={{ fontSize: 13, color: MUTED }}>學生資料</span>
              </div>
              <p style={{ fontSize: 14, fontWeight: 800, color: TEXT_LIGHT, margin: 0 }}>
                {dashboardData.uniqueStudentIds.size > 0 ? `${dashboardData.uniqueStudentIds.size} 位學生` : '尚無學生資料'}
              </p>
            </div>
          </div>
        </section>

        <section>
          <SectionLabel>我的服務</SectionLabel>
          <div className="btn-press" onClick={() => router.push('/coach/plans')} style={{
            background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ArrowUpRight size={20} color={TEXT_LIGHT} />
              </div>
              <div>
                <h4 style={{ fontSize: 15, fontWeight: 700, color: TEXT_LIGHT, margin: '0 0 4px' }}>管理服務項目</h4>
                <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>
                  {dashboardData.hasRealPlans ? '檢查方案內容、價格與可接單狀態' : '尚未建立可接單服務'}
                </p>
              </div>
            </div>
            <ChevronRight size={16} color={MUTED} />
          </div>
        </section>

        <section style={{
          border: `1px solid ${BORDER}`, borderRadius: 20, padding: 18,
          background: 'rgba(255,255,255,0.018)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <ShieldCheck size={18} color={ORANGE} />
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: MUTED }}>成長提醒</span>
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 900, color: TEXT_LIGHT, margin: '0 0 8px' }}>
            還在 FB 社團重複貼文找學生嗎？
          </h3>
          <p style={{ fontSize: 14, color: MUTED, margin: 0, lineHeight: 1.65 }}>
            把你的教學影片、可預約時段與課程方案一次整理好，讓學生先了解你，再主動預約你。
          </p>
        </section>
      </main>
    </div>
  );
}
