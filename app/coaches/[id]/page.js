'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, MapPin, MessageCircle, Star, Video, BookOpen, ShieldCheck, DollarSign, Zap, FileDigit, Calendar, User } from 'lucide-react';
import VideoGallery from '@/components/VideoGallery';

function formatNextAvailable(value) {
  if (!value) return '尚未設定固定時段';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '尚未設定固定時段';
  const parts = new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const m = parts.find(p => p.type === 'month')?.value || '--';
  const d = parts.find(p => p.type === 'day')?.value || '--';
  return `${m}/${d} 最快可約`;
}

export default function CoachDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  
  const [coach, setCoach] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [videos, setVideos] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chatting, setChatting] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/coaches/${id}`)
      .then((res) => res.json())
      .then((payload) => {
        if (payload?.coach) {
          setCoach(payload.coach);
          setReviews(payload.reviews || []);
          setVideos(payload.videos || []);
          setBookings(payload.bookings || []);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#coach-plans') {
      setTimeout(() => {
        const plansSection = document.getElementById('coach-plans');
        if (plansSection) {
          plansSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  }, []);

  async function handleChat() {
    if (!coach) return;
    setChatting(true);
    try {
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
    } finally {
      setChatting(false);
    }
  }

  function handleViewAvailability() {
    if (!coach?.primary_service_id) {
      alert('教練尚未發布正式服務，無法預約！');
      return;
    }
    // Always route directly to the actual booking page using the primary_service_id
    router.push(`/book/${id}?service=${coach.primary_service_id}`);
  }

  if (loading) {
    return <div style={{ height: '100dvh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF' }}>載入中...</div>;
  }

  if (!coach) {
    return <div style={{ height: '100dvh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF' }}>找不到教練</div>;
  }

  const planOptions = coach.plan_options || [];
  const incompleteProfileText = '這位教練正在補充公開資料';
  const publicHeadline = [coach.service_areas, coach.location].filter(Boolean).join(' · ') || incompleteProfileText;
  const hasVerifiedIdentity = coach.approval_status === 'approved';
  const profileRows = [
    { label: '教練重點', value: publicHeadline },
    { label: '教學經驗', value: coach.experience },
    { label: '教學理念', value: coach.philosophy || coach.intro },
    { label: '適合學生', value: coach.service_areas },
    { label: '上課地區', value: coach.location },
    { label: '價格參考', value: coach.min_price ? `單堂起價 NT$${Number(coach.min_price).toLocaleString()}` : (coach.base_price ? `參考底價 NT$${Number(coach.base_price).toLocaleString()}` : '') },
    { label: '驗證狀態', value: hasVerifiedIdentity ? '身份驗證已通過' : '身份驗證尚未完成' },
  ];

  return (
    <div className="premium-detail fade-in">
      <style dangerouslySetInnerHTML={{ __html: `
        .premium-detail {
          background: #000;
          color: #FFF;
          min-height: 100dvh;
          position: relative;
          padding-bottom: calc(100px + env(safe-area-inset-bottom, 20px));
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
        }

        /* -------------------------------- */
        /* HIERARCHY 1: HERO SECTION        */
        /* -------------------------------- */
        .hero-section {
          position: relative;
          width: 100%;
          height: 60vh;
          min-height: 400px;
          max-height: 600px;
          background: #111;
        }
        .hero-bg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0.8;
        }
        .hero-fallback {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle at top, rgba(249,115,22,0.24), #111 58%);
          color: rgba(255,255,255,0.25);
        }
        .hero-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, #000 0%, rgba(0,0,0,0.5) 40%, rgba(0,0,0,0) 100%);
        }
        .hero-top-nav {
          position: absolute;
          top: max(20px, env(safe-area-inset-top));
          left: 20px;
          z-index: 10;
        }
        .btn-back {
          width: 44px;
          height: 44px;
          border-radius: 22px;
          background: rgba(0,0,0,0.4);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.2);
          color: #FFF;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        
        .hero-content {
          position: absolute;
          bottom: 20px;
          left: 0;
          right: 0;
          padding: 0 20px;
          display: flex;
          align-items: flex-end;
          gap: 16px;
          max-width: 600px;
          margin: 0 auto;
        }
        .hero-avatar {
          width: 84px;
          height: 84px;
          border-radius: 24px;
          border: 2px solid rgba(255,255,255,0.8);
          background: #222;
          overflow: hidden;
          flex-shrink: 0;
          box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        }
        .hero-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .hero-info {
          flex: 1;
        }
        .hero-title {
          font-size: 32px;
          font-weight: 900;
          margin: 0 0 4px;
          line-height: 1.1;
        }
        .hero-subtitle {
          font-size: 15px;
          font-weight: 600;
          color: var(--accent);
          margin: 0;
        }

        /* -------------------------------- */
        /* HIERARCHY 2: TRUST & INFO        */
        /* -------------------------------- */
        .main-container {
          max-width: 600px;
          margin: 0 auto;
          padding: 24px 20px;
        }

        .trust-row {
          display: flex;
          gap: 12px;
          margin-bottom: 32px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          padding-bottom: 4px;
        }
        .trust-row::-webkit-scrollbar { display: none; }
        .trust-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.15);
          padding: 8px 14px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 800;
          color: #FFF;
          white-space: nowrap;
        }
        .trust-badge.primary {
          background: rgba(249, 115, 22, 0.15);
          border-color: rgba(249, 115, 22, 0.4);
          color: var(--accent);
        }

        .section-block {
          margin-bottom: 40px;
        }
        .section-title {
          font-size: 20px;
          font-weight: 800;
          margin: 0 0 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .section-text {
          font-size: 15px;
          line-height: 1.7;
          color: rgba(255,255,255,0.85);
          white-space: pre-wrap;
          margin: 0;
        }

        .plans-grid {
          display: grid;
          gap: 12px;
        }
        .plan-card {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 20px;
          padding: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .plan-title {
          font-size: 16px;
          font-weight: 800;
          margin: 0 0 6px;
        }
        .plan-meta {
          font-size: 13px;
          color: rgba(255,255,255,0.5);
          margin: 0;
        }
        .plan-price {
          font-size: 20px;
          font-weight: 900;
          color: var(--accent);
        }

        /* -------------------------------- */
        /* HIERARCHY 3: METADATA            */
        /* -------------------------------- */
        .metadata-box {
          background: rgba(255,255,255,0.03);
          border-radius: 16px;
          padding: 16px;
          margin-bottom: 24px;
        }
        .metadata-row {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 14px;
          color: rgba(255,255,255,0.6);
          margin-bottom: 12px;
        }
        .metadata-row:last-child {
          margin-bottom: 0;
        }

        /* -------------------------------- */
        /* STICKY BOTTOM CTA                */
        /* -------------------------------- */
        .sticky-bottom-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(10, 10, 10, 0.85);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-top: 1px solid rgba(255,255,255,0.1);
          padding: 16px 20px calc(16px + env(safe-area-inset-bottom, 20px));
          z-index: 100;
          display: flex;
          gap: 12px;
          justify-content: center;
        }
        .sticky-content {
          width: 100%;
          max-width: 600px;
          display: flex;
          gap: 12px;
        }
        .btn-chat {
          flex: 1;
          height: 56px;
          border-radius: 16px;
          background: var(--accent);
          border: none;
          color: #FFF;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 16px;
          font-weight: 900;
          box-shadow: 0 8px 18px rgba(249, 115, 22, 0.18);
          cursor: pointer;
        }
        .btn-book-primary {
          flex: 0 0 auto;
          min-width: 136px;
          height: 56px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 16px;
          color: rgba(255,255,255,0.9);
          font-size: 14px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: none;
          cursor: pointer;
        }
        .pre-booking-card {
          background: linear-gradient(135deg, rgba(249,115,22,0.14), rgba(255,255,255,0.04));
          border: 1px solid rgba(249,115,22,0.24);
          border-radius: 22px;
          padding: 18px;
          display: grid;
          gap: 12px;
          margin-bottom: 28px;
        }
        .pre-booking-title {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
          font-size: 17px;
          font-weight: 900;
        }
        .pre-booking-list {
          margin: 0;
          padding-left: 20px;
          color: rgba(255,255,255,0.74);
          font-size: 14px;
          line-height: 1.7;
        }
        .pre-booking-note {
          margin: 0;
          color: rgba(255,255,255,0.62);
          font-size: 13px;
          line-height: 1.6;
        }
      `}} />

      {/* HERO */}
      <div className="hero-section">
        {coach.avatar_url ? (
          <img src={coach.avatar_url} alt={`${coach.name} 大頭貼`} className="hero-bg" />
        ) : (
          <div className="hero-fallback" aria-label="教練尚未上傳公開照片">
            <User size={72} />
          </div>
        )}
        <div className="hero-overlay" />
        
        <div className="hero-top-nav">
          <button className="btn-back btn-press" onClick={() => router.back()}>
            <ChevronLeft size={24} />
          </button>
        </div>

        <div className="hero-content">
          <div className="hero-avatar">
            {coach.avatar_url ? (
              <img src={coach.avatar_url} alt={`${coach.name} 大頭貼`} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.6)', fontSize: 28, fontWeight: 900 }}>
                {coach.name?.charAt(0) || '教'}
              </div>
            )}
          </div>
          <div className="hero-info">
            <h1 className="hero-title">{coach.name}</h1>
            <p className="hero-subtitle">{publicHeadline}</p>
          </div>
        </div>
      </div>

      <div className="main-container">
        
        {/* TRUST ROW */}
        <div className="trust-row">
          <div className="trust-badge primary">
            <Star size={14} fill="currentColor" /> {coach.review_count ? `${coach.rating_avg} (${coach.review_count})` : '尚無評價'}
          </div>
          <div className="trust-badge">
            <MapPin size={14} /> {coach.location || incompleteProfileText}
          </div>
          <div className="trust-badge" style={{ background: hasVerifiedIdentity ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.06)', borderColor: hasVerifiedIdentity ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255,255,255,0.12)', color: hasVerifiedIdentity ? '#34D399' : 'rgba(255,255,255,0.65)' }}>
            <ShieldCheck size={14} /> {hasVerifiedIdentity ? '已完成身份驗證' : '尚未完成身份驗證'}
          </div>
        </div>

        {/* PUBLIC PROFILE SNAPSHOT */}
        <div style={{ display: 'grid', gap: 12, marginBottom: 32 }}>
          {profileRows.map((row) => (
            <div key={row.label} style={{ background: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: '0 0 6px', fontWeight: 700 }}>{row.label}</p>
              <p style={{ fontSize: 15, color: '#FFF', margin: 0, fontWeight: 800, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{row.value || incompleteProfileText}</p>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px', marginTop: 2, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
              <Calendar size={16} /> <span>{formatNextAvailable(coach.next_available_at)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
              <DollarSign size={16} /> <span>{coach.min_price || coach.base_price ? `價格參考 NT$${Number(coach.min_price || coach.base_price).toLocaleString()}` : incompleteProfileText}</span>
            </div>
          </div>
        </div>

        {/* VIDEOS */}
        {videos.length > 0 && (
          <div className="section-block">
            <h2 className="section-title"><Video size={20} color="var(--accent)" /> 教學影片預覽</h2>
            <div style={{ margin: '0 -20px' }}>
              <VideoGallery videos={videos} />
            </div>
          </div>
        )}

        {/* PHILOSOPHY & FEATURES */}
        <div className="section-block">
          <h2 className="section-title"><FileDigit size={20} color="var(--accent)" /> 關於教練</h2>
          <p className="section-text">{coach.philosophy || coach.intro || incompleteProfileText}</p>
        </div>

        {coach.teaching_features && (
          <div className="section-block">
            <h2 className="section-title"><BookOpen size={20} color="var(--accent)" /> 課程特色</h2>
            <p className="section-text">{coach.teaching_features}</p>
          </div>
        )}

        <div id="booking-guidance" className="pre-booking-card">
          <h2 className="pre-booking-title"><MessageCircle size={19} color="var(--accent)" /> 預約前先確認</h2>
          <ul className="pre-booking-list">
            <li>程度是否適合：先問教練你的目標、程度與是否需要零基礎陪練。</li>
            <li>時間與地點：確認最快可約時段、實體地點或線上連結安排。</li>
            <li>器材與上課方式：先確認需要自備什麼、第一堂會怎麼開始。</li>
          </ul>
          <p className="pre-booking-note">按「先問教練」只會開啟聊天室，不會直接扣款；等你確認適合後，再從平台預約並保留紀錄。</p>
        </div>

        {/* PLANS */}
        <div id="coach-plans" className="section-block">
          <h2 className="section-title"><Zap size={20} color="var(--accent)" /> 課程方案</h2>
          {planOptions.length === 0 ? (
            <p className="section-text">尚無方案</p>
          ) : (
            <div className="plans-grid">
              {planOptions.map(plan => (
                <div key={plan.id} className="plan-card" style={{ cursor: 'pointer' }} onClick={() => {
                  if (!coach?.primary_service_id) {
                    alert('教練尚未發布正式服務，無法預約！');
                    return;
                  }
                  router.push(`/book/${id}?service=${coach.primary_service_id}`);
                }}>
                  <div>
                    <h3 className="plan-title">{plan.title}</h3>
                    <p className="plan-meta">{plan.duration_minutes} 分鐘</p>
                  </div>
                  <div className="plan-price">${plan.price}</div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* STICKY BOTTOM CTA */}
      <div className="sticky-bottom-bar">
        <div className="sticky-content">
          <button className="btn-chat btn-press" onClick={handleChat} disabled={chatting}>
            <MessageCircle size={20} />
            <span>{chatting ? '開啟中...' : '先問教練'}</span>
          </button>
          <button className="btn-book-primary btn-press" onClick={handleViewAvailability}>
            <Calendar size={18} />
            查看可預約時間
          </button>
        </div>
      </div>
      
    </div>
  );
}
