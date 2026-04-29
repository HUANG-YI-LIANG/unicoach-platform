'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, GraduationCap, MapPin, MessageCircle, Star, Video, BookOpen, ShieldCheck, Mail, DollarSign, FileDigit, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import VideoGallery from '@/components/VideoGallery';
import { addDays as addDaysAvailability, buildBookedSlotSet, generateSlotsForCoach, getTodayDateString } from '@/lib/coachAvailability';
import { startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, format, isSameMonth, isSameDay, isBefore, startOfDay, getDay, parseISO, addDays, getWeeksInMonth, startOfWeek, endOfWeek } from 'date-fns';

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];
const SLOT_MINUTES = 30;

function toDateTimeKey(value) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value)).replace(' ', 'T');
}

function normalizeBookingTime(value) {
  if (!value) {
    return '';
  }

  if (value.includes('T') && value.includes('+')) {
    return value;
  }

  return `${value}:00+08:00`;
}

function buildMonthAvailability(coach, bookings, monthStart) {
  const startDateStr = format(monthStart, 'yyyy-MM-dd');
  // Fetch a 45 day window to easily cover the current month
  const bookedSlotSet = buildBookedSlotSet(bookings);
  const slots = generateSlotsForCoach(coach, bookedSlotSet, {
    startDate: startDateStr,
    lookaheadDays: 45,
  });

  const dateMap = new Map();
  for (const slot of slots) {
    if (!slot.booked) {
      dateMap.set(slot.date, true);
    }
  }

  return {
    slots,
    dateMap
  };
}

function formatNextAvailable(value) {
  if (!value) {
    return '尚未設定固定時段';
  }

  const parts = new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(value));

  const month = parts.find((part) => part.type === 'month')?.value || '--';
  const day = parts.find((part) => part.type === 'day')?.value || '--';
  const hour = parts.find((part) => part.type === 'hour')?.value || '--';
  const minute = parts.find((part) => part.type === 'minute')?.value || '--';
  return `${month}/${day} ${hour}:${minute}`;
}

