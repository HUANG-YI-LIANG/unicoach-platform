'use client';

import { useEffect, useState, Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, MapPin, Star, ChevronRight } from 'lucide-react';

const CATEGORY_OPTIONS = [
  { value: '', label: '推薦' },
  { value: 'sports', label: '運動' },
  { value: 'academic', label: '學科' },
  { value: 'talent', label: '才藝' },
];

function cleanText(value) {
  return String(value || '').trim();
}

function formatFitHint(service) {
  const target = cleanText(service.target_students);
  if (target) return target;
  const subject = cleanText(service.subject_or_sport);
  if (subject) return `想學${subject}、需要有人帶著開始的人`;
  return '想先了解教練風格、再決定是否預約的人';
}

function formatAvailabilityHint(service) {
  const raw = service.available_times;
  const text = Array.isArray(raw) ? raw.filter(Boolean).join('、') : cleanText(raw);
  if (!text) return '最快可約 · 先聊聊確認時段';
  return `最快可約 · ${text.length > 18 ? `${text.slice(0, 18)}…` : text}`;
}

function formatFirstLessonPrice(service) {
  const price = Number(service.price);
  if (!Number.isFinite(price) || price <= 0) return '第一堂 · 價格待確認';
  return `第一堂 · NT$ ${price.toLocaleString('zh-TW')}`;
}

function formatCoachRating(value) {
  const rating = Number(value);
  if (!Number.isFinite(rating) || rating <= 0) return '尚無評價';
  return rating.toFixed(1);
}

