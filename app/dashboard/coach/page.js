'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getDashboardPathForRole } from '@/lib/authRedirects';
import {
  ArrowUpRight, Bell, Calendar, Check, ChevronRight, Clock,
  FileText, MessageCircle, ShieldCheck, UserCheck, Wallet, Activity
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

function getBookingScheduleTime(booking) {
  return booking?.expected_time || booking?.booking_date || booking?.scheduled_at || null;
}

function getStudentKey(booking) {
  return booking?.student_id || booking?.user_id || booking?.student?.id || booking?.user?.id || booking?.user_name || null;
}

function TodoRow({ icon: Icon, label, detail, count, active, onClick }) {
  return (
    <button onClick={onClick} className="btn-press" style={{
      width: '100%', background: active ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.015)',
      border: `1px solid ${active ? 'rgba(255,255,255,0.1)' : BORDER}`, borderRadius: 16,
      padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14,
      cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s ease',
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: active ? 'rgba(255, 138, 61, 0.15)' : 'rgba(255,255,255,0.04)',
        color: active ? ORANGE : MUTED,
      }}>
        <Icon size={18} />
      </div>
      <div style={{ flex: 1 }}>
        <h3 style={{ fontSize: 15, fontWeight: 750, color: active ? TEXT_LIGHT : MUTED, margin: '0 0 2px' }}>{label}</h3>
        <p style={{ fontSize: 12, color: MUTED, margin: 0, lineHeight: 1.4 }}>{detail}</p>
      </div>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {count > 0 && (
          <span style={{
            minWidth: 20, height: 20, borderRadius: 10, padding: '0 6px',
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

function TaskCard({ title, description, buttonText, onClick }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 18, marginBottom: 12, boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, fontWeight: 800, color: ORANGE, margin: '0 0 6px' }}>還差一步</p>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: TEXT_LIGHT, margin: '0 0 6px' }}>{title}</h3>
          <p style={{ fontSize: 13, color: MUTED, margin: '0 0 14px', lineHeight: 1.5 }}>{description}</p>
          <button onClick={onClick} className="btn-press" style={{
            background: 'var(--text-primary)', color: 'var(--bg-primary)', border: 'none', borderRadius: 10,
            padding: '10px 16px', fontSize: 14, fontWeight: 800, cursor: 'pointer'
          }}>
            {buttonText}
          </button>
        </div>
      </div>
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
    const todayBookings = activeBookings.filter((booking) => isSameLocalDay(getBookingScheduleTime(booking)));
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

  // Calculate missing steps
  const missingStepsCount = (!dashboardData.hasRealPlans ? 1 : 0) + (!dashboardData.hasAvailability ? 1 : 0) + (!dashboardData.isApproved ? 1 : 0);

  const completedStepsCount = [
    dashboardData.isApproved,
    dashboardData.hasRealPlans,
    dashboardData.hasAvailability,
    dashboardData.hasIntro
  ].filter(Boolean).length;

  const steps = [
    { label: '身分與學生證審核', done: dashboardData.isApproved },
    { label: '課程方案', done: dashboardData.hasRealPlans },
    { label: '可約時段', done: dashboardData.hasAvailability },
    { label: '自介內容', done: dashboardData.hasIntro },
  ];

  const StatusSection = (
    <section style={{
      background: dashboardData.canReceiveOrders ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255, 138, 61, 0.05)',
      border: `1px solid ${dashboardData.canReceiveOrders ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 138, 61, 0.3)'}`,
      borderRadius: 24, padding: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <Activity size={20} color={dashboardData.canReceiveOrders ? '#10B981' : ORANGE} />
        <h2 style={{ fontSize: 16, fontWeight: 800, color: dashboardData.canReceiveOrders ? '#10B981' : ORANGE, margin: 0 }}>
          目前狀態：{dashboardData.canReceiveOrders ? '已可接單' : '尚未公開接單'}
        </h2>
      </div>
      {dashboardData.canReceiveOrders ? (
        <p style={{ margin: 0, fontSize: 14, color: TEXT_LIGHT, lineHeight: 1.6 }}>
          基本接單設定已完成，建議再檢查公開資料與課程方案是否完整。學生進入你的教練頁後，即可依開放時段預約。
        </p>
      ) : (
        <p style={{ margin: 0, fontSize: 14, color: TEXT_LIGHT, lineHeight: 1.6 }}>
          還差 {missingStepsCount} 步完成接單準備。完成後，學生就能在教練列表找到你並預約！
        </p>
      )}
    </section>
  );

  const ProgressSection = (
    <section style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 24, padding: 20 }}>
      <h3 style={{ fontSize: 15, fontWeight: 800, color: TEXT_LIGHT, margin: '0 0 12px' }}>
        接單準備進度：{completedStepsCount} / 4
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {steps.map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8, color: s.done ? '#10B981' : MUTED, fontSize: 14, fontWeight: 700 }}>
            {s.done ? <Check size={16} /> : <span style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${MUTED}` }} />}
            <span>{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  );

  const TasksSection = (
    <section>
      {!dashboardData.hasRealPlans && (
        <TaskCard
          title="建立你的第一個課程方案"
          description="學生需要看到課程長度、價格與內容，才知道能不能預約你。"
          buttonText="新增課程方案"
          onClick={() => router.push('/coach/plans')}
        />
      )}
      {!dashboardData.hasAvailability && (
        <TaskCard
          title="設定每週可上課時段"
          description="學生只能預約你有開放的時段，請確保時段是最新的。"
          buttonText="設定每週時段"
          onClick={() => router.push('/coach/schedule')}
        />
      )}
      {!dashboardData.isApproved && (
        <TaskCard
          title="補完公開教練資料並驗證身分"
          description="完整自介與身分驗證能大幅提高家長信任感，這是上架必經步驟。"
          buttonText="編輯公開資料"
          onClick={() => router.push('/coach/profile/edit')}
        />
      )}
      {!dashboardData.hasIntro && dashboardData.isApproved && (
        <TaskCard
          title="補完自介內容與介紹影片"
          description="有影片或豐富圖文的教練獲得預約的機率是沒圖文的3倍！"
          buttonText="編輯公開資料"
          onClick={() => router.push('/coach/profile/edit')}
        />
      )}
    </section>
  );

  const TodoSection = (
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
          onClick={() => router.push('/bookings?filter=today')}
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
          onClick={() => router.push('/bookings?filter=pending_confirmation')}
        />
        <TodoRow
          icon={Wallet}
          label="待付款提醒"
          detail={dashboardData.pendingPayments.length ? '有訂單仍在等待付款或付款確認' : '沒有待付款提醒'}
          count={dashboardData.pendingPayments.length}
          active={dashboardData.pendingPayments.length > 0}
          onClick={() => router.push('/bookings?filter=pending_payment')}
        />
        <TodoRow
          icon={FileText}
          label="待填課後日誌"
          detail={dashboardData.pendingReports.length ? '完成課程後請補上學習紀錄' : '沒有待補課後日誌'}
          count={dashboardData.pendingReports.length}
          active={dashboardData.pendingReports.length > 0}
          onClick={() => router.push('/bookings?filter=pending_report')}
        />
      </div>
    </section>
  );

  const SummarySection = (
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
  );

  const ManagementSection = (
    <section>
      <SectionLabel>服務與資料管理</SectionLabel>
      <div style={{ display: 'grid', gap: 10 }}>
        <div className="btn-press" onClick={() => router.push('/coach/plans')} style={{
          background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowUpRight size={18} color={TEXT_LIGHT} />
            </div>
            <div>
              <h4 style={{ fontSize: 15, fontWeight: 700, color: TEXT_LIGHT, margin: '0 0 4px' }}>管理課程方案</h4>
              <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>檢查方案內容與價格</p>
            </div>
          </div>
          <ChevronRight size={16} color={MUTED} />
        </div>

        <div className="btn-press" onClick={() => router.push('/coach/schedule')} style={{
          background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={18} color={TEXT_LIGHT} />
            </div>
            <div>
              <h4 style={{ fontSize: 15, fontWeight: 700, color: TEXT_LIGHT, margin: '0 0 4px' }}>設定可約時段</h4>
              <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>調整每週固定開放時段</p>
            </div>
          </div>
          <ChevronRight size={16} color={MUTED} />
        </div>

        <div className="btn-press" onClick={() => router.push('/coach/profile/edit')} style={{
          background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserCheck size={18} color={TEXT_LIGHT} />
            </div>
            <div>
              <h4 style={{ fontSize: 15, fontWeight: 700, color: TEXT_LIGHT, margin: '0 0 4px' }}>編輯教練資料與影片</h4>
              <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>更新公開自介與介紹短影音</p>
            </div>
          </div>
          <ChevronRight size={16} color={MUTED} />
        </div>
      </div>

      <section style={{
        border: `1px solid ${BORDER}`, borderRadius: 20, padding: 18,
        background: 'rgba(255,255,255,0.018)', marginTop: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <ShieldCheck size={18} color={ORANGE} />
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: MUTED }}>成長提醒</span>
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 900, color: TEXT_LIGHT, margin: '0 0 8px' }}>
          還在 FB 社團重複貼文找學生嗎？
        </h3>
        <p style={{ fontSize: 14, color: MUTED, margin: 0, lineHeight: 1.65 }}>
          把教學影片、可約時段與課程方案一次整理好，讓學生直接看懂，讓系統幫你接單。
        </p>
      </section>
    </section>
  );

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
        {dashboardData.canReceiveOrders ? (
          <>
            {TodoSection}
            {SummarySection}
            {StatusSection}
            {ManagementSection}
          </>
        ) : (
          <>
            {StatusSection}
            {ProgressSection}
            {TasksSection}
            {TodoSection}
            {SummarySection}
            {ManagementSection}
          </>
        )}
      </main>
    </div>
  );
}
