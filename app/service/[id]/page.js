'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { Star, MapPin, CheckCircle, MessageCircle, Zap, ShieldCheck, BookOpen, Clock, Users, PlaySquare, Calendar, ChevronLeft } from 'lucide-react';

function categoryLabel(category) {
  if (category === 'sports') return '運動陪練';
  if (category === 'academic') return '學科家教';
  if (category === 'talent') return '才藝課程';
  return '精選課程';
}

function cleanServiceTitle(service) {
  const title = String(service?.title || '').trim();
  if (title && !title.includes('未填寫')) return title;
  if (service?.subject_or_sport) return `${service.subject_or_sport}一對一體驗課`;
  return `${categoryLabel(service?.category)}體驗課`;
}

function cleanServiceIntro(service) {
  const intro = String(service?.intro || '').trim();
  if (intro && !intro.includes('未填寫')) return intro;
  return '教練會依照你的程度、目標與時間安排課程節奏，讓第一堂課就能清楚知道是否適合。';
}

export default function ServiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [service, setService] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!params.id) return;
    fetch(`/api/services/${params.id}`)
      .then((res) => {
        if (!res.ok) throw new Error('無法載入服務資料');
        return res.json();
      })
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setService(data.service);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    fetch(`/api/services/${params.id}/trust-metrics`)
      .then((res) => res.json())
      .then((data) => { if (data.success && data.data) setMetrics(data.data); })
      .catch(console.error);

    fetch(`/api/services/${params.id}/videos`)
      .then((res) => res.json())
      .then((data) => setVideos(data?.data?.videos || data?.videos || []))
      .catch(console.error);
  }, [params.id]);

  const getCoachTargetId = () => {
    const coach = service?.coach || {};
    return coach.user_id || coach.id || null;
  };

  const handleChat = () => {
    const coachTargetId = getCoachTargetId();
    if (!coachTargetId) return;
    if (!user) return router.push(`/login?redirect=/service/${params.id}`);
    router.push(`/chat?with=${coachTargetId}`);
  };

  const handleBook = () => {
    const coachTargetId = getCoachTargetId();
    if (!coachTargetId) return;
    if (!user) return router.push(`/login?redirect=/service/${params.id}`);
    router.push(`/book/${coachTargetId}?service=${service.id}`);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: '#050816', color: 'rgba(255,255,255,0.58)', padding: 24 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid rgba(255,138,61,0.2)', borderTopColor: '#FF8A3D', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }
  if (error || !service) {
    return (
      <div style={{ minHeight: '100dvh', background: 'radial-gradient(circle at 50% -10%, rgba(255,138,61,0.10), transparent 34%), #050816', color: 'rgba(255,255,255,0.92)', padding: 'max(28px, env(safe-area-inset-top)) 22px 128px', display: 'flex', alignItems: 'center' }}>
        <div style={{ width: '100%', padding: 24, borderRadius: 30, background: 'rgba(15,23,42,0.86)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 18px 44px rgba(0,0,0,0.30)', textAlign: 'center' }}>
          <div style={{ width: 62, height: 62, margin: '0 auto 18px', borderRadius: 22, display: 'grid', placeItems: 'center', color: '#050816', background: 'linear-gradient(135deg,#FF8A3D,#FF5E3A)' }}><BookOpen size={27} /></div>
          <h1 style={{ margin: '0 0 10px', fontSize: 24, lineHeight: 1.16, letterSpacing: '-0.03em', fontWeight: 780 }}>找不到這項服務</h1>
          <p style={{ margin: '0 auto 22px', maxWidth: 300, color: 'rgba(255,255,255,0.58)', fontSize: 14, lineHeight: 1.65 }}>這項服務可能已下架或連結無效。你可以回到探索頁，看看其他適合你的教練。</p>
          <button onClick={() => router.push('/coaches')} style={{ width: '100%', height: 50, borderRadius: 999, color: '#050816', background: 'linear-gradient(135deg,#FF8A3D,#FF5E3A)', fontWeight: 850 }}>返回探索</button>
          <button onClick={() => router.back()} style={{ marginTop: 10, width: '100%', height: 46, borderRadius: 999, color: 'rgba(255,255,255,0.72)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)', fontWeight: 750 }}>回上一頁</button>
        </div>
      </div>
    );
  }

  const coach = service.coach || {};
  const hero = service.cover_image || coach.avatar_url || '';
  const coachTargetId = coach.user_id || coach.id;
  const hasUsableCoachTarget = Boolean(coachTargetId);
  const hasRating = Number(coach.review_count) > 0 && Number(coach.overall_rating) > 0;
  const completedLessons = Number(coach.completed_lessons);
  const coachMetaItems = [
    `${coach.school || '大學生教練'} ${coach.department || ''}`.trim(),
    hasRating ? `⭐ ${coach.overall_rating}` : '尚無評價',
    completedLessons > 0 ? `${completedLessons} 堂完課` : null,
    '回覆時間依教練實際狀態',
  ].filter(Boolean);

  return (
    <div className="service-native">
      <style>{`
        .service-native {
          min-height: 100dvh;
          margin: calc(-1 * max(18px, env(safe-area-inset-top))) -18px -112px;
          padding-bottom: 116px;
          background: #050816;
          color: rgba(255,255,255,0.92);
        }
        .detail-state {
          min-height: 100dvh;
          display: grid;
          place-items: center;
          background: #050816;
          color: rgba(255,255,255,0.58);
        }
        .hero-media {
          position: relative;
          min-height: 58dvh;
          background-size: cover;
          background-position: center;
          display: flex;
          align-items: flex-end;
          padding: max(18px, env(safe-area-inset-top)) 18px 28px;
          overflow: hidden;
        }
        .hero-media::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(5,8,22,0.18) 0%, rgba(5,8,22,0.18) 38%, rgba(5,8,22,0.96) 100%);
        }
        .hero-media-empty {
          background: radial-gradient(circle at 50% 18%, rgba(255,138,61,0.20), transparent 34%), #0B1120;
        }
        .hero-empty-copy {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 8px;
          color: rgba(255,255,255,0.76);
          text-align: center;
          z-index: 1;
        }
        .hero-empty-copy strong { font-size: 30px; color: rgba(255,255,255,0.92); }
        .hero-empty-copy span { font-size: 13px; font-weight: 750; color: rgba(255,255,255,0.58); }
        .back-chip {
          position: absolute;
          top: max(14px, env(safe-area-inset-top));
          left: 16px;
          z-index: 3;
          width: 42px;
          height: 42px;
          background: rgba(11,17,32,0.54);
          border: 1px solid rgba(255,255,255,0.08);
          backdrop-filter: blur(18px);
          color: rgba(255,255,255,0.86);
        }
        .hero-copy { position: relative; z-index: 2; width: 100%; }
        .eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 7px 11px;
          border-radius: 999px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.72);
          font-size: 12px;
          font-weight: 650;
          backdrop-filter: blur(12px);
          margin-bottom: 14px;
        }
        .detail-title {
          margin: 0;
          font-size: 35px;
          line-height: 1.05;
          letter-spacing: -0.045em;
          font-weight: 780;
          color: rgba(255,255,255,0.94);
        }
        .detail-sub {
          margin: 12px 0 0;
          font-size: 15px;
          line-height: 1.55;
          color: rgba(255,255,255,0.64);
          max-width: 92%;
        }
        .detail-body { padding: 20px 18px 0; display: flex; flex-direction: column; gap: 18px; }
        .premium-card {
          background: rgba(15,23,42,0.92);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 28px;
          padding: 20px;
          box-shadow: 0 16px 38px rgba(0,0,0,0.20);
        }
        .coach-strip { display: flex; align-items: center; gap: 14px; }
        .avatar-xl {
          width: 68px;
          height: 68px;
          border-radius: 22px;
          background: linear-gradient(135deg,#FF8A3D,#FF5E3A);
          overflow: hidden;
          display: grid;
          place-items: center;
          color: #050816;
          font-size: 25px;
          font-weight: 850;
          flex-shrink: 0;
        }
        .avatar-xl img { width: 100%; height: 100%; object-fit: cover; }
        .coach-name { margin: 0; font-size: 19px; font-weight: 760; letter-spacing: -0.02em; color: rgba(255,255,255,0.92); display:flex; align-items:center; gap:6px; }
        .coach-meta { margin: 4px 0 0; color: rgba(255,255,255,0.50); font-size: 13px; line-height: 1.45; }
        .trust-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; }
        .trust-box {
          border-radius: 20px;
          background: rgba(255,255,255,0.035);
          border: 1px solid rgba(255,255,255,0.05);
          padding: 14px 10px;
          min-height: 88px;
        }
        .trust-val { font-size: 15px; font-weight: 760; color: rgba(255,255,255,0.9); line-height: 1.2; margin-top: 9px; }
        .trust-label { font-size: 11px; color: rgba(255,255,255,0.38); margin-top: 5px; }
        .section-head { margin: 0 0 14px; font-size: 16px; font-weight: 760; color: rgba(255,255,255,0.9); display:flex; align-items:center; gap:8px; }
        .intro-text { color: rgba(255,255,255,0.64); font-size: 14px; line-height: 1.75; white-space: pre-wrap; margin: 0; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .info-tile { background: rgba(255,255,255,0.035); border: 1px solid rgba(255,255,255,0.05); border-radius: 18px; padding: 14px; }
        .info-tile b { display:block; color: rgba(255,255,255,0.9); font-size: 13px; margin-bottom: 6px; }
        .info-tile span { color: rgba(255,255,255,0.54); font-size: 13px; line-height: 1.45; }
        .video-rail { display:flex; gap: 12px; overflow-x:auto; scrollbar-width:none; }
        .video-rail::-webkit-scrollbar { display:none; }
        .video-card { min-width: 132px; aspect-ratio: 9/16; border-radius: 22px; overflow:hidden; position:relative; background:#0B1120; border:1px solid rgba(255,255,255,0.06); }
        .video-card img { width:100%; height:100%; object-fit:cover; opacity:.82; }
        .video-card svg { position:absolute; inset:0; margin:auto; color:white; filter: drop-shadow(0 4px 10px rgba(0,0,0,.5)); }
        .sticky-booking {
          position: fixed;
          left: max(14px, calc((100vw - 430px) / 2 + 14px));
          right: max(14px, calc((100vw - 430px) / 2 + 14px));
          bottom: 104px;
          width: auto;
          max-width: 402px;
          margin-inline: auto;
          z-index: 900;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border-radius: 28px;
          background: rgba(11,17,32,0.82);
          border: 1px solid rgba(255,255,255,0.08);
          backdrop-filter: blur(22px) saturate(150%);
          box-shadow: 0 18px 44px rgba(0,0,0,0.36);
        }
        .price-display { flex: 0 0 auto; min-width: 92px; }
        .price-display strong { display:block; font-size: 19px; color: rgba(255,255,255,0.94); line-height:1; }
        .price-display span { color: rgba(255,255,255,0.38); font-size: 11px; }
        .chat-btn { min-width: 88px; height: 50px; border-radius: 999px; background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.82); border: 1px solid rgba(255,255,255,0.06); display: inline-flex; align-items: center; justify-content: center; gap: 6px; font-size: 13px; font-weight: 800; }
        .book-btn { flex: 1; min-width: 0; height: 50px; border-radius: 999px; background: linear-gradient(135deg,#FF8A3D,#FF5E3A); color: #050816; font-weight: 850; box-shadow: none; white-space: nowrap; }
        .chat-btn:disabled, .book-btn:disabled { opacity: 0.48; cursor: not-allowed; filter: grayscale(0.4); }
      `}</style>

      <section className={`hero-media ${hero ? '' : 'hero-media-empty'}`} style={hero ? { backgroundImage: `url(${hero})` } : undefined}>
        <button className="back-chip" onClick={() => router.back()}><ChevronLeft size={22} /></button>
        {!hero && (
          <div className="hero-empty-copy">
            <strong>{service.subject_or_sport || 'UniCoach'}</strong>
            <span>教練正在補充教學照片</span>
          </div>
        )}
        <div className="hero-copy">
          <div className="eyebrow"><ShieldCheck size={14} />{categoryLabel(service.category)} · 平台驗證教練</div>
          <h1 className="detail-title">{cleanServiceTitle(service)}</h1>
          <p className="detail-sub">{service.subject_or_sport ? `${service.subject_or_sport} · ` : ''}{service.city || '線上教學'} {service.district || ''} · {service.lesson_type === 'online' ? '線上' : service.lesson_type === 'in_person' ? '實體' : '線上 / 實體'}</p>
        </div>
      </section>

      <main className="detail-body">
        <section className="premium-card coach-strip">
          <div className="avatar-xl">{coach.avatar_url ? <img src={coach.avatar_url} alt={coach.name} /> : (coach.name?.[0] || 'U')}</div>
          <div>
            <h2 className="coach-name">{coach.name || 'UniCoach'}教練 {coach.verification_status === 'approved' && <ShieldCheck size={16} color="#22C55E" />}</h2>
            <p className="coach-meta">{coachMetaItems[0]}<br />{coachMetaItems.slice(1).join(' · ')}</p>
          </div>
        </section>

        <section className="premium-card">
          <h2 className="section-head"><ShieldCheck size={18} color="#22C55E" />信任指標</h2>
          <div className="trust-grid">
            <div className="trust-box"><MessageCircle size={18} color="rgba(255,255,255,0.5)" /><div className="trust-val">{metrics?.response?.label || '資料不足'}</div><div className="trust-label">平均回覆</div></div>
            <div className="trust-box"><CheckCircle size={18} color="#22C55E" /><div className="trust-val">{metrics?.completion?.label || '尚無資料'}</div><div className="trust-label">履約品質</div></div>
            <div className="trust-box"><Users size={18} color="#FF8A3D" /><div className="trust-val">{metrics?.retention?.label || '尚無資料'}</div><div className="trust-label">重複預約</div></div>
          </div>
        </section>

        {videos.length > 0 && (
          <section className="premium-card">
            <h2 className="section-head"><PlaySquare size={18} color="#FF8A3D" />教學短影音</h2>
            <div className="video-rail">
              {videos.map((video) => (
                <button key={video.id} className="video-card" onClick={() => window.open(video.url || video.embedUrl, '_blank')}>
                  <img src={video.thumbnailUrl || hero} alt={video.title || '教學短影音'} />
                  <PlaySquare size={30} />
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="premium-card">
          <h2 className="section-head"><BookOpen size={18} color="#FF8A3D" />服務介紹與教學風格</h2>
          <p className="intro-text">{cleanServiceIntro(service)}</p>
        </section>

        <section className="premium-card">
          <h2 className="section-head"><Clock size={18} color="#FF8A3D" />課程資訊</h2>
          <div className="info-grid">
            <div className="info-tile"><b>適合對象</b><span>{service.target_students || '教練正在補充適合對象'}</span></div>
            <div className="info-tile"><b>可約時段</b><span>{service.available_times || '彈性預約，請先聊聊'}</span></div>
            <div className="info-tile"><b>體驗價</b><span>{service.trial_price > 0 ? `NT$ ${service.trial_price}` : '價格以本頁顯示為準'}</span></div>
            <div className="info-tile"><b>上課地點</b><span>{service.city ? `${service.city} ${service.district || ''}` : '地點先聊聊確認'}</span></div>
          </div>
        </section>
      </main>

      <div className="sticky-booking">
        <div className="price-display"><strong>NT$ {service.price}</strong><span>/ 60 分鐘</span></div>
        {hasUsableCoachTarget ? (
          <>
            <button className="chat-btn" onClick={handleChat} disabled={!hasUsableCoachTarget}><MessageCircle size={18} /> 先聊聊</button>
            <button className="book-btn" onClick={handleBook} disabled={!hasUsableCoachTarget}><Calendar size={17} /> 立即預約</button>
          </>
        ) : (
          <button className="book-btn" disabled={!hasUsableCoachTarget}>教練資料尚未完成</button>
        )}
      </div>
    </div>
  );
}
