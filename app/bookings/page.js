'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { ShoppingBag, Calendar, FileText, Loader2, Upload, ExternalLink, Wallet } from 'lucide-react';

const BLUE  = 'var(--color-primary)';
const DARK  = 'var(--color-text)';
const MUTED = 'var(--color-text-muted)';
const BG    = 'transparent';
const WHITE = 'var(--color-surface)';
const PAYMENT_SETTINGS_FALLBACK = {
  bank_name: '',
  bank_code: '',
  bank_account_name: '',
  bank_account_number: '',
};

const COACH_STATUS_GROUPS = [
  { label: '待付款', statuses: ['pending_payment'] },
  { label: '待確認', statuses: ['payment_submitted', 'payment_review', 'pending_confirmation', 'awaiting_confirmation'] },
  { label: '待上課', statuses: ['confirmed', 'scheduled'] },
  { label: '進行中', statuses: ['in_progress'] },
  { label: '待完課確認', statuses: ['pending_completion'] },
  { label: '待填課後日誌', statuses: ['report_required', 'needs_report', 'pending_report', 'lesson_log_required'] },
  { label: '已完成', statuses: ['completed'] },
  { label: '爭議中', statuses: ['dispute', 'disputed'] },
  { label: '已取消', statuses: ['cancelled', 'refunded', 'expired'] },
];

const STATUS_MAP = {
  pending_payment: '待學生付款',
  payment_submitted: '待確認',
  payment_review: '待確認',
  pending_confirmation: '待確認',
  awaiting_confirmation: '待確認',
  confirmed: '待上課',
  scheduled: '待上課',
  in_progress: '進行中',
  pending_completion: '待完課確認',
  report_required: '待填課後日誌',
  needs_report: '待填課後日誌',
  pending_report: '待填課後日誌',
  lesson_log_required: '待填課後日誌',
  completed: '已完成',
  dispute: '爭議中',
  disputed: '爭議中',
  cancelled: '已取消',
  refunded: '已取消',
  expired: '已取消',
};

const STUDENT_STATUS_MAP = {
  pending_payment: '待付款',
  payment_submitted: '付款確認中',
  payment_review: '付款確認中',
  pending_confirmation: '待確認',
  awaiting_confirmation: '待確認',
  confirmed: '預約成功',
  scheduled: '預約成功',
  in_progress: '進行中',
  pending_completion: '等候完課',
  report_required: '待教練填寫紀錄',
  needs_report: '待教練填寫紀錄',
  pending_report: '待教練填寫紀錄',
  lesson_log_required: '待教練填寫紀錄',
  completed: '已完成',
  dispute: '爭議中',
  disputed: '爭議中',
  cancelled: '已取消',
  refunded: '已退款',
  expired: '已取消',
};

const COACH_NEXT_STEP_COPY = {
  待付款: '等待學生完成全額付款，付款確認前不要視為正式排程。',
  待確認: '等待平台或學生完成確認，先保留溝通紀錄並避免承諾額外時段。',
  待上課: '準備上課，可前往聊天室確認地點。',
  進行中: '課程進行中，課後請填寫課後日誌並送出完課確認。',
  待完課確認: '請確認完課或填寫課後日誌。',
  待填課後日誌: '請先填寫課後日誌，讓學生能看到課程紀錄。',
  已完成: '已完成，可查看評價或紀錄。',
  爭議中: '等待平台處理，暫停撥款。',
  已取消: '訂單已取消，不需要再安排上課。',
};

const STUDENT_TASK_GROUPS = [
  { label: '下一堂課', statuses: ['confirmed', 'scheduled', 'in_progress'] },
  { label: '待處理', statuses: ['pending_payment', 'payment_submitted', 'payment_review', 'pending_confirmation', 'awaiting_confirmation'] },
  { label: '即將上課', statuses: ['confirmed', 'scheduled'] },
  { label: '課後追蹤', statuses: ['pending_completion', 'report_required', 'needs_report', 'pending_report', 'lesson_log_required'] },
  { label: '已完成', statuses: ['completed'] },
  { label: '已取消', statuses: ['cancelled', 'refunded', 'expired', 'dispute', 'disputed'] },
];

const STUDENT_NEXT_STEP_COPY = {
  pending_payment: '完成付款後，平台會保留你的預約並通知教練確認。',
  payment_submitted: '平台正在確認付款或時段，先保留聊天紀錄即可。',
  payment_review: '平台正在確認付款或時段，先保留聊天紀錄即可。',
  pending_confirmation: '平台正在確認付款或時段，先保留聊天紀錄即可。',
  awaiting_confirmation: '平台正在確認付款或時段，先保留聊天紀錄即可。',
  confirmed: '課程已確認，建議先到聊天室確認地點、器材或線上連結。',
  scheduled: '課程已確認，建議先到聊天室確認地點、器材或線上連結。',
  in_progress: '課程進行中，課後可以回來查看紀錄與後續安排。',
  pending_completion: '課後可以查看紀錄、補評價，或再約下一堂。',
  report_required: '課後可以查看紀錄、補評價，或再約下一堂。',
  needs_report: '課後可以查看紀錄、補評價，或再約下一堂。',
  pending_report: '課後可以查看紀錄、補評價，或再約下一堂。',
  lesson_log_required: '課後可以查看紀錄、補評價，或再約下一堂。',
  completed: '課程已完成，可以補評價或回到教練頁再約下一堂。',
  dispute: '平台正在協助處理，請先保留付款與聊天紀錄。',
  disputed: '平台正在協助處理，請先保留付款與聊天紀錄。',
  cancelled: '這堂課已取消，可重新找教練或再約其他時段。',
  refunded: '這堂課已退款，可重新找教練或再約其他時段。',
  expired: '付款保留時間已過，可重新預約適合的教練。',
};

