'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileText, MapPin, User, ChevronRight, Loader2 } from 'lucide-react';
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

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'coach') router.replace('/dashboard/coach');
      else if (user.role === 'admin') router.replace('/dashboard/admin');
      else router.replace('/dashboard/user');
    }
  }, [user, loading, router]);

  useEffect(() => {
    async function fetchSports() {
      try {
        const res = await fetch('/api/coaches');
        if (res.ok) {
          const data = await res.json();
          // 只統計 approved 的教練（/api/coaches 已經預設過濾）
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
          
          // 依教練數量排序，最多取前 6 個
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

  if (loading && user) {
    return (
      <div style={{ height: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
        <Loader2 style={{ animation: 'spin 1s linear infinite' }} size={32} />
      </div>
    );
  }

  if (user) {
    return (
      <div style={{ height: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
        正在進入專屬畫面...
      </div>
    );
  }

  return (
    <div className="premium-landing">
      {/* 1. 第一屏 (Hero 成交區) */}
      <section className="premium-hero">
        <div className="premium-hero-bg"></div>
        <div className="premium-hero-content">
          <div className="premium-brand">UniCoach</div>
          <h1 className="premium-title">找附近最適合你的<br />大學生教練</h1>
          <p className="premium-subtitle">完全不會也可以，有人陪你從0開始練</p>
          
          <div className="premium-cta-group">
            <Link href="/register?role=user" className="premium-btn-primary">
              我要找教練
            </Link>
            <Link href="/register?role=coach" className="premium-btn-text">
              我是教練，想接案
            </Link>
          </div>
        </div>
      </section>

      {/* 2. 三個信任點 */}
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

      {/* 3. 運動分類入口 */}
      <section className="premium-sports-section">
        <div className="sports-header">
          <h2 className="sports-title">熱門運動類別</h2>
          <span className="sports-subtitle">依教練專長推薦</span>
        </div>
        
        {isLoadingSports ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0', color: '#94A3B8' }}>
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
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748B', fontSize: '14px' }}>
            目前尚無開放的教練專長
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
      `}} />
    </div>
  );
}
