'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileText, MapPin, User, ChevronRight, Loader2, Search, PlaySquare, MessageCircle } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

const SPORT_IMAGES = {
  '籃球': 'https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=600&auto=format&fit=crop',
  '網球': 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=600&auto=format&fit=crop',
  '羽球': 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?q=80&w=600&auto=format&fit=crop',
  '健身': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=600&auto=format&fit=crop',
  '游泳': 'https://images.unsplash.com/photo-1530549387789-4c1017266635?q=80&w=600&auto=format&fit=crop',
  '瑜珈': 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=600&auto=format&fit=crop',
  '桌球': 'https://images.unsplash.com/photo-1534158914592-062992fbe900?q=80&w=600&auto=format&fit=crop',
  '排球': 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?q=80&w=600&auto=format&fit=crop',
};
const DEFAULT_SPORT_IMAGE = 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=600&auto=format&fit=crop';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sports, setSports] = useState([]);
  const [isLoadingSports, setIsLoadingSports] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isQRUser, setIsQRUser] = useState(false);

  useEffect(() => {
    // Check if user came from a QR code (e.g. ?ref=XYZ or ?qrcode=1)
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const hasQRParam = urlParams.has('ref') || urlParams.has('promo') || urlParams.has('qrcode');
      
      if (hasQRParam) {
        setIsQRUser(true);
        const seen = localStorage.getItem('has_seen_onboarding');
        if (!seen) {
          setShowOnboarding(true);
        }
      }
    }
    
    async function fetchSports() {
      try {
        const res = await fetch('/api/coaches');
        if (res.ok) {
          const data = await res.json();
          const sportCounts = {};
          data.coaches.forEach(coach => {
            if (coach.service_areas) {
              const parts = coach.service_areas.split(/[、,，\s]+/);
              parts.forEach(p => {
                const sport = p.trim();
                if (sport) {
                  sportCounts[sport] = (sportCounts[sport] || 0) + 1;
                }
              });
            }
          });
          
          const sortedSports = Object.entries(sportCounts)
            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
            .slice(0, 6)
            .map(entry => entry[0]);
            
          setSports(sortedSports);
        }
      } catch (error) {
        console.error('Failed to fetch sports', error);
      } finally {
        setIsLoadingSports(false);
      }
    }
    fetchSports();
  }, []);

  const handleOnboardingSelect = (sport) => {
    localStorage.setItem('has_seen_onboarding', 'true');
    setShowOnboarding(false);
    if (sport === '幫我選') {
      router.push('/coaches');
    } else {
      router.push(`/coaches?sport=${encodeURIComponent(sport)}`);
    }
  };

  if (loading) {
    return (
      <div style={{ height: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
        <Loader2 style={{ animation: 'spin 1s linear infinite' }} size={32} />
      </div>
    );
  }

  return (
    <div className="premium-landing">
      {/* Onboarding Modal */}
      {showOnboarding && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: 24
        }}>
          <div style={{
            background: 'var(--bg-surface)', padding: 32, borderRadius: 24,
            width: '100%', maxWidth: 400, textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 24, color: 'var(--text-main)' }}>
              你想學什麼運動？
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              {['籃球', '羽球', '健身', '網球'].map(s => (
                <button
                  key={s}
                  onClick={() => handleOnboardingSelect(s)}
                  style={{
                    background: 'var(--bg-page)', color: 'var(--text-main)', border: '1px solid var(--border-main)',
                    padding: '16px', borderRadius: 16, fontSize: 16, fontWeight: 800, transition: '0.2s'
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
            <button
              onClick={() => handleOnboardingSelect('幫我選')}
              style={{
                width: '100%', background: 'var(--color-accent)', color: 'var(--text-light)', border: 'none',
                padding: '16px', borderRadius: 16, fontSize: 16, fontWeight: 800,
                marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
              }}
            >
              🤔 幫我選
            </button>
          </div>
        </div>
      )}

      {/* 1. 第一屏 (Hero 成交區) */}
      <section className="premium-hero">
        <div className="premium-hero-bg"></div>
        <div className="premium-hero-content">
          <div className="premium-brand">UniCoach</div>
          <h1 className="premium-title">找附近最適合你的<br />大學生教練</h1>
          <p className="premium-subtitle">完全不會也可以，有人陪你從0開始練</p>
          
          <div className="premium-cta-group">
            <button onClick={() => router.push('/coaches')} className="premium-btn-primary" style={{
              width: '100%', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px', fontWeight: 900, gap: 8, border: 'none', cursor: 'pointer'
            }}>
              我要找教練
            </button>
            <button onClick={() => router.push('/register?role=coach')} className="premium-btn-text" style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', cursor: 'pointer'
            }}>
              我是教練，想接案
            </button>
          </div>
        </div>
      </section>

      {/* 2. 三個信任點 (原版) */}
      {!isQRUser && (
        <section className="premium-trust-section">
          <div className="premium-trust-card">
            <div className="trust-title">
              <div className="trust-icon-wrapper"><FileText size={20} /></div>
              每堂課都有學習紀錄
            </div>
            <div className="trust-desc">完整追蹤你的進步旅程</div>
          </div>
          <div className="premium-trust-card">
            <div className="trust-title">
              <div className="trust-icon-wrapper"><MapPin size={20} /></div>
              可到府教學 / 球場陪練
            </div>
            <div className="trust-desc">地點彈性，教練隨時就緒</div>
          </div>
          <div className="premium-trust-card">
            <div className="trust-title">
              <div className="trust-icon-wrapper"><User size={20} /></div>
              真實教練資料與評價
            </div>
            <div className="trust-desc">全部通過審核與身分驗證</div>
          </div>
        </section>
      )}

      {/* 2. 4步驟卡片 (QR Code 用戶專屬) */}
      {isQRUser && (
        <section style={{ padding: '32px 24px', marginTop: '-30px', position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16, msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
          {[
            { icon: <Search size={24} color="var(--color-accent)" />, title: '1. 找教練', desc: '馬上找到附近教練' },
            { icon: <PlaySquare size={24} color="var(--color-accent)" />, title: '2. 看影片', desc: '30秒快速判斷合不合' },
            { icon: <MessageCircle size={24} color="var(--color-accent)" />, title: '3. 先問教練', desc: '不確定先問清楚' },
            { icon: <User size={24} color="var(--color-accent)" />, title: '4. 預約課程', desc: '選時間直接上課' },
          ].map((step, idx) => (
            <div key={idx} onClick={() => router.push('/coaches')} style={{
              minWidth: 160, background: 'var(--bg-surface)', padding: 20, borderRadius: 20,
              boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-main)', cursor: 'pointer'
            }}>
              <div style={{ background: 'rgba(245, 158, 11, 0.1)', width: 48, height: 48, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                {step.icon}
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 900, margin: '0 0 8px', color: 'var(--text-main)' }}>{step.title}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, fontWeight: 600 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>
      )}

      {/* 3. 運動分類入口 */}
      <section className="premium-sports-section">
        <div className="sports-header">
          <h2 className="sports-title">熱門運動類別</h2>
          <span className="sports-subtitle">依教練專長推薦</span>
        </div>
        
        {isLoadingSports ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0', color: 'var(--color-text-muted)' }}>
            <Loader2 style={{ animation: 'spin 1s linear infinite' }} size={24} />
          </div>
        ) : sports.length > 0 ? (
          <div className="premium-sports-grid">
            {sports.map(sport => (
              <Link href={`/coaches?sport=${encodeURIComponent(sport)}`} key={sport} className="sport-card">
                <img 
                  src={SPORT_IMAGES[sport] || DEFAULT_SPORT_IMAGE} 
                  alt={sport} 
                  className="sport-card-bg"
                  loading="lazy"
                />
                <div className="sport-card-overlay"></div>
                <div className="sport-card-content">
                  <span className="sport-name">{sport}</span>
                  <ChevronRight size={16} className="sport-arrow" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)', fontSize: '14px', fontWeight: 600 }}>
            目前尚無開放的教練專長 👉 
            <Link href="/coaches" style={{ color: 'var(--color-accent)', fontWeight: 800 }}>去找教練</Link>
          </div>
        )}
      </section>

      {/* 4. Footer */}
      <footer className="premium-footer">
        <span className="premium-footer-brand">UniCoach</span>
        <p className="premium-footer-copy">© UniCoach</p>
      </footer>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        ::-webkit-scrollbar { display: none; }
      `}} />
    </div>
  );
}