const STATUS_STYLE = {
  pending_payment: { bg: 'var(--status-pending-bg)', color: 'var(--status-pending)' },
  payment_submitted: { bg: 'var(--status-pending-bg)', color: 'var(--status-pending)' },
  payment_review: { bg: 'var(--status-pending-bg)', color: 'var(--status-pending)' },
  pending_confirmation: { bg: 'var(--status-pending-bg)', color: 'var(--status-pending)' },
  awaiting_confirmation: { bg: 'var(--status-pending-bg)', color: 'var(--status-pending)' },
  completed: { bg: 'var(--status-paid-bg)', color: 'var(--status-paid)' },
  scheduled: { bg: 'var(--status-confirmed-bg)', color: 'var(--status-confirmed)' },
  confirmed: { bg: 'var(--status-confirmed-bg)', color: 'var(--status-confirmed)' },
  in_progress: { bg: 'var(--status-confirmed-bg)', color: 'var(--status-confirmed)' },
  pending_completion: { bg: 'var(--warning-bg)', color: 'var(--warning)' },
  report_required: { bg: 'var(--warning-bg)', color: 'var(--warning)' },
  needs_report: { bg: 'var(--warning-bg)', color: 'var(--warning)' },
  pending_report: { bg: 'var(--warning-bg)', color: 'var(--warning)' },
  lesson_log_required: { bg: 'var(--warning-bg)', color: 'var(--warning)' },
  dispute: { bg: 'rgba(239, 68, 68, 0.15)', color: 'var(--color-danger)' },
  disputed: { bg: 'rgba(239, 68, 68, 0.15)', color: 'var(--color-danger)' },
  default: { bg: 'rgba(239, 68, 68, 0.15)', color: 'var(--color-danger)' },
};

function getCoachBookingGroup(status) {
  return COACH_STATUS_GROUPS.find((group) => group.statuses.includes(status))?.label || '待確認';
}

function getStudentBookingGroup(status) {
  return STUDENT_TASK_GROUPS.find((group) => group.statuses.includes(status))?.label || '待處理';
}

function getStatusLabel(status, isCoach) {
  return (isCoach ? STATUS_MAP : STUDENT_STATUS_MAP)[status] || status || '狀態未明';
}

function statusStyle(status) {
  return STATUS_STYLE[status] || STATUS_STYLE.default;
}

