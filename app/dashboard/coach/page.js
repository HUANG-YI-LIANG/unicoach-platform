'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { getDashboardPathForRole } from '@/lib/authRedirects';
import {
  Bell, ChevronRight, ChevronDown, Apple, Smartphone,
  Calendar, Wallet, Activity, Check, MessageCircle, FileText,
  UserCheck, ShieldCheck, ArrowUpRight, Clock, Video
} from 'lucide-react';
import { DashboardSkeleton } from '@/components/Skeleton';
import VideoUpload from '@/components/VideoUpload';
import PhotoUpload from '@/components/PhotoUpload';

const EMPTY_PROFILE = { name: '', avatar_url: null, level: 1 };

function AccordionItem({ title, icon: Icon, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="accordion-item">
      <div className="accordion-header" onClick={() => setIsOpen(!isOpen)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Icon size={20} color="var(--text-muted)" />
          <span>{title}</span>
        </div>
        {isOpen ? <ChevronDown size={20} color="var(--text-muted)" /> : <ChevronRight size={20} color="var(--text-muted)" />}
      </div>
      <div className={`accordion-content ${isOpen ? 'open' : ''}`}>
        <div className="accordion-inner">
          {children}
        </div>
      </div>
    </div>
  );
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

function isSameLocalDay(dateValue, referenceDate = new Date()) {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;
  return date.toDateString() === referenceDate.toDateString();
}

export default function CoachDashboard() {
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [coachDetail, setCoachDetail] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [plans, setPlans] = useState([]);
  const [usingDefaultPlans, setUsingDefaultPlans] = useState(false);
  const [availabilityRules, setAvailabilityRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { logout } = useAuth();

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
    return <DashboardSkeleton />;
  }

  const completedStepsCount = [
    dashboardData.isApproved,
    dashboardData.hasRealPlans,
    dashboardData.hasAvailability,
    dashboardData.hasIntro
  ].filter(Boolean).length;

  return (
    <div className="mobile-container" style={{ background: 'var(--bg-primary)' }}>
      <main className="content" style={{ padding: '24px 20px', paddingBottom: '120px' }}>
        
        {/* HEADER */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>Hi, {profile?.name || '教練'}</span>
            {profile?.registration_number && <span style={{ fontSize: '0.65em', color: 'var(--text-muted)', fontWeight: 800 }}>#{profile.registration_number}</span>}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button onClick={() => router.push('/chat')} style={{ background: 'transparent', padding: 0, color: 'var(--text-primary)', position: 'relative' }}>
              <MessageCircle size={24} />
              {unreadCount > 0 && <span style={{ position: 'absolute', top: -4, right: -4, background: 'var(--color-danger)', width: 10, height: 10, borderRadius: 5 }}></span>}
            </button>
            <button onClick={() => router.push('/notifications')} style={{ background: 'transparent', padding: 0, color: 'var(--text-primary)' }}>
              <Bell size={24} />
            </button>
          </div>
        </header>

        {/* METALLIC LEVEL CARD */}
        <div className="metallic-card metallic-gold" style={{ marginBottom: 24 }}>
          <div className="metallic-card-title">白金教練等級</div>
          <div className="metallic-progress-bg">
            <div className="metallic-progress-fill" style={{ width: '80%' }}></div>
          </div>
          <div className="metallic-card-desc">再完成 3 堂課即可晉升鑽石教練等級</div>
          <div className="metallic-card-link" onClick={() => router.push('/levels')}>
            <span>了解教練抽成權益</span>
            <ChevronRight size={16} />
          </div>
          <div style={{ position: 'absolute', right: 20, top: 20, width: 24, height: 24, background: 'rgba(0,0,0,0.1)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: 'var(--text-primary)' }}>
            P
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div className="quick-action-grid">
          <div className="quick-action-btn" onClick={() => router.push('/coach/schedule')}>
            <Calendar className="quick-action-icon" />
            <span className="quick-action-text">行事曆</span>
          </div>
          <div className="quick-action-btn" onClick={() => router.push('/support?topic=coach-withdrawal')}>
            <Wallet className="quick-action-icon" />
            <span className="quick-action-text">收益錢包</span>
          </div>
          <div className="quick-action-btn" onClick={() => router.push('/coach/plans')}>
            <ArrowUpRight className="quick-action-icon" />
            <span className="quick-action-text">課程方案</span>
          </div>
        </div>

        {/* ACCORDION SECTIONS */}
        <div className="accordion-wrapper">
          
          <AccordionItem title="接單狀態與進度" icon={Activity} defaultOpen={!dashboardData.canReceiveOrders}>
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ background: dashboardData.canReceiveOrders ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 138, 61, 0.1)', padding: 12, borderRadius: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: dashboardData.canReceiveOrders ? '#10B981' : '#EA580C', marginBottom: 4 }}>
                  {dashboardData.canReceiveOrders ? '目前狀態：已可接單' : `還差 ${4 - completedStepsCount} 步完成接單準備`}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {dashboardData.canReceiveOrders ? '學生可隨時預約您的課程。' : '完成以下準備後，學生就能找到您。'}
                </div>
              </div>
              
              {!dashboardData.canReceiveOrders && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div onClick={() => router.push('/coach/profile/edit')} style={{ display: 'flex', justifyContent: 'space-between', padding: 12, background: 'var(--bg-card)', borderRadius: 8, cursor: 'pointer' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>身分與自介</span>
                    {dashboardData.isApproved ? <Check size={16} color="#10B981" /> : <ChevronRight size={16} color="var(--text-muted)" />}
                  </div>
                  <div onClick={() => router.push('/coach/plans')} style={{ display: 'flex', justifyContent: 'space-between', padding: 12, background: 'var(--bg-card)', borderRadius: 8, cursor: 'pointer' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>設定課程方案</span>
                    {dashboardData.hasRealPlans ? <Check size={16} color="#10B981" /> : <ChevronRight size={16} color="var(--text-muted)" />}
                  </div>
                  <div onClick={() => router.push('/coach/schedule')} style={{ display: 'flex', justifyContent: 'space-between', padding: 12, background: 'var(--bg-card)', borderRadius: 8, cursor: 'pointer' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>設定可約時段</span>
                    {dashboardData.hasAvailability ? <Check size={16} color="#10B981" /> : <ChevronRight size={16} color="var(--text-muted)" />}
                  </div>
                </div>
              )}
            </div>
          </AccordionItem>

          <AccordionItem title="今日待辦" icon={Check} defaultOpen={dashboardData.hasTodo}>
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dashboardData.hasTodo ? (
                <>
                  {dashboardData.todayBookings.length > 0 && (
                    <div onClick={() => router.push('/bookings?filter=today')} style={{ display: 'flex', justifyContent: 'space-between', padding: 12, background: 'var(--bg-card)', borderRadius: 8, cursor: 'pointer' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>今日課程 ({dashboardData.todayBookings.length})</span>
                      <ChevronRight size={16} color="var(--text-muted)" />
                    </div>
                  )}
                  {unreadCount > 0 && (
                    <div onClick={() => router.push('/chat')} style={{ display: 'flex', justifyContent: 'space-between', padding: 12, background: 'var(--bg-card)', borderRadius: 8, cursor: 'pointer' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>未讀訊息 ({unreadCount})</span>
                      <ChevronRight size={16} color="var(--text-muted)" />
                    </div>
                  )}
                  {dashboardData.pendingOrders.length > 0 && (
                    <div onClick={() => router.push('/bookings?filter=pending_confirmation')} style={{ display: 'flex', justifyContent: 'space-between', padding: 12, background: 'var(--bg-card)', borderRadius: 8, cursor: 'pointer' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>待確認訂單 ({dashboardData.pendingOrders.length})</span>
                      <ChevronRight size={16} color="var(--text-muted)" />
                    </div>
                  )}
                  {dashboardData.pendingPayments.length > 0 && (
                    <div onClick={() => router.push('/bookings?filter=pending_payment')} style={{ display: 'flex', justifyContent: 'space-between', padding: 12, background: 'var(--bg-card)', borderRadius: 8, cursor: 'pointer' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>待付款 ({dashboardData.pendingPayments.length})</span>
                      <ChevronRight size={16} color="var(--text-muted)" />
                    </div>
                  )}
                  {dashboardData.pendingReports.length > 0 && (
                    <div onClick={() => router.push('/bookings?filter=pending_report')} style={{ display: 'flex', justifyContent: 'space-between', padding: 12, background: 'var(--bg-card)', borderRadius: 8, cursor: 'pointer' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>待填課後日誌 ({dashboardData.pendingReports.length})</span>
                      <ChevronRight size={16} color="var(--text-muted)" />
                    </div>
                  )}
                </>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>今天沒有待辦事項</div>
              )}
            </div>
          </AccordionItem>

          <AccordionItem title="營運摘要" icon={FileText}>
            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 4 }}>完成課程</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-primary)' }}>{dashboardData.completedBookings.length} 堂</div>
              </div>
              <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 4 }}>學生人數</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-primary)' }}>{dashboardData.uniqueStudentIds.size} 位</div>
              </div>
            </div>
          </AccordionItem>

          <AccordionItem title="個人檔案設定" icon={UserCheck}>
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div onClick={() => router.push('/coach/profile/edit')} style={{ display: 'flex', justifyContent: 'space-between', padding: 12, background: 'var(--bg-card)', borderRadius: 8, cursor: 'pointer' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>編輯公開資料與自介</span>
                <ChevronRight size={16} color="var(--text-muted)" />
              </div>
            </div>
          </AccordionItem>

          <AccordionItem title="教學影片與作品集" icon={Video}>
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 32 }}>
              <PhotoUpload />
              <div style={{ height: 1, background: 'var(--border-subtle)', margin: '0 8px' }}></div>
              <VideoUpload />
            </div>
          </AccordionItem>

        </div>

        {/* APP DOWNLOAD BUTTONS */}
        <div style={{ marginTop: 40, marginBottom: 20 }}>
          <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 12 }}>
            下載 UniteCoach 專屬教練 APP
          </div>
          <button onClick={() => router.push('/download')} className="app-download-btn" style={{ border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)' }}>
            <Apple size={20} /> iOS 下載
          </button>
          <button onClick={() => router.push('/download')} className="app-download-btn" style={{ border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)' }}>
            <Smartphone size={20} /> Android 下載
          </button>
        </div>

        {/* LOGOUT BUTTON */}
        <button className="logout-btn-black" onClick={logout}>
          登出
        </button>

      </main>
    </div>
  );
}
