'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { getDashboardPathForRole } from '@/lib/authRedirects';
import {
  Bell, ChevronRight, ChevronDown, Apple, Search, 
  Calendar, Wallet, Settings, Dumbbell, Star, Smartphone
} from 'lucide-react';

const EMPTY_PROFILE = { name: '', avatar_url: null, level: 1 };

function AccordionItem({ title, icon: Icon, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="accordion-item">
      <div className="accordion-header" onClick={() => setIsOpen(!isOpen)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Icon size={20} color="var(--text-muted)" />
          <span>{title}</span>
        </div>
        {isOpen ? <ChevronDown size={20} color="var(--text-muted)" /> : <ChevronRight size={20} color="var(--text-muted)" />}
      </div>
      <div className={`accordion-content ${isOpen ? 'open' : ''}`}>
        <div className="accordion-inner">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function UserDashboard() {
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [bookings, setBookings] = useState([]);
  const [recommendedCoaches, setRecommendedCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showReferralPrompt, setShowReferralPrompt] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [binding, setBinding] = useState(false);
  const [bindError, setBindError] = useState('');
  
  const router = useRouter();
  const { logout } = useAuth();

  useEffect(() => {
    (async () => {
      try {
        const [profileRes, bookingsRes, coachesData] = await Promise.all([
          fetch('/api/auth/profile'),
          fetch('/api/bookings'),
          fetch('/api/coaches?limit=3').then((res) => (res.ok ? res.json() : { coaches: [] }))
        ]);

        if (!profileRes.ok) return router.push('/login');
        const { profile: profileData } = await profileRes.json();
        if (!profileData) return router.replace('/login');
        if (profileData.role !== 'user') return router.replace(getDashboardPathForRole(profileData.role));

        setProfile(profileData);
        if (bookingsRes.ok) {
          const { bookings: bookingData } = await bookingsRes.json();
          setBookings(Array.isArray(bookingData) ? bookingData : []);
        }
        setRecommendedCoaches(Array.isArray(coachesData.coaches) ? coachesData.coaches.slice(0, 3) : []);

        if (!profileData.referred_by && !localStorage.getItem('referral_prompt_dismissed')) {
          setShowReferralPrompt(true);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const handleDismissReferral = () => {
    localStorage.setItem('referral_prompt_dismissed', 'true');
    setShowReferralPrompt(false);
  };

  const handleBindReferral = async () => {
    if (!referralCode.trim()) return;
    setBinding(true);
    setBindError('');
    try {
      const res = await fetch('/api/user/referral/bind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: referralCode })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('referral_prompt_dismissed', 'true');
        setShowReferralPrompt(false);
        setProfile(prev => ({ ...prev, referred_by: 'bound' }));
      } else {
        setBindError(data.error || '綁定失敗');
      }
    } catch (e) {
      setBindError('網路錯誤，請稍後再試');
    } finally {
      setBinding(false);
    }
  };

  if (loading) {
    return (
      <div className="mobile-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>載入中...</p>
      </div>
    );
  }

  const nextBooking = bookings[0] || null;

  return (
    <div className="mobile-container" style={{ background: 'var(--bg-primary)' }}>
      <main className="content" style={{ padding: '24px 20px', paddingBottom: '120px' }}>
        
        {/* HEADER */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>Hi, {profile.name || '學員'}</span>
            {profile?.registration_number && <span style={{ fontSize: '0.65em', color: 'var(--text-muted)', fontWeight: 800 }}>#{profile.registration_number}</span>}
          </h1>
          <button onClick={() => router.push('/notifications')} style={{ background: 'transparent', padding: 8, color: 'var(--text-primary)' }}>
            <Bell size={24} />
          </button>
        </header>

        {/* METALLIC LEVEL CARD */}
        <div className="metallic-card metallic-silver" style={{ marginBottom: 24 }}>
          <div className="metallic-card-title">一般會員等級</div>
          <div className="metallic-progress-bg">
            <div className="metallic-progress-fill" style={{ width: '40%' }}></div>
          </div>
          <div className="metallic-card-desc">再消費 NT$5400 即可成為黃金會員等級</div>
          <div className="metallic-card-link" onClick={() => router.push('/levels')}>
            <span>了解會員等級權益</span>
            <ChevronRight size={16} />
          </div>
          <div style={{ position: 'absolute', right: 20, top: 20, width: 24, height: 24, background: 'rgba(0,0,0,0.1)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: 'var(--text-primary)' }}>
            S
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div className="quick-action-grid">
          <div className="quick-action-btn" onClick={() => router.push('/coaches')}>
            <Search className="quick-action-icon" />
            <span className="quick-action-text">找教練</span>
          </div>
          <div className="quick-action-btn" onClick={() => router.push('/dashboard/user/wallet')}>
            <Wallet className="quick-action-icon" />
            <span className="quick-action-text">我的點數</span>
          </div>
          <div className="quick-action-btn" onClick={() => router.push('/dashboard/user/edit')}>
            <Settings className="quick-action-icon" />
            <span className="quick-action-text">個人檔案</span>
          </div>
        </div>

        {/* ACCORDION SECTIONS */}
        <div className="accordion-wrapper">
          
          <AccordionItem title="學習活動與預約" icon={Calendar} defaultOpen={true}>
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ background: 'var(--bg-card)', padding: 12, borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 4 }}>下次預約</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{nextBooking?.services?.title || '尚未安排'}</div>
              </div>
              <div style={{ background: 'var(--bg-card)', padding: 12, borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 4 }}>近期完成</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{bookings.length} 堂課程</div>
              </div>
            </div>
          </AccordionItem>

          <AccordionItem title="推薦教練" icon={Star}>
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recommendedCoaches.length > 0 ? recommendedCoaches.map((coach, idx) => (
                <div key={idx} onClick={() => router.push(`/coaches/${coach.id}`)} style={{ display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer', background: 'var(--bg-card)', padding: 8, borderRadius: 8 }}>
                  <img src={coach.avatar_url || 'https://placehold.co/100x100/1e293b/fff?text=Coach'} alt="coach" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }} />
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: 14 }}>{coach.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{coach.title || '專業教練'}</div>
                  </div>
                </div>
              )) : (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>目前無推薦教練</div>
              )}
            </div>
          </AccordionItem>

          <AccordionItem title="探索領域" icon={Dumbbell}>
            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {['運動健身', '語言學習', '音樂藝術', '商業職涯'].map(cat => (
                <div key={cat} onClick={() => router.push(`/coaches?category=${cat}`)} style={{ background: 'var(--bg-card)', padding: '12px 8px', borderRadius: 8, textAlign: 'center', fontWeight: 800, fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer' }}>
                  {cat}
                </div>
              ))}
            </div>
          </AccordionItem>

        </div>

        {/* APP DOWNLOAD BUTTONS (Inverted for dark section look, but page is white. Let's make it fit.) */}
        <div style={{ marginTop: 40, marginBottom: 20 }}>
          <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 12 }}>
            下載 UniteCoach 專屬 APP
          </div>
          <button onClick={() => router.push('/download')} className="app-download-btn" style={{ border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)' }}>
            <Apple size={20} /> iOS 下載
          </button>
          <button onClick={() => router.push('/download')} className="app-download-btn" style={{ border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)' }}>
            <Smartphone size={20} /> Android 下載
          </button>
        </div>

        {/* LOGOUT BUTTON */}
        <button className="logout-btn-black" onClick={logout}>
          登出
        </button>

      </main>

      {/* REFERRAL MODAL */}
      {showReferralPrompt && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyItems: 'center', zIndex: 9999, padding: 24
        }}>
          <div style={{
            background: 'var(--bg-card)', borderRadius: 24, padding: '32px 24px', width: '100%', maxWidth: 360,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16
          }}>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>有朋友推薦你嗎？</h3>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5 }}>
              可以輸入推薦碼，<br />也可以之後再補。
            </p>
            <div style={{ width: '100%', marginTop: 8 }}>
              <input
                type="text"
                placeholder="輸入推薦碼"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                style={{
                  width: '100%', background: '#F5F5F5', border: 'none',
                  borderRadius: 12, padding: '14px 16px', color: 'var(--text-primary)', fontSize: 16, textAlign: 'center',
                  fontWeight: 800, letterSpacing: '2px', outline: 'none'
                }}
              />
              {bindError && <p style={{ margin: '8px 0 0', color: '#EF4444', fontSize: 13, textAlign: 'center', fontWeight: 600 }}>{bindError}</p>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 12, marginTop: 8 }}>
              <button onClick={handleBindReferral} disabled={binding || !referralCode.trim()} style={{
                width: '100%', padding: 14, borderRadius: 12, border: 0,
                background: referralCode.trim() ? '#FF8A3D' : '#E5E5E5', color: referralCode.trim() ? '#000' : '#999',
                fontWeight: 800, fontSize: 15, cursor: referralCode.trim() ? 'pointer' : 'not-allowed'
              }}>
                {binding ? '綁定中...' : '確認綁定'}
              </button>
              <button onClick={handleDismissReferral} style={{ width: '100%', padding: 14, borderRadius: 12, border: 0, background: 'transparent', color: 'var(--text-muted)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                (可略過)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