export default function BookingsPage() {
  const { user, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewingBooking, setReviewingBooking] = useState(null);
  const [reviewData, setReviewData] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState(PAYMENT_SETTINGS_FALLBACK);
  const [paymentModalBooking, setPaymentModalBooking] = useState(null);
  const [paymentReceiptFile, setPaymentReceiptFile] = useState(null);
  const [paymentReceiptPreview, setPaymentReceiptPreview] = useState('');
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [reportingPayment, setReportingPayment] = useState(false);
  const [selectedCoachGroup, setSelectedCoachGroup] = useState('全部');
  const [selectedStudentGroup, setSelectedStudentGroup] = useState('全部');
  const [expandedBookingId, setExpandedBookingId] = useState(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const filter = searchParams.get('filter');
  const isCoach = user?.role === 'coach' || user?.role === 'admin';

  useEffect(() => {
    if (filter && isCoach) {
      if (filter === 'today') setSelectedCoachGroup('全部');
      else if (filter === 'pending_confirmation') setSelectedCoachGroup('待確認');
      else if (filter === 'pending_payment') setSelectedCoachGroup('待付款');
      else if (filter === 'pending_report') setSelectedCoachGroup('待填課後日誌');
    }
  }, [filter, isCoach]);

  useEffect(() => {
    if (!authLoading && !user) { router.push('/login'); return; }
    if (user) {
      fetchBookings();
      fetchPaymentSettings();
    }
  }, [user, authLoading]);

  const fetchBookings = async () => {
    try {
      const res = await fetch('/api/bookings');
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      if (!res.ok) return;
      const data = await res.json();
      if (data.settings) {
        setPaymentSettings((prev) => ({
          ...prev,
          ...data.settings,
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusUpdate = async (bookingId, newStatus) => {
    const res = await fetch(`/api/bookings/${bookingId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    const data = await res.json();
    if (res.ok) {
      fetchBookings();
    } else {
      // If completion blocked by missing report, go to report page
      if (data.error?.includes('learning report')) {
        router.push(`/reports/${bookingId}`);
      } else {
        alert(data.error || '操作失敗');
      }
    }
  };

  const [adjustingId, setAdjustingId] = useState(null);
  const [adjustmentValue, setAdjustmentValue] = useState(0);
  const [adjusting, setAdjusting] = useState(false);

  const handleConfirmPayment = async (bookingId) => {
    const res = await fetch(`/api/bookings/${bookingId}/confirm-payment`, {
      method: 'POST',
    });
    const data = await res.json();
    if (res.ok) {
      fetchBookings();
    } else {
      alert(data.error || '付款確認失敗');
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewingBooking) return;
    setSubmittingReview(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: reviewingBooking.id,
          rating: reviewData.rating,
          comment: reviewData.comment
        }),
      });
      if (res.ok) {
        alert('感謝您的評價！');
        setReviewingBooking(null);
        setReviewData({ rating: 5, comment: '' });
        fetchBookings();
      } else {
        const data = await res.json();
        alert(data.error || '提交失敗');
      }
    } catch (err) {
      console.error(err);
      alert('發生錯誤');
    } finally {
      setSubmittingReview(false);
    }
  };

  const resetPaymentModal = () => {
    if (paymentReceiptPreview) {
      URL.revokeObjectURL(paymentReceiptPreview);
    }
    setPaymentModalBooking(null);
    setPaymentReceiptFile(null);
    setPaymentReceiptPreview('');
    setUploadingReceipt(false);
    setReportingPayment(false);
  };

  const openPaymentModal = (booking) => {
    if (paymentReceiptPreview) {
      URL.revokeObjectURL(paymentReceiptPreview);
    }
    setPaymentModalBooking(booking);
    setPaymentReceiptFile(null);
    setPaymentReceiptPreview('');
  };

  const handleReceiptChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (paymentReceiptPreview) {
      URL.revokeObjectURL(paymentReceiptPreview);
    }
    setPaymentReceiptFile(file);
    setPaymentReceiptPreview(URL.createObjectURL(file));
  };

  const handleReportPayment = async () => {
    if (!paymentModalBooking) return;
    if (!paymentReceiptFile) {
      alert('請先選擇轉帳截圖');
      return;
    }

    setUploadingReceipt(true);
    try {
      const formData = new FormData();
      formData.append('file', paymentReceiptFile);
      formData.append('fileType', 'payment_receipt');

      const uploadRes = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(uploadData.error || '截圖上傳失敗');
      }

      setUploadingReceipt(false);
      setReportingPayment(true);

      const reportRes = await fetch(`/api/bookings/${paymentModalBooking.id}/report-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: uploadData.url }),
      });
      const reportData = await reportRes.json();
      if (!reportRes.ok) {
        throw new Error(reportData.error || '付款回報失敗');
      }

      await fetchBookings();
      resetPaymentModal();
      alert('已收到您的付款資訊，正在確認中（約1-10分鐘）');
    } catch (err) {
      console.error(err);
      alert(err.message || '付款回報失敗');
      setUploadingReceipt(false);
      setReportingPayment(false);
    }
  };

  const handleAdjustPrice = async (bookingId) => {
    const val = parseInt(adjustmentValue);
    if (isNaN(val) || val < -200 || val > 200) {
      return alert('調整金額限 ±200 元內');
    }

    setAdjusting(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/adjust-price`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adjustment: val }),
      });
      if (res.ok) {
        alert('金額已調整！');
        setAdjustingId(null);
        fetchBookings();
      } else {
        const data = await res.json();
        alert(data.error || '調整失敗');
      }
    } catch (err) {
      alert('發生系統錯誤');
    } finally {
      setAdjusting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', color: MUTED }}>
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  const hasPaymentAccountInfo = Boolean(
    paymentSettings.bank_name ||
    paymentSettings.bank_code ||
    paymentSettings.bank_account_name ||
    paymentSettings.bank_account_number
  );

  const coachGroupCounts = COACH_STATUS_GROUPS.reduce((acc, group) => {
    acc[group.label] = bookings.filter((booking) => getCoachBookingGroup(booking.status) === group.label).length;
    return acc;
  }, { 全部: bookings.length });
  const studentTaskCounts = STUDENT_TASK_GROUPS.reduce((acc, group) => {
    acc[group.label] = bookings.filter((booking) => getStudentBookingGroup(booking.status) === group.label).length;
    return acc;
  }, { 全部: bookings.length });
  const activeStudentBookings = bookings.filter((booking) => ['pending_payment', 'payment_submitted', 'payment_review', 'pending_confirmation', 'awaiting_confirmation', 'confirmed', 'scheduled', 'in_progress', 'pending_completion', 'report_required', 'needs_report', 'pending_report', 'lesson_log_required'].includes(booking.status));
  const studentNextBooking = activeStudentBookings
    .slice()
    .sort((a, b) => new Date(a.expected_time || a.created_at || 0) - new Date(b.expected_time || b.created_at || 0))[0] || bookings[0];
  const visibleBookings = isCoach && selectedCoachGroup !== '全部'
    ? bookings.filter((booking) => getCoachBookingGroup(booking.status) === selectedCoachGroup)
    : !isCoach && selectedStudentGroup !== '全部'
      ? bookings.filter((booking) => getStudentBookingGroup(booking.status) === selectedStudentGroup)
      : bookings;

  const finalVisibleBookings = visibleBookings.filter((booking) => {
    if (isCoach && filter === 'today') {
      if (!booking.expected_time) return false;
      return new Date(booking.expected_time).toDateString() === new Date().toDateString();
    }
    return true;
  });

  return (
    <div style={{ padding: '20px 16px', background: BG, minHeight: '100vh', paddingBottom: 100 }}>

      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: DARK, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
          <ShoppingBag size={24} />
          {isCoach ? '教學訂單' : '我的課程'}
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: MUTED, lineHeight: 1.6 }}>
          {isCoach
            ? '用狀態分組快速判斷下一步：先處理待付款、待確認與待完課確認的訂單'
            : '先看下一步，不用翻訂單狀態；付款、確認、上課與課後紀錄都在這裡。'}
        </p>
      </header>

      {isCoach && bookings.length > 0 && (
        <section style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {['全部', ...COACH_STATUS_GROUPS.map((group) => group.label)].map((groupLabel) => {
              const active = selectedCoachGroup === groupLabel;
              const count = coachGroupCounts[groupLabel] || 0;
              return (
                <button
                  key={groupLabel}
                  onClick={() => setSelectedCoachGroup(groupLabel)}
                  style={{
                    flex: '0 0 auto',
                    border: `1px solid ${active ? BLUE : 'var(--color-border)'}`,
                    background: active ? BLUE : 'var(--color-surface)',
                    color: active ? 'var(--text-light)' : DARK,
                    borderRadius: 999,
                    padding: '8px 12px',
                    fontSize: 12,
                    fontWeight: 900,
                    cursor: 'pointer',
                    boxShadow: active ? 'var(--shadow-card)' : 'none',
                  }}
                >
                  {groupLabel} · {count}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {!isCoach && bookings.length > 0 && (
        <section style={{ display: 'grid', gap: 12, marginBottom: 18 }}>
          {studentNextBooking && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(255,138,61,0.16), rgba(59,130,246,0.08))',
              border: '1px solid rgba(255,255,255,0.08)', borderRadius: 22, padding: 18,
              boxShadow: 'var(--shadow-card)'
            }}>
              <div style={{ fontSize: 12, color: MUTED, fontWeight: 900, marginBottom: 6 }}>下一堂課</div>
              <div style={{ color: DARK, fontSize: 18, fontWeight: 950, marginBottom: 6 }}>
                {studentNextBooking.service_title || studentNextBooking.plan_title || studentNextBooking.coach_name || '待確認課程'}
              </div>
              <div style={{ color: MUTED, fontSize: 12, fontWeight: 750, lineHeight: 1.6 }}>
                {studentNextBooking.expected_time ? new Date(studentNextBooking.expected_time).toLocaleString('zh-TW', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '時間待教練確認'} · {getStatusLabel(studentNextBooking.status, false)}
              </div>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {[
              ['下一堂課', activeStudentBookings.length],
              ['待處理', studentTaskCounts['待處理'] || 0],
              ['已完成', studentTaskCounts['已完成'] || 0],
            ].map(([label, count]) => (
              <div key={label} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 12 }}>
                <div style={{ color: DARK, fontWeight: 950, fontSize: 18 }}>{count}</div>
                <div style={{ color: MUTED, fontWeight: 800, fontSize: 11, marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {['全部', ...STUDENT_TASK_GROUPS.map((group) => group.label)].map((groupLabel) => {
              const active = selectedStudentGroup === groupLabel;
              const count = studentTaskCounts[groupLabel] || 0;
              return (
                <button
                  key={groupLabel}
                  onClick={() => setSelectedStudentGroup(groupLabel)}
                  style={{
                    flex: '0 0 auto', border: `1px solid ${active ? BLUE : 'var(--color-border)'}`,
                    background: active ? BLUE : 'var(--color-surface)', color: active ? 'var(--text-light)' : DARK,
                    borderRadius: 999, padding: '8px 12px', fontSize: 12, fontWeight: 900, cursor: 'pointer'
                  }}
                >
                  {groupLabel} · {count}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {bookings.length === 0 ? (
        <div style={{
          background: 'var(--color-surface)', borderRadius: 20, padding: '48px 20px',
          textAlign: 'center', boxShadow: 'var(--shadow-card)', border: '1px solid var(--color-border)'
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
          <p style={{ fontSize: 16, fontWeight: 700, color: DARK, margin: '0 0 6px' }}>目前沒有訂單</p>
          <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>
            {isCoach ? '目前還沒有預約。確認你的課程方案、可上課時段與公開教練頁已完成，學生就能開始預約你。' : '目前還沒有課程。先找一位適合的教練，從聊天確認需求再預約第一堂。'}
          </p>
          {isCoach ? (
            <button
              onClick={() => router.push('/dashboard/coach')}
              style={{ marginTop: 20, padding: '10px 28px', background: BLUE, color: 'var(--text-light)', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              檢查接單狀態 →
            </button>
          ) : (
            <button
              onClick={() => router.push('/coaches')}
              style={{ marginTop: 20, padding: '10px 28px', background: BLUE, color: 'var(--text-light)', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              去找教練 →
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {finalVisibleBookings.length === 0 ? (
            <div style={{
              background: 'var(--color-surface)', borderRadius: 18, padding: 20,
              border: '1px solid var(--color-border)', color: MUTED, fontSize: 13, fontWeight: 700, textAlign: 'center'
            }}>
              這個分組目前沒有訂單。
            </div>
          ) : finalVisibleBookings.map(b => {
            const ss = statusStyle(b.status);
            const coachGroup = getCoachBookingGroup(b.status);
            const studentGroup = getStudentBookingGroup(b.status);
            const nextStepCopy = COACH_NEXT_STEP_COPY[coachGroup];
            const studentNextStepCopy = STUDENT_NEXT_STEP_COPY[b.status] || '先查看課程狀態，需要時可到聊天室確認下一步。';
            const canStartReport = isCoach && ['scheduled', 'confirmed', 'in_progress', 'pending_completion', 'report_required', 'needs_report', 'pending_report', 'lesson_log_required'].includes(b.status);
            const canConfirmCompletion = isCoach && ['pending_completion', 'in_progress'].includes(b.status);
            const isCompleted = b.status === 'completed';
            const isPendingPayment = b.status === 'pending_payment';
            const isCancelled = ['cancelled', 'refunded', 'expired'].includes(b.status);
            const hasReceipt = Boolean(b.payment_reference);
            const paymentExpiresAt = b.payment_expires_at ? new Date(b.payment_expires_at) : null;
            return (
              <div key={b.id} style={{
                background: 'var(--color-surface)', borderRadius: 20, padding: 18,
                boxShadow: 'var(--shadow-card)',
                border: '1px solid var(--color-border)',
              }}>
                {/* Top row: person + status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 44, height: 44, background: 'rgba(96, 165, 250, 0.1)', color: 'var(--color-primary)',
                      borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 900, fontSize: 16,
                    }}>
                      {(isCoach ? b.user_name : b.coach_name)?.charAt(0) || '?'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, color: DARK, fontSize: 14 }}>
                        {isCoach ? (b.user_name || '學員') : (b.coach_name || '教練')}
                      </div>
                      <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
                        #{b.id.substring(0, 8)}
                      </div>
                    </div>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '5px 10px',
                    borderRadius: 100, background: ss.bg, color: ss.color,
                  }}>
                    {getStatusLabel(b.status, isCoach)}
                  </span>
                </div>

                {/* Meta row: date + price */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  borderTop: '1px solid var(--color-border)', paddingTop: 12, marginBottom: canStartReport || isCompleted || isPendingPayment ? 12 : 0,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: DARK, fontSize: 13, fontWeight: 700 }}>
                    <Calendar size={13} color={BLUE} />
                    {b.expected_time ? new Date(b.expected_time).toLocaleString('zh-TW', {
                      year: 'numeric', month: 'long', day: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    }) : '時間待定'}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {(b.discount_amount > 0 || b.price_adjustment !== 0) && (
                      <div style={{ fontSize: 11, color: MUTED, marginBottom: 2 }}>
                        ${b.base_price?.toLocaleString()}
                        {b.discount_amount > 0 && ` - 折扣 $${b.discount_amount}`}
                        {b.price_adjustment !== 0 && ` ${b.price_adjustment > 0 ? '+' : ''} 議價 $${b.price_adjustment}`}
                      </div>
                    )}
                    <div style={{ fontWeight: 900, color: DARK, fontSize: 15 }}>
                      全額 NT${b.final_price?.toLocaleString() ?? '--'}
                    </div>
                  </div>
                </div>

                {isCoach && (
                  <div style={{
                    borderTop: '1px solid var(--color-border)',
                    paddingTop: 12,
                    marginTop: 12,
                    marginBottom: 12,
                    background: 'var(--color-surface-soft)',
                    borderRadius: 14,
                    padding: 12,
                  }}>
                    <div style={{ fontSize: 11, color: MUTED, fontWeight: 900, marginBottom: 4 }}>下一步</div>
                    <div style={{ color: DARK, fontSize: 13, fontWeight: 800, lineHeight: 1.55 }}>
                      {nextStepCopy}
                    </div>
                  </div>
                )}

                {!isCoach && (
                  <div className="student-next-step-card" style={{
                    borderTop: '1px solid var(--color-border)', paddingTop: 12, marginTop: 12, marginBottom: 12,
                    background: studentGroup === '待處理' ? 'var(--warning-bg)' : 'var(--color-surface-soft)',
                    borderRadius: 14, padding: 12,
                  }}>
                    <div style={{ fontSize: 11, color: MUTED, fontWeight: 900, marginBottom: 4 }}>下一步 · {studentGroup}</div>
                    <div style={{ color: DARK, fontSize: 13, fontWeight: 800, lineHeight: 1.55 }}>
                      {studentNextStepCopy}
                    </div>
                  </div>
                )}

                {!isCoach && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', borderTop: '1px solid var(--color-border)', paddingTop: 12, marginTop: 12 }}>
                    {!isCompleted && !isCancelled && !isPendingPayment && (
                      <button
                        onClick={() => router.push('/chat')}
                        style={{ flex: '1 1 140px', padding: '10px', borderRadius: 12, border: 'none', background: BLUE, color: 'var(--text-light)', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}
                      >
                        前往聊天
                      </button>
                    )}
                    {isPendingPayment && (
                      <button
                        onClick={() => openPaymentModal(b)}
                        style={{ flex: '1 1 140px', padding: '10px', borderRadius: 12, border: 'none', background: BLUE, color: 'var(--text-light)', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}
                      >
                        完成付款
                      </button>
                    )}
                    <button
                      onClick={() => setExpandedBookingId(expandedBookingId === b.id ? null : b.id)}
                      style={{ flex: '1 1 120px', padding: '10px', borderRadius: 12, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: DARK, fontWeight: 800, fontSize: 13, cursor: 'pointer' }}
                    >
                      查看課程
                    </button>
                  </div>
                )}

                {isCoach && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', borderTop: '1px solid var(--color-border)', paddingTop: 12, marginTop: 12 }}>
                    {!isCompleted && !isCancelled && (
                      <button
                        onClick={() => router.push('/chat')}
                        style={{ flex: '1 1 140px', padding: '10px', borderRadius: 12, border: 'none', background: BLUE, color: 'var(--text-light)', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}
                      >
                        前往聊天
                      </button>
                    )}
                    {canStartReport && !isCompleted && !isCancelled && (
                      <button
                        onClick={() => router.push(`/reports/${b.id}`)}
                        style={{ flex: '1 1 140px', padding: '10px', borderRadius: 12, border: `1px solid ${BLUE}`, background: 'var(--color-surface)', color: BLUE, fontWeight: 800, fontSize: 13, cursor: 'pointer' }}
                      >
                        <FileText size={14} /> 填寫課後日誌
                      </button>
                    )}
                    {canConfirmCompletion && !isCompleted && !isCancelled && (
                      <button
                        onClick={() => handleStatusUpdate(b.id, 'completed')}
                        style={{ flex: '1 1 140px', padding: '10px', borderRadius: 12, border: 'none', background: 'var(--success)', color: 'var(--text-light)', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}
                      >
                        確認完課
                      </button>
                    )}
                    <button
                      onClick={() => setExpandedBookingId(expandedBookingId === b.id ? null : b.id)}
                      style={{ flex: '1 1 120px', padding: '10px', borderRadius: 12, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: DARK, fontWeight: 800, fontSize: 13, cursor: 'pointer' }}
                    >
                      查看訂單
                    </button>
                  </div>
                )}

                {expandedBookingId === b.id && (
                  <div style={{ marginTop: 12, padding: 12, borderRadius: 14, background: 'var(--color-surface-soft)', color: MUTED, fontSize: 12, lineHeight: 1.7, fontWeight: 700 }}>
                    <div>訂單編號：#{b.id}</div>
                    <div>課程：{b.service_title || b.plan_title || '未命名課程'}</div>
                    <div>目前狀態：{getStatusLabel(b.status, isCoach)}</div>
                    <div>預計時間：{b.expected_time ? new Date(b.expected_time).toLocaleString('zh-TW') : '時間待定'}</div>
                  </div>
                )}

                {isPendingPayment && (
                  <div style={{
                    borderTop: '1px solid var(--color-border)', paddingTop: 12, marginTop: 12,
                    background: 'var(--warning-bg)', borderRadius: 14, padding: 12,
                    color: 'var(--warning)', fontSize: 12, fontWeight: 700, lineHeight: 1.5,
                  }}>
                    {isCoach
                      ? '此訂單尚未付款確認，請勿視為正式排程。'
                      : hasReceipt
                        ? '已收到您的付款資訊，正在確認中（約1-10分鐘）。'
                        : '為確保預約成功，請依照全額付款金額轉帳。轉帳後上傳截圖即可進入人工確認。'}
                    {paymentExpiresAt && (
                      <div style={{ fontWeight: 600, marginTop: 4 }}>
                        保留至：{paymentExpiresAt.toLocaleString('zh-TW', { hour: '2-digit', minute: '2-digit', month: 'numeric', day: 'numeric' })}
                      </div>
                    )}
                    {!isCoach && hasReceipt && (
                      <a
                        href={b.payment_reference}
                        target="_blank"
                        rel="noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, color: 'var(--warning)', fontWeight: 800, textDecoration: 'none' }}
                      >
                        <ExternalLink size={14} />
                        查看已上傳截圖
                      </a>
                    )}
                  </div>
                )}

                {/* Price Adjust Actions (Coach Only) */}
                {isCoach && !isCompleted && !isPendingPayment && !isCancelled && (
                  <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 12, paddingTop: 12 }}>
                    {adjustingId === b.id ? (
                      <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                         <div style={{ flex: 1, position:'relative' }}>
                            <span style={{ position:'absolute', left: 10, top:'50%', transform:'translateY(-50%)', fontSize:12, color:MUTED }}>±</span>
                            <input
                              type="number"
                              value={adjustmentValue}
                              onChange={e => setAdjustmentValue(e.target.value)}
                              placeholder="金額 (限制 ±200)"
                              style={{ width:'100%', padding:'8px 8px 8px 24px', borderRadius:8, border:`1px solid var(--color-border)`, background: 'var(--color-surface-soft)', color: DARK, fontSize:13 }}
                            />
                         </div>
                         <button
                           onClick={() => handleAdjustPrice(b.id)}
                           disabled={adjusting}
                           style={{ padding:'8px 16px', borderRadius:8, background:BLUE, color:'var(--text-light)', fontSize:12, fontWeight:700, border:'none', cursor:'pointer' }}
                         >
                           {adjusting ? '...' : '確認'}
                         </button>
                         <button
                           onClick={() => setAdjustingId(null)}
                           style={{ padding:'8px 12px', borderRadius:8, background:'var(--color-surface-soft)', color:MUTED, fontSize:12, fontWeight:700, border:'none', cursor:'pointer' }}
                         >
                           取消
                         </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setAdjustingId(b.id); setAdjustmentValue(b.price_adjustment || 0); }}
                        style={{ background:'none', border:`1px solid var(--color-border)`, padding:'6px 12px', borderRadius:8, fontSize:12, fontWeight:700, color:DARK, cursor:'pointer' }}
                      >
                        📝 議價 / 調整金額
                      </button>
                    )}
                  </div>
                )}

                {/* Completed badge and review actions */}
                {isCompleted && (
                  <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
                    {!isCoach && !b.review_id ? (
                      <button
                        onClick={() => setReviewingBooking(b)}
                        style={{
                          width: '100%', padding: '10px', borderRadius: 12, border: `1px solid ${BLUE}`,
                          background: 'var(--color-surface)', color: BLUE, fontWeight: 700, fontSize: 13, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}
                      >
                        ⭐ 撰寫評價
                      </button>
                    ) : (
                      <div style={{
                        fontSize: 12, color: 'var(--success)', fontWeight: 700, textAlign: 'center',
                      }}>
                        ✅ {isCoach ? '課程已完成，學習紀錄卡已歸檔' : (b.review_id ? '感謝您的評價！' : '課程已完成')}
                      </div>
                    )}
                  </div>
                )}

                {!isCoach && b.status === 'scheduled' && (
                  <div style={{
                    borderTop: '1px solid var(--color-border)',
                    paddingTop: 12,
                    marginTop: 12,
                    fontSize: 12,
                    fontWeight: 800,
                    color: 'var(--success)',
                    background: 'var(--success-bg)',
                    borderRadius: 14,
                    padding: 12,
                  }}>
                    預約成功，教練已收到您的訂單。
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Review Modal ─────────────────────────────────────── */}
      {reviewingBooking && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100, padding: 20,
        }}>
          <div style={{
            background: 'var(--color-surface)', borderRadius: 16, width: '100%', maxWidth: 400, padding: 24,
            boxShadow: 'var(--shadow-card)', border: '1px solid var(--color-border)'
          }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 900, color: DARK }}>撰寫評價</h2>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: MUTED }}>
              為教練 <b>{reviewingBooking.coach_name}</b> 的表現評分
            </p>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 24 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setReviewData({ ...reviewData, rating: star })}
                  style={{
                    background: 'none', border: 'none', fontSize: 32, cursor: 'pointer',
                    color: star <= reviewData.rating ? '#F59E0B' : 'var(--color-border)',
                    transition: 'transform 0.1s',
                    transform: star <= reviewData.rating ? 'scale(1.1)' : 'scale(1)',
                  }}
                >
                  ★
                </button>
              ))}
            </div>

            <textarea
              placeholder="說點什麼吧...（選填）"
              value={reviewData.comment}
              onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
              style={{
                width: '100%', minHeight: 100, padding: 16, borderRadius: 16, border: '1px solid var(--color-border)',
                background: 'var(--color-surface-soft)', color: DARK, fontSize: 14, marginBottom: 20, resize: 'none',
              }}
            />

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => { setReviewingBooking(null); setReviewData({ rating: 5, comment: '' }); }}
                style={{ flex: 1, padding: 14, borderRadius: 12, border: 'none', background: 'var(--color-surface-soft)', color: MUTED, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
              >
                取消
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={submittingReview}
                style={{
                  flex: 2, padding: 14, borderRadius: 12, border: 'none', background: BLUE, color: 'var(--text-light)',
                  fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: submittingReview ? 0.7 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                {submittingReview ? <Loader2 className="animate-spin" size={18} /> : '提交評價'}
              </button>
            </div>
          </div>
        </div>
      )}

      {paymentModalBooking && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 120, padding: 16,
        }}>
          <div style={{
            width: '100%', maxWidth: 480, background: 'var(--color-surface)', borderRadius: 16, padding: 24,
            boxShadow: 'var(--shadow-card)', border: '1px solid var(--color-border)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 18 }}>
              <div>
                <h2 style={{ margin: 0, color: DARK, fontWeight: 900, fontSize: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Wallet size={18} color={BLUE} />
                  回報匯款截圖
                </h2>
                <p style={{ margin: '8px 0 0', color: MUTED, fontSize: 13, lineHeight: 1.6 }}>
                  請依照下列平台收款資訊完成全額轉帳，再上傳截圖。送出後管理員會進行人工對帳。
                </p>
              </div>
              <button
                onClick={resetPaymentModal}
                style={{ border: 'none', background: 'var(--color-surface-soft)', color: MUTED, width: 36, height: 36, borderRadius: 12, cursor: 'pointer', fontWeight: 900 }}
              >
                ×
              </button>
            </div>

            <div style={{ background: 'var(--color-surface-soft)', borderRadius: 18, padding: 16, marginBottom: 16, display: 'grid', gap: 10 }}>
              <div style={{ fontSize: 12, color: MUTED, fontWeight: 700 }}>付款流程</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['待付款', '確認中', '已付款'].map((step, index) => (
                  <span key={step} style={{ fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 999, background: index === 0 ? 'var(--status-pending-bg)' : index === 1 ? 'rgba(148,163,184,0.10)' : 'var(--status-paid-bg)', color: index === 0 ? 'var(--status-pending)' : index === 1 ? MUTED : 'var(--status-paid)' }}>
                    {step}
                  </span>
                ))}
              </div>
              <div style={{ fontSize: 12, color: MUTED, fontWeight: 700 }}>平台收款帳號</div>
              <div style={{ display: 'grid', gap: 8, color: DARK, fontSize: 14, fontWeight: 700 }}>
                <div>銀行代碼：{paymentSettings.bank_code || '尚未設定'}</div>
                <div>帳號：{paymentSettings.bank_account_number || '尚未設定'}</div>
              </div>
              {!hasPaymentAccountInfo && (
                <div style={{ fontSize: 12, color: 'var(--warning)', fontWeight: 700, lineHeight: 1.6 }}>
                  管理員尚未設定正式收款帳號。請先補齊後台付款設定，再請學員進行匯款。
                </div>
              )}
            </div>

            <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.22)', borderRadius: 18, padding: 16, marginBottom: 16 }}>
              <div style={{ color: DARK, fontSize: 14, fontWeight: 900, marginBottom: 8 }}>平台保障提醒</div>
              <ul style={{ margin: 0, paddingLeft: 18, color: MUTED, fontSize: 12, lineHeight: 1.65, fontWeight: 700 }}>
                <li>全額付款由平台保管，教練還沒確認前不會直接撥款。</li>
                <li>教練如果臨時沒有出現，請先保留聊天紀錄與付款資訊，平台會協助確認。</li>
                <li>有爭議時由平台協助處理，必要時可先暫停撥款。</li>
                <li>退款會依實際狀況人工處理；若課程未成立或雙方確認取消，平台會協助退款或改期。</li>
                <li>請勿私下轉帳，避免失去平台保障。</li>
              </ul>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ color: DARK, fontSize: 14, fontWeight: 800, marginBottom: 8 }}>
                全額付款金額：NT${paymentModalBooking.final_price?.toLocaleString() ?? '--'}
              </div>
              <label style={{
                display: 'block', border: '1px dashed var(--color-primary)', borderRadius: 18, padding: 18,
                background: 'rgba(96, 165, 250, 0.1)', cursor: 'pointer', textAlign: 'center',
              }}>
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleReceiptChange} />
                <div style={{ color: BLUE, fontWeight: 800, fontSize: 14 }}>選擇轉帳截圖</div>
                <div style={{ color: MUTED, fontSize: 12, marginTop: 6 }}>支援 JPG / PNG / WebP，檔案限制 5MB</div>
              </label>
            </div>

            {paymentReceiptPreview && (
              <div style={{ marginBottom: 18 }}>
                <img
                  src={paymentReceiptPreview}
                  alt="付款截圖預覽"
                  style={{ width: '100%', height: 220, objectFit: 'cover', borderRadius: 18, border: '1px solid var(--color-border)' }}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={resetPaymentModal}
                style={{ flex: 1, padding: 14, borderRadius: 14, border: 'none', background: 'var(--color-surface-soft)', color: MUTED, fontWeight: 800, cursor: 'pointer' }}
              >
                取消
              </button>
              <button
                onClick={handleReportPayment}
                disabled={!hasPaymentAccountInfo || uploadingReceipt || reportingPayment}
                style={{
                  flex: 2,
                  padding: 14,
                  borderRadius: 14,
                  border: 'none',
                  background: BLUE,
                  color: 'var(--text-light)',
                  fontWeight: 800,
                  cursor: 'pointer',
                  opacity: !hasPaymentAccountInfo || uploadingReceipt || reportingPayment ? 0.65 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {(uploadingReceipt || reportingPayment) ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                {uploadingReceipt ? '上傳中...' : reportingPayment ? '送出中...' : '送出全額付款資訊'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