export default function CoachDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const initDate = searchParams.get('date') || '';
  const initTime = searchParams.get('time') || '';
  const initRegion = searchParams.get('region') || '';

  const [coach, setCoach] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [videos, setVideos] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState(() => {
    if (initDate && initTime) {
      return {
        date: initDate,
        time: initTime,
        iso: `${initDate}T${initTime}:00+08:00`
      };
    }
    return null;
  });
  const [selectedPlanId, setSelectedPlanId] = useState('');
  
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (initDate) {
      return startOfMonth(parseISO(initDate));
    }
    return startOfMonth(new Date());
  });
  
  const [selectedDate, setSelectedDate] = useState(() => {
    if (initDate) {
      return initDate;
    }
    return null;
  });
  const [bookingForm, setBookingForm] = useState({
    age: '',
    gender: '',
    attendeesCount: 1,
    learningStatus: '初學',
    expectedTime: '',
    address: initRegion,
    couponId: null,
    couponDiscount: 0,
    isRecurring: false,
    recurringWeeks: 4,
  });
  const [userProfile, setUserProfile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/coaches/${id}`).then((response) => response.json()),
      fetch('/api/auth/profile').then(async (response) => (response.ok ? response.json() : null)),
    ])
      .then(([coachPayload, profilePayload]) => {
        if (coachPayload?.coach) {
          setCoach(coachPayload.coach);
          setReviews(coachPayload.reviews || []);
          setVideos(coachPayload.videos || []);
          setBookings(coachPayload.bookings || []);
          setSelectedPlanId(coachPayload.coach.plan_options?.[0]?.id || '');
        }

        if (profilePayload?.profile) {
          setUserProfile(profilePayload.profile);
          setBookingForm((current) => ({
            ...current,
            address: current.address || profilePayload.profile.address || '',
          }));
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const planOptions = coach?.plan_options || [];
  const selectedPlan = useMemo(
    () => planOptions.find((plan) => plan.id === selectedPlanId) || planOptions[0] || null,
    [planOptions, selectedPlanId]
  );

  const availablePlansForSlot = useMemo(() => {
    if (!selectedSlot) {
      return [];
    }

    const bookedSet = new Set((bookings || []).map((booking) => toDateTimeKey(booking.expected_time)));

    return planOptions.map((plan) => {
      const neededSlots = Math.max(1, Math.ceil((plan.duration_minutes || 60) / SLOT_MINUTES));
      let available = true;

      for (let step = 0; step < neededSlots; step += 1) {
        const slotIso = new Date(new Date(selectedSlot.iso).getTime() + (step * SLOT_MINUTES * 60 * 1000)).toISOString();
        const key = toDateTimeKey(slotIso);
        if (bookedSet.has(key)) {
          available = false;
          break;
        }
      }

      return {
        ...plan,
        available,
      };
    });
  }, [bookings, planOptions, selectedSlot]);

  useEffect(() => {
    if (!selectedSlot) {
      return;
    }

    const firstAvailablePlan = availablePlansForSlot.find((plan) => plan.available) || availablePlansForSlot[0];
    if (firstAvailablePlan) {
      setSelectedPlanId(firstAvailablePlan.id);
    }

    setBookingForm((current) => ({
      ...current,
      expectedTime: normalizeBookingTime(selectedSlot.iso),
    }));
  }, [availablePlansForSlot, selectedSlot]);

  const monthAvailability = useMemo(() => {
    if (!coach) {
      return null;
    }
    return buildMonthAvailability(coach, bookings, currentMonth);
  }, [bookings, coach, currentMonth]);

  async function handleChat() {
    if (!coach) {
      return;
    }

    const response = await fetch('/api/chat/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coachId: coach.user_id || coach.id }),
    });
    const payload = await response.json();
    if (response.ok && payload.roomId) {
      router.push(`/chat/${payload.roomId}`);
      return;
    }

    alert(payload.error || '建立聊天室失敗');
  }

  async function handleBooking() {
    if (!coach || !selectedPlan) {
      alert('請先選擇時段與方案');
      return;
    }

    if (!bookingForm.age || !bookingForm.gender || !bookingForm.address || !bookingForm.expectedTime) {
      alert('請先補齊預約資料');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coachId: coach.user_id || coach.id,
          expectedTime: bookingForm.expectedTime,
          age: bookingForm.age,
          gender: bookingForm.gender,
          attendeesCount: bookingForm.attendeesCount,
          learningStatus: bookingForm.learningStatus,
          couponId: bookingForm.couponId,
          couponDiscount: bookingForm.couponDiscount,
          address: bookingForm.address,
          planId: selectedPlan.id,
          isRecurring: bookingForm.isRecurring,
          recurringWeeks: bookingForm.recurringWeeks,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        alert(payload.error || '建立預約失敗');
        return;
      }

      alert(`已為您保留時段！請盡速完成付款 (總金額 NT$${payload.finalPrice})`);
      router.push('/bookings');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="p-10 text-center text-slate-500">載入教練資料中...</div>;
  }

  if (!coach || !monthAvailability) {
    return <div className="p-10 text-center text-slate-500">找不到教練資料</div>;
  }

  return (
    <div className="coach-detail-page">
      <style dangerouslySetInnerHTML={{ __html: `
        .coach-detail-page {
          min-height: 100vh;
          background:
            radial-gradient(circle at top left, rgba(37, 99, 235, 0.14), transparent 28%),
            linear-gradient(180deg, #f8fbff 0%, #eef5ff 100%);
          padding-bottom: 120px;
        }
        .coach-detail-shell {
          width: min(1120px, calc(100vw - 24px));
          margin: 0 auto;
          padding: 20px 0 40px;
        }
        .hero {
          background: linear-gradient(135deg, #0f172a, #2563eb);
          color: white;
          border-radius: 32px;
          padding: 22px;
          box-shadow: 0 24px 80px rgba(15, 23, 42, 0.24);
        }
        .hero-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
        }
        .back-btn {
          border: none;
          background: rgba(255,255,255,0.16);
          color: white;
          width: 42px;
          height: 42px;
          border-radius: 14px;
          cursor: pointer;
        }
        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.16);
          font-weight: 800;
          font-size: 12px;
        }
        .hero-main {
          display: flex;
          gap: 18px;
          align-items: center;
          margin-top: 20px;
        }
        .avatar {
          width: 88px;
          height: 88px;
          border-radius: 28px;
          background: rgba(255,255,255,0.14);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          font-weight: 900;
          overflow: hidden;
          flex-shrink: 0;
        }
        .hero-main h1 {
          margin: 0;
          font-size: clamp(28px, 5vw, 40px);
          line-height: 1.05;
          font-weight: 900;
        }
        .hero-meta {
          margin-top: 8px;
          color: rgba(255,255,255,0.82);
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          font-size: 14px;
        }
        .hero-stats {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-top: 20px;
        }
        .hero-stat {
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 22px;
          padding: 14px;
        }
        .hero-stat-label {
          font-size: 12px;
          color: rgba(255,255,255,0.72);
          margin-bottom: 8px;
        }
        .hero-stat-value {
          font-size: 18px;
          font-weight: 900;
        }
        .content-grid {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 18px;
          margin-top: 18px;
          align-items: start;
        }
        .panel {
          background: rgba(255,255,255,0.92);
          border: 1px solid rgba(148,163,184,0.18);
          border-radius: 28px;
          box-shadow: 0 18px 50px rgba(15,23,42,0.08);
          padding: 20px;
          min-width: 0;
        }
        .panel h2 {
          margin: 0 0 8px;
          font-size: 20px;
          font-weight: 900;
        }
        .panel p.lead {
          margin: 0 0 18px;
          color: #64748b;
          font-size: 14px;
        }
        .calendar-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .calendar-nav-btn {
          border: none;
          background: transparent;
          color: #64748b;
          cursor: pointer;
          padding: 8px;
        }
        .calendar-month-title {
          font-size: 16px;
          font-weight: 900;
          color: #0f172a;
        }
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 8px;
          text-align: center;
        }
        .cal-weekday {
          font-size: 13px;
          font-weight: 800;
          color: #94a3b8;
          margin-bottom: 8px;
        }
        .cal-day-btn {
          background: transparent;
          border: 1px solid transparent;
          border-radius: 8px;
          padding: 10px 0;
          font-size: 15px;
          color: #cbd5e1;
          font-weight: 700;
          cursor: default;
        }
        .cal-day-btn.outside {
          visibility: hidden;
        }
        .cal-day-btn.bookable {
          color: #0f172a;
          cursor: pointer;
          border: 1px solid #e2e8f0;
        }
        .cal-day-btn.selected {
          background: #f59e0b;
          color: white;
          border-color: #f59e0b;
          font-weight: 900;
        }
        .time-slots-container {
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid #e2e8f0;
        }
        .slot-group {
          margin-bottom: 24px;
        }
        .slot-group-title {
          font-size: 14px;
          font-weight: 900;
          color: #64748b;
          margin-bottom: 12px;
        }
        .slot-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
          gap: 10px;
        }
        .slot-btn {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 12px 0;
          font-size: 15px;
          font-weight: 700;
          color: #334155;
          cursor: pointer;
          transition: all 0.2s;
        }
        .slot-btn:not(.booked):hover {
          border-color: #cbd5e1;
          background: #f1f5f9;
        }
        .slot-btn.selected {
          background: #f59e0b;
          color: white;
          border-color: #f59e0b;
        }
        .slot-btn.booked {
          opacity: 0.5;
          cursor: not-allowed;
          background: #f1f5f9;
        }
        .plan-list {
          display: grid;
          gap: 12px;
        }
        .plan-card {
          border: 1px solid #dbeafe;
          border-radius: 20px;
          background: #f8fbff;
          padding: 16px;
          cursor: pointer;
        }
        .plan-card.disabled {
          background: #f1f5f9;
          border-color: #e2e8f0;
          color: #94a3b8;
          cursor: not-allowed;
        }
        .plan-card.active {
          background: #eff6ff;
          border-color: #2563eb;
          box-shadow: 0 12px 24px rgba(37, 99, 235, 0.14);
        }
        .plan-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
        }
        .plan-title {
          font-size: 16px;
          font-weight: 900;
        }
        .plan-meta {
          margin-top: 6px;
          color: #64748b;
          font-size: 13px;
        }
        .field-label {
          display: block;
          font-size: 12px;
          font-weight: 900;
          color: #64748b;
          margin-bottom: 8px;
        }
        .field, .select {
          width: 100%;
          padding: 12px 14px;
          border-radius: 14px;
          border: 1px solid #cbd5e1;
          background: white;
          font-size: 14px;
        }
        .form-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }
        .form-stack {
          display: grid;
          gap: 14px;
        }
        .action-row {
          display: flex;
          gap: 10px;
          margin-top: 18px;
        }
        .ghost-btn, .primary-btn {
          flex: 1;
          border: none;
          border-radius: 16px;
          padding: 14px;
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
        }
        .ghost-btn {
          background: #e2e8f0;
          color: #0f172a;
        }
        .primary-btn {
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: white;
          box-shadow: 0 16px 30px rgba(37, 99, 235, 0.22);
        }
        .side-panel {
          display: grid;
          gap: 18px;
          min-width: 0;
        }
        .review-list {
          display: grid;
          gap: 14px;
        }
        .review-card {
          border-top: 1px solid #e2e8f0;
          padding-top: 14px;
        }
        @media (max-width: 980px) {
          .content-grid {
            grid-template-columns: 1fr;
          }
          .hero-stats {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 640px) {
          .coach-detail-shell {
            width: calc(100vw - 16px);
          }
          .hero-main {
            flex-direction: column;
            align-items: flex-start;
          }
          .hero-stats {
            grid-template-columns: 1fr;
          }
          .form-grid {
            grid-template-columns: 1fr;
          }
          .action-row {
            flex-direction: column;
          }
        }
      ` }} />

      <div className="coach-detail-shell">
        <section className="hero">
          <div className="hero-top">
            <button type="button" className="back-btn" onClick={() => router.back()}>
              <ChevronLeft size={18} />
            </button>
            <div className="hero-badge">
              <GraduationCap size={14} />
              {coach.coach_level_label}
            </div>
          </div>

          <div className="hero-main">
            <div className="avatar">
              {coach.avatar_url ? (
                <img src={coach.avatar_url} alt={coach.name} className="h-full w-full object-cover" />
              ) : (
                coach.name?.slice(0, 1) || '教'
              )}
            </div>
            <div>
              <h1>{coach.name}</h1>
              <div className="hero-meta">
                <span>{coach.university || '未填學校'}</span>
                <span>•</span>
                <span>{coach.location || '未填地區'}</span>
                <span>•</span>
                <span>{coach.has_fixed_schedule ? '可直接依時段預約' : '尚未設定固定時段'}</span>
              </div>
            </div>
          </div>

          <div className="hero-stats">
            <div className="hero-stat">
              <div className="hero-stat-label">單堂起價</div>
              <div className="hero-stat-value">NT${Number(coach.base_price || 0).toLocaleString()}</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-label">最快可約</div>
              <div className="hero-stat-value">{formatNextAvailable(coach.next_available_at)}</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-label">評價</div>
              <div className="hero-stat-value">{coach.rating_avg || 0} / 5</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-label">方案數</div>
              <div className="hero-stat-value">{planOptions.length} 種</div>
            </div>
          </div>
        </section>

        {/* 1. 最上方：先聊聊 */}
        <div style={{ marginTop: 20 }}>
          <button type="button" className="ghost-btn" onClick={handleChat} style={{ width: '100%', padding: '16px', borderRadius: 20, background: '#fff', border: '1px solid #cbd5e1', fontSize: 16, color: '#334155' }}>
            <MessageCircle size={18} style={{ verticalAlign: 'text-bottom', marginRight: 8 }} />
            有任何問題？先與教練聊聊
          </button>
        </div>

        <section className="content-grid" style={{ gridTemplateColumns: '1fr', gap: 20 }}>
          
          {/* 2. 上方區塊：教練資訊與家長須知 */}
          <div className="panel">
            <h2>教學資訊與家長須知</h2>
            {coach.trust_badges && coach.trust_badges.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                {coach.trust_badges.includes('coach_license') && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F0FDF4', color: '#166534', padding: '6px 12px', borderRadius: 20, fontSize: 13, fontWeight: 800 }}>
                    <ShieldCheck size={16} /> 特定球類教練認證
                  </div>
                )}
                {coach.trust_badges.includes('cpr_aed') && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#FEF2F2', color: '#991B1B', padding: '6px 12px', borderRadius: 20, fontSize: 13, fontWeight: 800 }}>
                    <Shield size={16} /> CPR/AED 急救認證
                  </div>
                )}
                {coach.trust_badges.includes('police_check') && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#EFF6FF', color: '#1E40AF', padding: '6px 12px', borderRadius: 20, fontSize: 13, fontWeight: 800 }}>
                    <ShieldCheck size={16} /> 良民證 (無犯罪紀錄)
                  </div>
                )}
              </div>
            )}
            <div style={{ display: 'grid', gap: 10, color: '#334155', fontSize: 14, marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid #E2E8F0' }}>
              <div><MapPin size={15} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} /> {coach.location || '未填地區'}</div>
              <div><Clock3 size={15} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} /> {coach.has_fixed_schedule ? '已有固定可約時段' : '尚未設定固定時段'}</div>
              <div><Star size={15} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} /> {coach.rating_avg || 0} / 5，共 {coach.review_count || 0} 則評價</div>
            </div>

            <div style={{ marginBottom: 32 }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, color: '#0F172A', marginBottom: 12 }}><FileDigit size={18} color="#2563EB" /> 核心教學理念</h3>
              <p className="lead" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, margin: 0 }}>{coach.philosophy || '教練尚未填寫教學理念。'}</p>
            </div>
            {coach.teaching_features && (
              <div style={{ marginBottom: 32 }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, color: '#0F172A', marginBottom: 12 }}><BookOpen size={18} color="#2563EB" /> 課程特色與預期成長</h3>
                <p className="lead" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, margin: 0 }}>{coach.teaching_features}</p>
              </div>
            )}
            {coach.communication_style && (
              <div style={{ marginBottom: 32 }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, color: '#0F172A', marginBottom: 12 }}><Mail size={18} color="#2563EB" /> 家長溝通機制</h3>
                <p className="lead" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, margin: 0 }}>{coach.communication_style}</p>
              </div>
            )}
            {coach.policy_rules && (
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, color: '#0F172A', marginBottom: 12 }}><DollarSign size={18} color="#2563EB" /> 費用、請假與場地規則</h3>
                <div style={{ background: '#F8FAFC', padding: 16, borderRadius: 12, border: '1px solid #E2E8F0' }}>
                  <p style={{ color: '#475569', fontSize: 14, whiteSpace: 'pre-wrap', lineHeight: 1.7, margin: 0 }}>{coach.policy_rules}</p>
                </div>
              </div>
            )}
          </div>

          <div className="panel">
            <h2>影片</h2>
            <p className="lead">教學與自我介紹影片會顯示在這裡。</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, color: '#64748b', fontSize: 13 }}>
              <Video size={15} /> 目前共 {videos.length} 支
            </div>
            <VideoGallery videos={videos} />
          </div>

          <div className="panel">
            <h2>評價</h2>
            <p className="lead">先看時段，也要快速確認過往上課回饋。</p>
            {reviews.length === 0 ? (
              <div style={{ color: '#64748b', fontSize: 14 }}>目前還沒有評價。</div>
            ) : (
              <div className="review-list">
                {reviews.map((review) => (
                  <div key={review.id} className="review-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                      <div style={{ fontWeight: 900, color: '#0f172a' }}>{review.reviewer_name || '匿名學生'}</div>
                      <div style={{ color: '#f59e0b', fontWeight: 900 }}>{review.rating} / 5</div>
                    </div>
                    <div style={{ color: '#334155', fontSize: 14, lineHeight: 1.7 }}>{review.comment || '這則評價沒有文字內容。'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. 中間區塊：方案與預約 */}
          <div className="panel">
            <h2>預約日期與時段</h2>
            <p className="lead">請先點選日期，再選擇下方的可用時段。</p>
            
            <div className="calendar-nav">
              <button type="button" className="calendar-nav-btn" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft size={20} /></button>
              <div className="calendar-month-title">{format(currentMonth, 'yyyy年M月')}</div>
              <button type="button" className="calendar-nav-btn" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight size={20} /></button>
            </div>
            
            {(() => {
              const monthStart = startOfMonth(currentMonth);
              const monthEnd = endOfMonth(monthStart);
              const startDate = startOfWeek(monthStart);
              const endDate = endOfWeek(monthEnd);
              
              const dayNodes = [];
              let day = startDate;
              while (day <= endDate) {
                const cloneDay = day;
                const dateStr = format(day, 'yyyy-MM-dd');
                const hasSlots = monthAvailability.dateMap.get(dateStr);
                const isCurrentMonth = isSameMonth(day, monthStart);
                const isSelected = selectedDate === dateStr;
                const isPast = isBefore(startOfDay(day), startOfDay(new Date()));
                const clickable = hasSlots && !isPast;
                
                dayNodes.push(
                  <button
                    key={dateStr}
                    type="button"
                    disabled={!clickable}
                    className={`cal-day-btn ${!isCurrentMonth ? 'outside' : ''} ${clickable ? 'bookable' : ''} ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      if (clickable) {
                        setSelectedDate(dateStr);
                        setSelectedSlot(null); // Reset selected slot
                      }
                    }}
                  >
                    {format(day, 'd')}
                  </button>
                );
                day = addDays(day, 1);
              }
              
              return (
                <div className="calendar-grid">
                  {WEEKDAY_LABELS.map(wd => <div key={wd} className="cal-weekday">{wd}</div>)}
                  {dayNodes}
                </div>
              );
            })()}

            {/* 時段列表 */}
            {selectedDate ? (() => {
              const dateSlots = monthAvailability.slots.filter(s => s.date === selectedDate);
              
              const morningSlots = dateSlots.filter(s => parseInt(s.time.split(':')[0], 10) < 13);
              const afternoonSlots = dateSlots.filter(s => {
                const h = parseInt(s.time.split(':')[0], 10);
                return h >= 13 && h < 18;
              });
              const eveningSlots = dateSlots.filter(s => parseInt(s.time.split(':')[0], 10) >= 18);
              
              const renderSlotGroup = (title, slots) => {
                if (slots.length === 0) return null;
                return (
                  <div className="slot-group">
                    <div className="slot-group-title">{title}</div>
                    <div className="slot-grid">
                      {slots.map(slot => {
                        const isSelected = selectedSlot?.iso === slot.iso;
                        return (
                          <button
                            key={slot.iso}
                            type="button"
                            disabled={slot.booked}
                            className={`slot-btn ${slot.booked ? 'booked' : ''} ${isSelected ? 'selected' : ''}`}
                            onClick={() => setSelectedSlot(slot)}
                          >
                            {slot.time}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              };

              return (
                <div className="time-slots-container">
                  {dateSlots.length === 0 ? (
                    <div style={{ color: '#64748b', fontSize: 14 }}>這天沒有可預約的時段</div>
                  ) : (
                    <>
                      {renderSlotGroup('中午', morningSlots)}
                      {renderSlotGroup('下午', afternoonSlots)}
                      {renderSlotGroup('晚上', eveningSlots)}
                    </>
                  )}
                </div>
              );
            })() : (
              <div className="time-slots-container" style={{ borderTop: 'none', paddingTop: 0 }}>
                <div style={{ color: '#64748b', fontSize: 14 }}>請先在上方點選有空檔的日期</div>
              </div>
            )}
          </div>

          {/* 4. 下方區塊：購買課程 */}
          <div className="panel">
            <h2>選擇方案與填寫資料</h2>
            <div className="plan-list" style={{ marginBottom: 24 }}>
              {availablePlansForSlot.length ? availablePlansForSlot.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  className={`plan-card ${plan.available ? '' : 'disabled'} ${selectedPlanId === plan.id ? 'active' : ''}`}
                  disabled={!plan.available}
                  onClick={() => setSelectedPlanId(plan.id)}
                >
                  <div className="plan-top">
                    <div>
                      <div className="plan-title">{plan.title}</div>
                      <div className="plan-meta">{plan.duration_minutes} 分鐘</div>
                    </div>
                    <div className="plan-title">NT${Number(plan.price || 0).toLocaleString()}</div>
                  </div>
                  {!plan.available && <div className="plan-meta" style={{ color: '#94a3b8', marginTop: 10 }}>這個時段容納不了此方案長度</div>}
                </button>
              )) : (
                <div style={{ color: '#64748b', fontSize: 14 }}>先在上方時段表點選一個可約時段。</div>
              )}
            </div>

            <div className="form-stack">
              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div>
                  <label className="field-label">年級 / 年齡</label>
                  <input className="field" value={bookingForm.age} onChange={(event) => setBookingForm((current) => ({ ...current, age: event.target.value }))} placeholder="例如：大一 / 國三" />
                </div>
                <div>
                  <label className="field-label">性別</label>
                  <select className="select" value={bookingForm.gender} onChange={(event) => setBookingForm((current) => ({ ...current, gender: event.target.value }))}>
                    <option value="">請選擇</option>
                    <option value="男">男</option>
                    <option value="女">女</option>
                    <option value="其他">其他</option>
                  </select>
                </div>
              </div>

              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div>
                  <label className="field-label">上課人數</label>
                  <select className="select" value={bookingForm.attendeesCount} onChange={(event) => setBookingForm((current) => ({ ...current, attendeesCount: Number(event.target.value) }))}>
                    {[1, 2, 3, 4, 5].map((count) => <option key={count} value={count}>{count} 人</option>)}
                  </select>
                </div>
                <div>
                  <label className="field-label">學習狀態</label>
                  <select className="select" value={bookingForm.learningStatus} onChange={(event) => setBookingForm((current) => ({ ...current, learningStatus: event.target.value }))}>
                    <option value="初學">初學</option>
                    <option value="進階">進階</option>
                    <option value="穩定訓練">穩定訓練</option>
                    <option value="比賽準備">比賽準備</option>
                  </select>
                </div>
              </div>

              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div>
                  <label className="field-label">預約模式</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" onClick={() => setBookingForm(c => ({...c, isRecurring: false}))} style={{ flex: 1, padding: '10px', borderRadius: 12, border: bookingForm.isRecurring ? '1px solid #cbd5e1' : '2px solid #2563eb', background: bookingForm.isRecurring ? '#f8fafc' : '#eff6ff', color: bookingForm.isRecurring ? '#64748b' : '#1d4ed8', fontWeight: 700, cursor: 'pointer' }}>單次</button>
                    <button type="button" onClick={() => setBookingForm(c => ({...c, isRecurring: true}))} style={{ flex: 1, padding: '10px', borderRadius: 12, border: !bookingForm.isRecurring ? '1px solid #cbd5e1' : '2px solid #2563eb', background: !bookingForm.isRecurring ? '#f8fafc' : '#eff6ff', color: !bookingForm.isRecurring ? '#64748b' : '#1d4ed8', fontWeight: 700, cursor: 'pointer' }}>長期固定</button>
                  </div>
                </div>
                {bookingForm.isRecurring ? (
                  <div>
                    <label className="field-label">總堂數 (每週一堂)</label>
                    <select className="select" value={bookingForm.recurringWeeks} onChange={(e) => setBookingForm(c => ({...c, recurringWeeks: Number(e.target.value)}))}>
                      <option value={4}>連續 4 週</option>
                      <option value={8}>連續 8 週</option>
                      <option value={12}>連續 12 週</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="field-label">已選時段</label>
                    <input className="field" value={selectedSlot ? `${selectedSlot.date} ${selectedSlot.time}` : '請先點選上方時段'} readOnly />
                  </div>
                )}
              </div>

              {bookingForm.isRecurring && (
                <div>
                  <label className="field-label">首堂課時段 (後續將以每週自動順延)</label>
                  <input className="field" value={selectedSlot ? `${selectedSlot.date} ${selectedSlot.time}` : '請先點選上方時段'} readOnly />
                </div>
              )}

              <div>
                <label className="field-label">上課地址</label>
                <input
                  className="field"
                  value={bookingForm.address}
                  onChange={(event) => setBookingForm((current) => ({ ...current, address: event.target.value }))}
                  placeholder={userProfile?.address || '請輸入上課地址'}
                />
              </div>
            </div>
          </div>

        </section>

        {/* 5. 最底端：送出預約 */}
        <div style={{ position: 'sticky', bottom: 20, zIndex: 50, marginTop: 24, padding: '0 12px' }}>
          <div style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', padding: 16, borderRadius: 24, boxShadow: '0 12px 40px rgba(15,23,42,0.15)', border: '1px solid rgba(226,232,240,0.8)' }}>
            <button type="button" className="primary-btn" disabled={submitting} onClick={handleBooking} style={{ width: '100%', padding: '18px', fontSize: 16, borderRadius: 16, background: '#F59E0B', boxShadow: '0 8px 24px rgba(245, 158, 11, 0.3)', color: '#fff', border: 'none', fontWeight: 900, cursor: 'pointer' }}>
              <CalendarDays size={18} style={{ verticalAlign: 'text-bottom', marginRight: 8 }} />
              {submitting ? '建立預約中...' : `送出預約 (一次付清 NT$${((selectedPlan?.price || coach?.base_price || 0) * (bookingForm.isRecurring ? bookingForm.recurringWeeks : 1)).toLocaleString()})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
