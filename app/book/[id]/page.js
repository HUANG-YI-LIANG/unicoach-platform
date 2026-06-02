'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { ShieldCheck } from 'lucide-react';

function formatDatetimeLocal(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toDatetimeLocalValue(date = new Date()) {
  const next = new Date(date.getTime() + 24 * 60 * 60 * 1000);
  next.setMinutes(next.getMinutes() < 30 ? 30 : 0, 0, 0);
  if (next.getMinutes() === 0) next.setHours(next.getHours() + 1);
  return formatDatetimeLocal(next);
}

function getNextWeekSameTime(prevDateString) {
  if (!prevDateString) return toDatetimeLocalValue();
  const prevDate = new Date(prevDateString);
  const dayOfWeek = prevDate.getDay();
  const hours = prevDate.getHours();
  const minutes = prevDate.getMinutes();
  
  const now = new Date();
  const next = new Date(now);
  next.setHours(hours, minutes, 0, 0);
  
  let daysToAdd = dayOfWeek - now.getDay();
  if (daysToAdd <= 0) daysToAdd += 7;
  
  next.setDate(next.getDate() + daysToAdd);
  return formatDatetimeLocal(next);
}

export default function BookServicePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const coachId = params.id;
  const [serviceId, setServiceId] = useState(null);
  const [serviceIdLoaded, setServiceIdLoaded] = useState(false);
  const [rebookFromBookingId, setRebookFromBookingId] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      setServiceId(searchParams.get('service'));
      setRebookFromBookingId(searchParams.get('rebook_from_booking_id'));
      setServiceIdLoaded(true);
    }
  }, []);

  const [service, setService] = useState(null);
  const [expectedTime, setExpectedTime] = useState(toDatetimeLocalValue());
  const [priceType, setPriceType] = useState('regular');
  const [grade, setGrade] = useState('');
  const [gender, setGender] = useState('');
  const [learningStatus, setLearningStatus] = useState('');
  const [attendeesCount, setAttendeesCount] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!serviceIdLoaded) {
      return;
    }
    if (!serviceId) {
      setError('缺少服務 ID，請從服務詳情頁重新預約。');
      setLoading(false);
      return;
    }
    if (!user) {
      router.replace(`/login?redirect=${encodeURIComponent(`/book/${coachId}?service=${serviceId || ''}`)}`);
      return;
    }
    fetch(`/api/services/${serviceId}`, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error('無法載入服務資料');
        return res.json();
      })
      .then((data) => {
        if (data.error) throw new Error(data.error);
        if (data.service?.coach?.user_id && String(data.service.coach.user_id) !== String(coachId)) {
          throw new Error('網址中的教練與服務不一致，請從服務詳情頁重新預約。');
        }
        setService(data.service);
      })
      .catch((err) => setError(err.message || '載入失敗'))
      .finally(() => setLoading(false));
  }, [user, coachId, serviceId, serviceIdLoaded, router]);

  useEffect(() => {
    if (rebookFromBookingId && user) {
      fetch('/api/bookings')
        .then(res => res.json())
        .then(data => {
          if (data.bookings) {
            const prev = data.bookings.find(b => b.id === rebookFromBookingId);
            if (prev) {
              setGrade(prev.grade || '');
              setGender(prev.gender || '');
              setAttendeesCount(prev.attendees_count || 1);
              setLearningStatus(prev.learning_status || '');
              if (prev.expected_time) {
                 setExpectedTime(getNextWeekSameTime(prev.expected_time));
              }
            }
          }
        })
        .catch(() => {
          setError('無法載入上次預約資料，請手動確認本次需求。');
        });
    }
  }, [rebookFromBookingId, user]);

  const selectedPrice = useMemo(() => {
    if (!service) return 0;
    if (priceType === 'trial' && Number(service.trial_price) > 0) return Number(service.trial_price);
    return Number(service.price || 0);
  }, [service, priceType]);

  const submitBooking = async () => {
    if (!service || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coachId: service.coach.user_id,
          serviceId: service.id,
          servicePriceType: priceType,
          expectedTime: new Date(expectedTime).toISOString(),
          grade,
          gender,
          attendeesCount,
          learningStatus,
          durationMinutes: 60,
          rebookFromBookingId,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || '建立預約失敗');
      router.push(`/bookings?created=${data.bookingId}`);
    } catch (err) {
      setError(err.message || '建立預約失敗');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <main style={{ minHeight: '100vh', padding: 24, color: '#FFFFFF', background: '#050816' }}>載入預約資料中...</main>;
  }

  if (error && !service) {
    return <main style={{ minHeight: '100vh', padding: 24, color: '#FFFFFF', background: '#050816' }}>{error}</main>;
  }

  return (
    <main style={{ minHeight: '100vh', padding: '24px 16px 96px', color: '#FFFFFF', background: '#050816', fontFamily: 'sans-serif' }}>
      <section style={{ maxWidth: 720, margin: '0 auto', display: 'grid', gap: 20 }}>
        <button
          type="button"
          onClick={() => router.back()}
          style={{ justifySelf: 'start', background: 'transparent', border: 0, color: '#FF8A3D', fontWeight: 800, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}
        >
          ‹ 返回
        </button>

        {rebookFromBookingId && service && (
          <div style={{ background: 'rgba(255, 138, 61, 0.1)', border: '1px solid rgba(255, 138, 61, 0.3)', borderRadius: 24, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 10, boxShadow: '0 8px 30px rgba(255,138,61,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#FF8A3D', fontWeight: 900, fontSize: 18 }}>
              <span>⚡</span> 快速再次預約
            </div>
            <p style={{ margin: 0, fontSize: 14, color: '#94A3B8', lineHeight: 1.6 }}>
              系統已為你自動帶入上次上課的資訊，並預設帶入下週同一時間。<br/>
              <strong style={{ color: '#FFFFFF' }}>送出後只會建立待付款預約，仍需你確認並完成後續付款。</strong>
            </p>
          </div>
        )}

        <div style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 20, background: '#0B1220', boxShadow: '0 6px 16px rgba(0,0,0,0.14)' }}>
          <p style={{ margin: '0 0 6px', color: 'rgba(255,255,255,0.42)', fontSize: 12, fontWeight: 650 }}>預約摘要</p>
          <h1 style={{ margin: '0 0 6px', fontSize: 23, fontWeight: 760, color: 'rgba(255,255,255,0.94)', lineHeight: 1.2 }}>{service.title}</h1>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.56)', fontSize: 14, fontWeight: 520 }}>{service.coach.name} 教練 · 平台確認後才算正式成立</p>
        </div>

        <div style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 20, background: '#0B1220', display: 'grid', gap: 14, boxShadow: '0 6px 16px rgba(0,0,0,0.14)' }}>
          <label style={{ display: 'grid', gap: 8 }}>
            <span style={{ fontWeight: 800, color: '#FFFFFF' }}>上課時間</span>
            <input
              type="datetime-local"
              value={expectedTime}
              onChange={(event) => setExpectedTime(event.target.value)}
              style={{ padding: 14, borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: '#FFFFFF', outline: 'none' }}
              onFocus={e => e.target.style.borderColor = '#FF8A3D'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
          </label>

          {Number(service.trial_price) > 0 && (
            <label style={{ display: 'grid', gap: 8 }}>
              <span style={{ fontWeight: 800, color: '#FFFFFF' }}>課程類型</span>
              <select
                value={priceType}
                onChange={(event) => setPriceType(event.target.value)}
                style={{ padding: 14, borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: '#FFFFFF', outline: 'none' }}
                onFocus={e => e.target.style.borderColor = '#FF8A3D'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              >
                <option value="regular" style={{ background: '#0F172A' }}>正式課 NT$ {service.price}</option>
                <option value="trial" style={{ background: '#0F172A' }}>體驗課 NT$ {service.trial_price}</option>
              </select>
            </label>
          )}

          <label style={{ display: 'grid', gap: 8 }}>
            <span style={{ fontWeight: 800, color: '#FFFFFF' }}>年級 / 程度</span>
            <input value={grade} onChange={(event) => setGrade(event.target.value)} placeholder="例：國二、初學、進階" style={{ padding: 14, borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: '#FFFFFF', outline: 'none' }} onFocus={e => e.target.style.borderColor = '#FF8A3D'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
          </label>

          <label style={{ display: 'grid', gap: 8 }}>
            <span style={{ fontWeight: 800, color: '#FFFFFF' }}>性別需求</span>
            <input value={gender} onChange={(event) => setGender(event.target.value)} placeholder="可留空" style={{ padding: 14, borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: '#FFFFFF', outline: 'none' }} onFocus={e => e.target.style.borderColor = '#FF8A3D'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
          </label>

          <label style={{ display: 'grid', gap: 8 }}>
            <span style={{ fontWeight: 800, color: '#FFFFFF' }}>人數</span>
            <input type="number" min="1" max="10" value={attendeesCount} onChange={(event) => setAttendeesCount(event.target.value)} style={{ padding: 14, borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: '#FFFFFF', outline: 'none' }} onFocus={e => e.target.style.borderColor = '#FF8A3D'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
          </label>

          <label style={{ display: 'grid', gap: 8 }}>
            <span style={{ fontWeight: 800, color: '#FFFFFF' }}>學習狀況 / 備註</span>
            <textarea value={learningStatus} onChange={(event) => setLearningStatus(event.target.value)} rows={4} placeholder="讓教練知道你的目標、目前程度或特殊需求" style={{ padding: 14, borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: '#FFFFFF', outline: 'none', resize: 'none' }} onFocus={e => e.target.style.borderColor = '#FF8A3D'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
          </label>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
            <div>
              <span style={{ color: 'rgba(255,255,255,0.54)', fontSize: 13, fontWeight: 620 }}>全額付款金額</span>
              <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.38)', fontSize: 12 }}>狀態：待確認付款 · 全額付款由平台保管</p>
            </div>
            <strong style={{ fontSize: 22, color: '#FFFFFF', fontWeight: 760 }}>NT$ {selectedPrice}</strong>
          </div>

          {error && <p style={{ margin: 0, color: '#EF4444', fontWeight: 700, padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 12, border: '1px solid rgba(239, 68, 68, 0.5)' }}>{error}</p>}

          <div style={{ background: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#FFF', display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={16} color="#10B981" /> 平台金流履約保障
            </h4>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#94A3B8', lineHeight: 1.6 }}>
              <li>全額付款由平台保管，上課完成後才撥款。</li>
              <li>若課程有爭議，平台可暫停撥款協助處理。</li>
              <li>降低私下交易風險，家長更安心。</li>
            </ul>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#FFF' }}>預約確認與取消規則</h4>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#94A3B8', lineHeight: 1.6 }}>
              <li>送出後會建立待確認訂單；若教練未確認，訂單維持待確認狀態。</li>
              <li>取消規則會依平台公告與訂單狀態處理，請在付款前先確認可上課時間。</li>
              <li>退款需依平台規則審核，若有爭議平台會協助釐清後再處理撥款。</li>
              <li>實體課地點可於聊天中確認，請勿私下轉帳或離開平台交易。</li>
              <li>線上課連結會於確認後提供，請以聊天或訂單通知中的資訊為準。</li>
            </ul>
          </div>

          <button
            type="button"
            onClick={submitBooking}
            disabled={submitting}
            style={{ padding: 18, borderRadius: 16, border: 0, background: '#FF8A3D', color: '#000', fontWeight: 900, fontSize: 16, opacity: submitting ? 0.65 : 1, cursor: 'pointer', boxShadow: '0 8px 24px rgba(255,138,61,0.25)', transition: 'all 0.2s' }}
          >
            {submitting ? '建立預約中...' : '確認預約並保留時段'}
          </button>
        </div>
      </section>
    </main>
  );
}
