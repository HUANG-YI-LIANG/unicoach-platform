'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { ShoppingBag, Calendar, FileText, Loader2 } from 'lucide-react';

const BLUE  = '#2563EB';
const DARK  = '#0F172A';
const MUTED = '#94A3B8';
const BG    = '#F8FAFC';
const WHITE = '#FFFFFF';

const STATUS_MAP = {
  'pending_payment':    '待付款',
  'scheduled':          '已排程',
  'in_progress':        '進行中',
  'pending_completion': '等候完課',
  'completed':          '已完成',
  'disputed':           '爭議中',
  'cancelled':          '已取消',
  'refunded':           '已退款',
};

const STATUS_STYLE = {
  completed:   { bg: '#D1FAE5', color: '#065F46' },
  scheduled:   { bg: '#DBEAFE', color: '#1D4ED8' },
  in_progress: { bg: '#FEF9C3', color: '#854D0E' },
  default:     { bg: '#FEE2E2', color: '#991B1B' },
};

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
  const router = useRouter();
  const isCoach = user?.role === 'coach' || user?.role === 'admin';

  useEffect(() => {
    if (!authLoading && !user) { router.push('/login'); return; }
    if (user) fetchBookings();
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

  return (
    <div style={{ padding: '20px 16px', background: BG, minHeight: '100vh', paddingBottom: 100 }}>

      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: DARK, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
          <ShoppingBag size={24} />
          {isCoach ? '教學訂單' : '我的預約'}
        </h1>
        {isCoach && (
          <p style={{ margin: '6px 0 0', fontSize: 13, color: MUTED }}>
            課程進行中請填寫「學習紀錄卡」才可完課
          </p>
        )}
      </header>

      {bookings.length === 0 ? (
        <div style={{
          background: WHITE, borderRadius: 20, padding: '48px 20px',
          textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
          <p style={{ fontSize: 16, fontWeight: 700, color: DARK, margin: '0 0 6px' }}>目前沒有訂單</p>
          <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>
            {isCoach ? '完善教練資料後學員就能找到你' : '去找一位教練開始預約吧！'}
          </p>
          {!isCoach && (
            <button
              onClick={() => router.push('/coaches')}
              style={{ marginTop: 20, padding: '10px 28px', background: BLUE, color: WHITE, border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              去找教練 →
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {bookings.map(b => {
            const ss = statusStyle(b.status);
            const canStartReport = isCoach && (b.status === 'scheduled' || b.status === 'in_progress');
            const isCompleted = b.status === 'completed';
            return (
              <div key={b.id} style={{
                background: WHITE, borderRadius: 20, padding: 18,
                boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
                border: '1px solid #F1F5F9',
              }}>
                {/* Top row: person + status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 44, height: 44, background: '#DBEAFE', color: '#1E40AF',
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
                    {STATUS_MAP[b.status] || b.status}
                  </span>
                </div>

                {/* Meta row: date + price */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  borderTop: '1px solid #F1F5F9', paddingTop: 12, marginBottom: canStartReport || isCompleted ? 12 : 0,
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
                      NT${b.final_price?.toLocaleString() ?? '--'}
                    </div>
                  </div>
                </div>

                {/* Price Adjust Actions (Coach Only) */}
                {isCoach && !isCompleted && b.status !== 'cancelled' && (
                  <div style={{ borderTop: '1px solid #F1F5F9', marginTop: 12, paddingTop: 12 }}>
                    {adjustingId === b.id ? (
                      <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                         <div style={{ flex: 1, position:'relative' }}>
                            <span style={{ position:'absolute', left: 10, top:'50%', transform:'translateY(-50%)', fontSize:12, color:MUTED }}>±</span>
                            <input 
                              type="number" 
                              value={adjustmentValue}
                              onChange={e => setAdjustmentValue(e.target.value)}
                              placeholder="金額 (限制 ±200)"
                              style={{ width:'100%', padding:'8px 8px 8px 24px', borderRadius:8, border:`1px solid ${BLUE}`, fontSize:13 }}
                            />
                         </div>
                         <button 
                           onClick={() => handleAdjustPrice(b.id)}
                           disabled={adjusting}
                           style={{ padding:'8px 16px', borderRadius:8, background:BLUE, color:WHITE, fontSize:12, fontWeight:700, border:'none', cursor:'pointer' }}
                         >
                           {adjusting ? '...' : '確認'}
                         </button>
                         <button 
                           onClick={() => setAdjustingId(null)}
                           style={{ padding:'8px 12px', borderRadius:8, background:'#F1F5F9', color:MUTED, fontSize:12, fontWeight:700, border:'none', cursor:'pointer' }}
                         >
                           取消
                         </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => { setAdjustingId(b.id); setAdjustmentValue(b.price_adjustment || 0); }}
                        style={{ background:'none', border:`1px solid #E2E8F0`, padding:'6px 12px', borderRadius:8, fontSize:12, fontWeight:700, color:DARK, cursor:'pointer' }}
                      >
                        📝 議價 / 調整金額
                      </button>
                    )}
                  </div>
                )}

                {/* Coach action buttons */}
                {isCoach && !isCompleted && (
                  <div style={{ display: 'flex', gap: 8, borderTop: '1px solid #F1F5F9', paddingTop: 12 }}>
                    {b.status === 'scheduled' && (
                      <button
                        onClick={() => handleStatusUpdate(b.id, 'in_progress')}
                        style={{
                          flex: 1, padding: '10px', borderRadius: 12, border: 'none',
                          background: '#FEF9C3', color: '#854D0E', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                        }}
                      >
                        ▶ 開始上課
                      </button>
                    )}
                    {canStartReport && (
                      <button
                        onClick={() => router.push(`/reports/${b.id}`)}
                        style={{
                          flex: 2, padding: '10px', borderRadius: 12, border: 'none',
                          background: BLUE, color: WHITE, fontWeight: 700, fontSize: 13, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          boxShadow: '0 4px 12px rgba(37,99,235,0.2)',
                        }}
                      >
                        <FileText size={14} /> 填寫學習紀錄卡
                      </button>
                    )}
                  </div>
                )}

                {/* Completed badge and review actions */}
                {isCompleted && (
                  <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 12 }}>
                    {!isCoach && !b.review_id ? (
                      <button
                        onClick={() => setReviewingBooking(b)}
                        style={{
                          width: '100%', padding: '10px', borderRadius: 12, border: `1px solid ${BLUE}`,
                          background: WHITE, color: BLUE, fontWeight: 700, fontSize: 13, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}
                      >
                        ⭐ 撰寫評價
                      </button>
                    ) : (
                      <div style={{
                        fontSize: 12, color: '#059669', fontWeight: 700, textAlign: 'center',
                      }}>
                        ✅ {isCoach ? '課程已完成，學習紀錄卡已歸檔' : (b.review_id ? '感謝您的評價！' : '課程已完成')}
                      </div>
                    )}
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
            background: WHITE, borderRadius: 24, width: '100%', maxWidth: 400, padding: 24,
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
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
                    color: star <= reviewData.rating ? '#F59E0B' : '#E2E8F0',
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
                width: '100%', minHeight: 100, padding: 16, borderRadius: 16, border: '1px solid #E2E8F0',
                fontSize: 14, marginBottom: 20, resize: 'none',
              }}
            />

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => { setReviewingBooking(null); setReviewData({ rating: 5, comment: '' }); }}
                style={{ flex: 1, padding: 14, borderRadius: 12, border: 'none', background: '#F1F5F9', color: MUTED, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
              >
                取消
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={submittingReview}
                style={{
                  flex: 2, padding: 14, borderRadius: 12, border: 'none', background: BLUE, color: WHITE,
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
    </div>
  );
}