function DiscoverFeed() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState({
    q: searchParams.get('q') || '',
    category: searchParams.get('category') || '',
  });
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.category) params.set('category', filters.category);

    // Replace URL silently
    router.replace(params.toString() ? `${pathname}?${params}` : pathname, { scroll: false });

    setLoading(true);
    fetch(`/api/services?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => setServices(data.services || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filters.q, filters.category, pathname, router]);

  const updateCategory = (val) => setFilters(prev => ({ ...prev, category: val }));

  return (
    <>
      {/* Top Overlay Header */}
      <div className="discover-header">
        <div className="header-content">
          <div className="search-bar">
            <Search size={18} color="rgba(255,255,255,0.6)" />
            <input
              type="text"
              placeholder="找尋你想學的技能..."
              value={filters.q}
              onChange={(e) => setFilters(prev => ({ ...prev, q: e.target.value }))}
            />
          </div>
        </div>
        <div className="category-pills">
          {CATEGORY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`category-pill ${filters.category === opt.value ? 'active' : ''}`}
              onClick={() => updateCategory(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Feed Container */}
      <div className="feed-container">
        {loading ? (
          <div style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.5)' }}>載入中...</p>
          </div>
        ) : services.length === 0 ? (
          <div style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
            <p style={{ color: 'rgba(255,255,255,0.5)' }}>找不到相符的教練</p>
            <button onClick={() => setFilters({ q: '', category: '' })} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#FFF', padding: '8px 16px', borderRadius: 20 }}>清除搜尋</button>
          </div>
        ) : (
          services.map((service) => {
            const coach = service.coach;
            const bgImage = service.cover_image || coach.avatar_url;
            const hasRating = Number(coach.review_count) > 0 && Number(coach.overall_rating) > 0;
            const coachTarget = service.target_students?.trim();
            const fitHint = formatFitHint(service);
            const availabilityHint = formatAvailabilityHint(service);
            const firstLessonPrice = formatFirstLessonPrice(service);
            const coachId = coach.user_id || coach.id || service.coach?.id;

            return (
              <div key={service.id} className="feed-card">
                {bgImage ? (
                  <img src={bgImage} alt={`${coach.name || '教練'}教學照片`} className="feed-media" />
                ) : (
                  <div className="feed-media media-fallback">
                    <span>{service.subject_or_sport || 'UniCoach'}</span>
                    <small>還沒上傳教學照片</small>
                  </div>
                )}
                <div className="feed-overlay" />

                <div className="feed-content">

                  {/* Layer 2: real-person persona headline */}
                  <div className="coach-persona">
                    <div className="coach-avatar-wrapper">
                      <div className="coach-avatar">
                        {coach.avatar_url ? <img src={coach.avatar_url} alt={`${coach.name || '教練'}頭像`} /> : <span>{coach.name?.[0] || '教'}</span>}
                      </div>
                      <span className="coach-name">{coach.name}</span>
                    </div>
                    <h2 className="coach-headline">{service.title}</h2>
                    <p className="service-intro">{service.intro}</p>
                  </div>

                  <div className="decision-cards" aria-label="快速判斷這位教練是否適合你">
                    <div className="decision-card decision-card-wide">
                      <span className="decision-label">適合你如果</span>
                      <strong>{fitHint}</strong>
                    </div>
                    <div className="decision-card">
                      <span className="decision-label">時間</span>
                      <strong>{availabilityHint}</strong>
                    </div>
                    <div className="decision-card">
                      <span className="decision-label">費用</span>
                      <strong>{firstLessonPrice}</strong>
                    </div>
                    <div className="decision-card decision-card-wide ask-first-card">
                      <span className="decision-label">第一次不用急著下單</span>
                      <strong>可以先聊，問程度、地點、器材與上課方式</strong>
                    </div>
                  </div>

                  {/* Layer 3: Metadata Row */}
                  <div className="feed-metrics">
                    <div className="metric-pill">
                      <Star size={14} fill={hasRating ? 'currentColor' : 'none'} color="var(--accent)" />
                      <span>{hasRating ? formatCoachRating(coach.overall_rating) : '尚無評價'}</span>
                    </div>
                    <div className="metric-pill">
                      <MapPin size={14} color="rgba(255,255,255,0.6)" />
                      <span>{service.city}</span>
                    </div>
                    <div className="metric-pill target-students">
                      <span>{coachTarget ? `教學風格 · ${coachTarget}` : '教學風格以服務介紹為主'}</span>
                    </div>
                  </div>

                  {/* Layer 4: Strong CTAs */}
                  <div className="feed-actions">
                    <Link href={`/coaches/${coachId}`} prefetch={true} className="btn-secondary btn-press" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      查看教練
                    </Link>
                    <Link href={`/chat?with=${coachId}`} prefetch={true} className="btn-primary btn-press" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      先問教練 <ChevronRight size={18} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}

export default function DiscoverPage() {
  return (
    <div className="discover-native fade-in">
      <style dangerouslySetInnerHTML={{ __html: `
        .discover-native {
          background: #000; /* Pure black for immersive media feel */
          color: #FFF;
          height: 100dvh;
          width: calc(100% + 36px);
          overflow: hidden;
          position: relative;
          /* Offsets to bypass global padding of main.content */
          margin-top: calc(-1 * max(18px, env(safe-area-inset-top)));
          margin-left: -18px;
          margin-right: -18px;
          margin-bottom: -112px;
        }

        /* Top Overlay Header */
        .discover-header {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          z-index: 50;
          padding: max(20px, env(safe-area-inset-top)) 20px 20px;
          background: linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%);
          pointer-events: none; /* Let clicks pass through except on children */
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 12px;
          pointer-events: auto;
          max-width: 430px;
          margin: 0 auto;
        }

        .search-bar {
          flex: 1;
          height: 44px;
          background: rgba(255,255,255,0.15);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 999px;
          display: flex;
          align-items: center;
          padding: 0 16px;
          gap: 8px;
        }

        .search-bar input {
          background: transparent;
          border: none;
          color: #FFF;
          font-size: 15px;
          outline: none;
          width: 100%;
        }
        .search-bar input::placeholder {
          color: rgba(255,255,255,0.6);
        }

        .category-pills {
          display: flex;
          gap: 10px;
          margin-top: 16px;
          pointer-events: auto;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          max-width: 430px;
          margin-left: auto;
          margin-right: auto;
          padding-bottom: 4px;
        }
        .category-pills::-webkit-scrollbar { display: none; }

        .category-pill {
          padding: 8px 16px;
          border-radius: 999px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.54);
          font-size: 14px;
          font-weight: 600;
          white-space: nowrap;
          cursor: pointer;
        }
        .category-pill.active {
          background: #FFF;
          color: #000;
        }

        /* Snap Scroll Feed Container */
        .feed-container {
          height: 100dvh;
          width: 100%;
          overflow-y: scroll;
          scroll-snap-type: y mandatory;
          -webkit-overflow-scrolling: touch;
        }

        .feed-card {
          position: relative;
          height: 100dvh;
          width: 100%;
          scroll-snap-align: start;
          scroll-snap-stop: always;
        }

        .feed-media {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .feed-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(0,0,0,0) 0%,
            rgba(0,0,0,0.1) 40%,
            rgba(0,0,0,0.72) 88%,
            #000 100%
          );
        }

        .feed-content {
          position: absolute;
          bottom: calc(100px + env(safe-area-inset-bottom, 20px));
          left: 0;
          right: 0;
          padding: 0 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          max-width: 500px;
          margin: 0 auto;
        }

        .coach-persona {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .coach-avatar-wrapper {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .coach-avatar {
          width: 32px;
          height: 32px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.2);
          overflow: hidden;
          background: #222;
        }
        .coach-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .coach-avatar span {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          color: #FFF;
          font-size: 14px;
          font-weight: 800;
        }
        .media-fallback {
          display: grid;
          place-items: center;
          align-content: center;
          gap: 8px;
          background: radial-gradient(circle at 50% 20%, rgba(255,138,61,0.24), transparent 34%), #111827;
          color: rgba(255,255,255,0.86);
          text-align: center;
        }
        .media-fallback span { font-size: 28px; font-weight: 900; }
        .media-fallback small { font-size: 13px; color: rgba(255,255,255,0.58); font-weight: 700; }
        .coach-name {
          font-size: 15px;
          font-weight: 700;
          color: rgba(255,255,255,0.54);
          letter-spacing: 0.5px;
        }
        .coach-headline {
          font-size: 28px;
          font-weight: 900;
          margin: 0;
          line-height: 1.2;
          color: #FFF;
          text-shadow: 0 2px 12px rgba(0,0,0,0.6);
        }
        .service-intro {
          font-size: 14px;
          color: rgba(255,255,255,0.75);
          margin: 0;
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-shadow: 0 1px 4px rgba(0,0,0,0.5);
        }

        .decision-cards {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }
        .decision-card {
          min-width: 0;
          padding: 10px 12px;
          border-radius: 14px;
          background: rgba(11,18,32,0.62);
          border: 1px solid rgba(255,255,255,0.12);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.18);
        }
        .decision-card-wide {
          grid-column: 1 / -1;
        }
        .ask-first-card {
          background: rgba(255,138,61,0.16);
          border-color: rgba(255,138,61,0.30);
        }
        .decision-label {
          display: block;
          margin-bottom: 4px;
          color: rgba(255,255,255,0.54);
          font-size: 11px;
          font-weight: 850;
          letter-spacing: 0.04em;
        }
        .decision-card strong {
          display: block;
          color: rgba(255,255,255,0.93);
          font-size: 12px;
          line-height: 1.45;
          font-weight: 850;
          overflow-wrap: anywhere;
        }

        .feed-metrics {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .metric-pill {
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.1);
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .feed-actions {
          display: flex;
          gap: 12px;
          margin-top: 4px;
        }

        .btn-primary {
          flex: 1;
          height: 52px;
          background: var(--accent);
          color: #FFF;
          border: none;
          border-radius: 16px;
          font-size: 16px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
        }

        .btn-secondary {
          width: 52px;
          height: 52px;
          background: rgba(255,255,255,0.15);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.2);
          color: #FFF;
          border-radius: 16px;
          font-size: 14px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        /* Mobile specific text hiding for the secondary button if we want to save space, but width 52 means icon-only or vertical text. Wait, standard says '查看教練' but we set width 52. Let's make it auto. */
        .btn-secondary {
          width: auto;
          padding: 0 16px;
        }
      `}} />
      <Suspense fallback={<div style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>載入中...</div>}>
        <DiscoverFeed />
      </Suspense>
    </div>
  );
}
