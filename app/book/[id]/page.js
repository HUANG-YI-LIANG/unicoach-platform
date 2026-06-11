'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { ShieldCheck } from 'lucide-react';

const bookingSteps = [
  { title: '你想什麼時候上？', eyebrow: 'Step 1', helper: '先選一個你希望的時間，送出後仍會由平台與教練確認。' },
  { title: '你的程度 / 需求是什麼？', eyebrow: 'Step 2', helper: '讓教練知道程度、人數與特殊需求，第一堂會更好開始。' },
  { title: '確認點數與保障後送出', eyebrow: 'Step 3', helper: '確認點數、平台保障與取消規則，再送出預約。' },
];

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
  
  // Wallet & Custom Points
  const [walletBalance, setWalletBalance] = useState(0);
  const [customPoints, setCustomPoints] = useState('');
  const [currentStep, setCurrentStep] = useState(0);

  const goNextStep = () => setCurrentStep((step) => Math.min(step + 1, bookingSteps.length - 1));
  const goPrevStep = () => setCurrentStep((step) => Math.max(step - 1, 0));

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

    // Fetch Wallet Balance
    fetch('/api/auth/profile')
      .then(res => res.json())
      .then(data => {
        if (data.profile) {
          setWalletBalance(data.profile.wallet_balance || 0);
        }
      });
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
    
    const pointsToPay = Number(customPoints);
    if (!pointsToPay || pointsToPay <= 0) {
      setError('請輸入有效的扣款點數');
      return;
    }
    if (pointsToPay > walletBalance) {
      setError(`您的錢包餘額不足（目前餘額：${walletBalance} 點），請先前往錢包儲值。`);
      return;
    }

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
          customPrice: pointsToPay, // <-- New parameter for wallet booking
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
    <main className="booking-stepper-page">
      <style>{`
        .booking-stepper-page {
          min-height: 100dvh;
          padding: max(22px, env(safe-area-inset-top)) 16px 112px;
          color: rgba(255,255,255,0.94);
          background: radial-gradient(circle at 50% -10%, rgba(255,138,61,0.16), transparent 34%), #050816;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          overflow-x: hidden;
        }
        .booking-shell { max-width: 430px; margin: 0 auto; display: grid; gap: 16px; }
        .booking-back {
          justify-self: start;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 999px;
          color: #FF8A3D;
          font-weight: 800;
          cursor: pointer;
          padding: 10px 14px;
        }
        .booking-summary-card, .booking-step-card, .booking-trust-card {
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 22px;
          padding: 18px;
          background: rgba(11,18,32,0.92);
          box-shadow: 0 8px 22px rgba(0,0,0,0.18);
        }
        .booking-summary-label { margin: 0 0 6px; color: rgba(255,255,255,0.44); font-size: 12px; font-weight: 700; }
        .booking-summary-title { margin: 0 0 8px; font-size: 24px; line-height: 1.16; letter-spacing: -0.03em; font-weight: 820; }
        .booking-summary-meta { margin: 0; color: rgba(255,255,255,0.58); font-size: 14px; line-height: 1.55; }
        .booking-stepper { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; }
        .booking-step-pill {
          min-height: 76px;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 18px;
          background: rgba(255,255,255,0.035);
          color: rgba(255,255,255,0.54);
          text-align: left;
          padding: 12px 10px;
          display: grid;
          align-content: start;
          gap: 5px;
        }
        .booking-step-pill.is-active {
          background: linear-gradient(135deg, rgba(255,138,61,0.20), rgba(255,255,255,0.05));
          border-color: rgba(255,138,61,0.34);
          color: rgba(255,255,255,0.94);
        }
        .booking-step-pill small { font-size: 10px; color: rgba(255,138,61,0.86); font-weight: 900; text-transform: uppercase; }
        .booking-step-pill span { font-size: 12px; line-height: 1.35; font-weight: 800; }
        .step-eyebrow { margin: 0 0 7px; color: #FF8A3D; font-size: 12px; font-weight: 900; letter-spacing: .02em; }
        .step-title { margin: 0; color: rgba(255,255,255,0.94); font-size: 22px; line-height: 1.2; font-weight: 860; }
        .step-helper { margin: 8px 0 18px; color: rgba(255,255,255,0.55); font-size: 13px; line-height: 1.6; }
        .booking-fields { display: grid; gap: 14px; }
        .booking-field { display: grid; gap: 8px; }
        .booking-field span, .booking-field-label { font-weight: 800; color: rgba(255,255,255,0.92); }
        .booking-field input, .booking-field select, .booking-field textarea {
          width: 100%;
          box-sizing: border-box;
          padding: 14px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.035);
          color: #FFFFFF;
          outline: none;
          font-size: 15px;
        }
        .booking-field textarea { resize: none; line-height: 1.55; }
        .booking-field input:focus, .booking-field select:focus, .booking-field textarea:focus { border-color: rgba(255,138,61,0.75); }
        .booking-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .booking-wallet-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 14px; border-radius: 16px; background: rgba(255,255,255,0.035); border: 1px solid rgba(255,255,255,0.06); }
        .booking-wallet-row span { color: rgba(255,255,255,0.56); font-size: 13px; font-weight: 650; }
        .booking-wallet-row strong { color: rgba(255,255,255,0.9); font-size: 18px; }
        .booking-hint { margin: 4px 0 0; color: rgba(255,255,255,0.42); font-size: 12px; line-height: 1.5; }
        .booking-error { padding: 12px; background: rgba(239,68,68,0.1); border-radius: 12px; border: 1px solid rgba(239,68,68,0.5); color: #F87171; font-weight: 750; }
        .booking-actions { display: flex; gap: 10px; margin-top: 18px; }
        .booking-secondary, .booking-primary {
          min-height: 52px;
          border-radius: 16px;
          font-weight: 900;
          cursor: pointer;
        }
        .booking-secondary { flex: 0 0 112px; color: rgba(255,255,255,0.76); background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); }
        .booking-primary { flex: 1; border: 0; background: linear-gradient(135deg,#FF8A3D,#FF5E3A); color: #050816; box-shadow: 0 8px 22px rgba(255,138,61,0.20); }
        .booking-primary:disabled { opacity: 0.65; cursor: not-allowed; }
        .booking-trust-card { display: grid; gap: 10px; }
        .booking-trust-card h4 { margin: 0; font-size: 14px; font-weight: 850; display: flex; align-items: center; gap: 6px; }
        .booking-trust-card ul { margin: 0; padding-left: 20px; color: rgba(255,255,255,0.58); font-size: 13px; line-height: 1.65; }
        @media (max-width: 380px) { .booking-two-col { grid-template-columns: 1fr; } .booking-step-pill { min-height: 84px; } }
      `}</style>
      <section className="booking-shell">
        <button type="button" onClick={() => router.back()} className="booking-back">‹ 返回</button>

        {rebookFromBookingId && service && (
          <div style={{ background: 'rgba(255, 138, 61, 0.1)', border: '1px solid rgba(255, 138, 61, 0.3)', borderRadius: 22, padding: '18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#FF8A3D', fontWeight: 900, fontSize: 17 }}>
              <span>⚡</span> 快速再次預約
            </div>
            <p style={{ margin: 0, fontSize: 14, color: '#94A3B8', lineHeight: 1.6 }}>
              系統已為你自動帶入上次上課的資訊，並預設帶入下週同一時間。<br/>
              <strong style={{ color: '#FFFFFF' }}>送出後會直接扣除點數並建立已排程預約，請先確認本次點數與時間。</strong>
            </p>
          </div>
        )}

        <div className="booking-summary-card">
          <p className="booking-summary-label">預約摘要</p>
          <h1 className="booking-summary-title">{service.title}</h1>
          <p className="booking-summary-meta">{service.coach.name} 教練 · 平台確認後才算正式成立</p>
        </div>

        <nav className="booking-stepper" aria-label="預約流程">
          {bookingSteps.map((step, index) => (
            <button
              key={step.title}
              type="button"
              className={`booking-step-pill ${currentStep === index ? 'is-active' : ''}`}
              onClick={() => setCurrentStep(index)}
            >
              <small>{step.eyebrow}</small>
              <span>{step.title}</span>
            </button>
          ))}
        </nav>

        <div className="booking-step-card">
          <p className="step-eyebrow">{bookingSteps[currentStep].eyebrow}</p>
          <h2 className="step-title">{bookingSteps[currentStep].title}</h2>
          <p className="step-helper">{bookingSteps[currentStep].helper}</p>

          {currentStep === 0 && (
            <div className="booking-fields">
              <label className="booking-field">
                <span>上課時間</span>
                <input
                  type="datetime-local"
                  value={expectedTime}
                  onChange={(event) => setExpectedTime(event.target.value)}
                />
              </label>
              {Number(service.trial_price) > 0 && (
                <label className="booking-field">
                  <span>課程類型</span>
                  <select value={priceType} onChange={(event) => setPriceType(event.target.value)}>
                    <option value="regular" style={{ background: '#0F172A' }}>正式課 NT$ {service.price}</option>
                    <option value="trial" style={{ background: '#0F172A' }}>體驗課 NT$ {service.trial_price}</option>
                  </select>
                </label>
              )}
            </div>
          )}

          {currentStep === 1 && (
            <div className="booking-fields">
              <label className="booking-field">
                <span>年級 / 程度</span>
                <input value={grade} onChange={(event) => setGrade(event.target.value)} placeholder="例：國二、初學、進階" />
              </label>
              <div className="booking-two-col">
                <label className="booking-field">
                  <span>性別需求</span>
                  <input value={gender} onChange={(event) => setGender(event.target.value)} placeholder="可留空" />
                </label>
                <label className="booking-field">
                  <span>人數</span>
                  <input type="number" min="1" max="10" value={attendeesCount} onChange={(event) => setAttendeesCount(event.target.value)} />
                </label>
              </div>
              <label className="booking-field">
                <span>學習狀況 / 備註</span>
                <textarea value={learningStatus} onChange={(event) => setLearningStatus(event.target.value)} rows={4} placeholder="讓教練知道你的目標、目前程度或特殊需求" />
              </label>
            </div>
          )}

          {currentStep === 2 && (
            <div className="booking-fields">
              <div className="booking-wallet-row">
                <span>目前錢包餘額</span>
                <strong>{walletBalance.toLocaleString()} 點</strong>
              </div>
              <label className="booking-field">
                <span className="booking-field-label">
                  本次預約扣除點數
                  <small style={{ display: 'block', marginTop: 4, color: '#FF8A3D', fontSize: 12 }}>教練方案參考價：NT$ {selectedPrice}</small>
                </span>
                <input
                  type="number"
                  min="1"
                  value={customPoints}
                  onChange={(event) => setCustomPoints(event.target.value)}
                  placeholder="輸入與教練協議好的金額點數"
                  style={{ color: '#FF8A3D', fontWeight: 900, fontSize: 18 }}
                />
                <p className="booking-hint">確認預約時將直接從錢包扣除此點數。狀態：待確認排程</p>
              </label>
            </div>
          )}

          {error && (
            <div className="booking-error">
              <p style={{ margin: 0 }}>{error}</p>
              {error.includes('餘額不足') && (
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/user/wallet')}
                  style={{ marginTop: 8, padding: '8px 16px', borderRadius: 8, background: '#EF4444', color: '#FFF', fontWeight: 800, border: 0, cursor: 'pointer' }}
                >
                  前往錢包儲值
                </button>
              )}
            </div>
          )}

          <div className="booking-actions">
            {currentStep > 0 && <button type="button" className="booking-secondary" onClick={goPrevStep}>上一步</button>}
            {currentStep < bookingSteps.length - 1 ? (
              <button type="button" className="booking-primary" onClick={goNextStep}>下一步</button>
            ) : (
              <button type="button" className="booking-primary" onClick={submitBooking} disabled={submitting}>
                {submitting ? '建立預約中...' : '確認預約並保留時段'}
              </button>
            )}
          </div>
        </div>

        {currentStep === 2 && (
          <>
            <div className="booking-trust-card">
              <h4><ShieldCheck size={16} color="#10B981" /> 平台金流履約保障</h4>
              <ul>
                <li>全額付款由平台保管，上課完成後才撥款。</li>
                <li>若課程有爭議，平台可暫停撥款協助處理。</li>
                <li>降低私下交易風險，家長更安心。</li>
              </ul>
            </div>

            <div className="booking-trust-card">
              <h4>預約確認與取消規則</h4>
              <ul>
                <li>送出後會直接扣除點數並建立已排程訂單。</li>
                <li>取消規則會依平台公告與訂單狀態處理，請在預約前先確認可上課時間。</li>
                <li>退款需依平台規則審核，退點將退回平台錢包。</li>
                <li>實體課地點可於聊天中確認，請勿私下轉帳或離開平台交易。</li>
                <li>線上課連結會於確認後提供，請以聊天或訂單通知中的資訊為準。</li>
              </ul>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
