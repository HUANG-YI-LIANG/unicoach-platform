'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { getDashboardPathForRole } from '@/lib/authRedirects';
import {
  Search, Calendar, Wallet, Settings, Star, ChevronRight, 
  MessageCircle, Sparkles, MapPin, Zap, Play
} from 'lucide-react';

const EMPTY_PROFILE = { name: '', avatar_url: null, level: 1 };

const CATEGORIES = [
  { id: '羽球', label: '羽球', icon: '🏸', color: 'rgba(16,185,129,0.15)' },
  { id: '英文口說', label: '英文口說', icon: '🗣️', color: 'rgba(59,130,246,0.15)' },
  { id: '健身', label: '健身', icon: '🏋️', color: 'rgba(239,68,68,0.15)' },
  { id: '投資', label: '投資', icon: '📈', color: 'rgba(245,158,11,0.15)' },
  { id: '吉他', label: '吉他', icon: '🎸', color: 'rgba(139,92,246,0.15)' },
];

export default function UserDashboard() {
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [bookings, setBookings] = useState([]);
  const [recommendedCoaches, setRecommendedCoaches] = useState([]);
  const [feedVideos, setFeedVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showReferralPrompt, setShowReferralPrompt] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [binding, setBinding] = useState(false);
  const [bindError, setBindError] = useState('');
  
  const router = useRouter();
  const { logout } = useAuth();

  useEffect(() => {
    let isMounted = true;
    const cachedData = sessionStorage.getItem('userDashboardCache');
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        setProfile(parsed.profile);
        setBookings(parsed.bookings);
        setRecommendedCoaches(parsed.recommendedCoaches);
        if (parsed.feedVideos) setFeedVideos(parsed.feedVideos);
        setLoading(false);
      } catch (e) {}
    }

    (async () => {
      try {
        const [profileRes, bookingsRes, coachesData, videosData] = await Promise.all([
          fetch('/api/auth/profile'),
          fetch('/api/bookings'),
          fetch('/api/coaches?limit=5').then((res) => (res.ok ? res.json() : { coaches: [] })),
          fetch('/api/videos/feed?page=1&limit=5').then((res) => (res.ok ? res.json() : { videos: [] }))
        ]);

        if (!profileRes.ok) {
          if (isMounted) router.push('/login');
          return;
        }
        const { profile: profileData } = await profileRes.json();
        if (!profileData) {
          if (isMounted) router.replace('/login');
          return;
        }
        if (profileData.role !== 'user') {
          if (isMounted) router.replace(getDashboardPathForRole(profileData.role));
          return;
        }

        if (!isMounted) return;
        setProfile(profileData);
        
        let finalBookings = [];
        if (bookingsRes.ok) {
          const { bookings: bookingData } = await bookingsRes.json();
          finalBookings = Array.isArray(bookingData) ? bookingData : [];
          setBookings(finalBookings);
        }
        
        // 抓取推薦教練 (前 5 名)
        const finalRecommended = Array.isArray(coachesData.coaches) ? coachesData.coaches.slice(0, 5) : [];
        setRecommendedCoaches(finalRecommended);
        
        const finalVideos = Array.isArray(videosData.videos) ? videosData.videos : [];
        setFeedVideos(finalVideos);

        if (!profileData.referred_by && !localStorage.getItem('referral_prompt_dismissed')) {
          setShowReferralPrompt(true);
        }

        sessionStorage.setItem('userDashboardCache', JSON.stringify({
          profile: profileData,
          bookings: finalBookings,
          recommendedCoaches: finalRecommended,
          feedVideos: finalVideos
        }));
      } catch (error) {
        console.error(error);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
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
      <div className="mobile-container" style={{ justifyContent: 'center', alignItems: 'center', background: '#050816' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: 1 }}>載入專屬推薦中...</p>
      </div>
    );
  }

  return (
    <div className="mobile-container" style={{ background: '#050816', overflowX: 'hidden' }}>
      
      {/* =========================================
          第一屏：意圖驅動 (Intent-Driven)
      ========================================= */}
      <header style={{ padding: '40px 20px 24px', position: 'relative', zIndex: 10 }}>
        {/* 背景光暈效果 */}
        <div style={{ position: 'absolute', top: -50, left: '50%', transform: 'translateX(-50%)', width: 400, height: 400, background: 'radial-gradient(circle, rgba(255, 138, 61, 0.12) 0%, transparent 60%)', zIndex: -1, pointerEvents: 'none' }} />
        
        <p style={{ margin: '0 0 8px', fontSize: 16, color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>
          Hi, {profile?.name || '學員'} 👋
        </p>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900, color: '#FFF', letterSpacing: '-0.5px' }}>
          今天想學什麼？
        </h1>

        {/* AI 搜尋框 */}
        <div 
          onClick={() => router.push('/coaches')}
          style={{ 
            marginTop: 24, padding: '16px 20px', borderRadius: 20, 
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)', backdropFilter: 'blur(10px)'
          }}
        >
          <Search size={22} color="rgba(255,255,255,0.5)" />
          <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>搜尋領域或教練...</span>
        </div>

        {/* 熱門分類 */}
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '24px 0 8px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {CATEGORIES.map((cat) => (
            <div 
              key={cat.id} 
              onClick={() => router.push(`/coaches?category=${cat.id}`)}
              style={{
                flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer'
              }}
            >
              <div style={{ width: 64, height: 64, borderRadius: 20, background: cat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, border: '1px solid rgba(255,255,255,0.05)' }}>
                {cat.icon}
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>{cat.label}</span>
            </div>
          ))}
          <div 
            onClick={() => router.push('/coaches')}
            style={{
              flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer'
            }}
          >
            <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', border: '1px solid rgba(255,255,255,0.1)' }}>
              <ChevronRight size={24} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>更多</span>
          </div>
        </div>
      </header>

      <main style={{ paddingBottom: 120 }}>
        
        {/* =========================================
            第二屏：今日推薦教練 (Direct Sales)
        ========================================= */}
        <section style={{ padding: '0 0 32px' }}>
          <div style={{ padding: '0 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: '#FFF', margin: 0 }}>🔥 今日推薦教練</h2>
          </div>
          
          <div style={{ display: 'flex', gap: 16, overflowX: 'auto', padding: '0 20px 20px', scrollbarWidth: 'none' }}>
            {recommendedCoaches.length > 0 ? recommendedCoaches.map((coach) => {
              const defaultService = Array.isArray(coach.services) ? coach.services[0] : null;
              const price = defaultService ? defaultService.price : '詢價';
              const rating = coach.average_rating ? Number(coach.average_rating).toFixed(1) : '5.0';
              
              return (
                <div 
                  key={coach.id} 
                  onClick={() => router.push(`/coaches/${coach.id}`)}
                  style={{
                    flexShrink: 0, width: 260, background: 'rgba(255,255,255,0.03)', 
                    border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24, overflow: 'hidden',
                    cursor: 'pointer', boxShadow: '0 12px 40px rgba(0,0,0,0.2)'
                  }}
                >
                  {/* 教練照片 */}
                  <div style={{ width: '100%', height: 260, position: 'relative' }}>
                    <img 
                      src={coach.avatar_url || 'https://placehold.co/400x500/1e293b/fff?text=Coach'} 
                      alt={coach.name} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '50%', background: 'linear-gradient(to top, #0B1220, transparent)' }} />
                    <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', padding: '4px 10px', borderRadius: 100, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Star size={12} fill="#FBBF24" color="#FBBF24" />
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#FFF' }}>{rating}</span>
                    </div>
                  </div>
                  
                  {/* 教練資訊與預約按鈕 */}
                  <div style={{ padding: '16px 20px', background: '#0B1220' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#FFF' }}>{coach.name}</h3>
                        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{coach.title || '專業教練'}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>起始價</span>
                        <div style={{ fontSize: 16, fontWeight: 900, color: '#FF8A3D' }}>NT${price}</div>
                      </div>
                    </div>
                    
                    <button style={{ 
                      width: '100%', marginTop: 12, padding: 14, borderRadius: 16, border: 0,
                      background: 'rgba(255,255,255,0.06)', color: '#FFF', fontSize: 15, fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                    }}>
                      <Zap size={16} color="#FF8A3D" /> 立即預約
                    </button>
                  </div>
                </div>
              );
            }) : (
              <div style={{ padding: '40px 20px', width: '100%', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                載入教練中...
              </div>
            )}
          </div>
        </section>

        {/* =========================================
            第三屏：視覺動態 (Shorts / Moments)
        ========================================= */}
        <section style={{ padding: '0 0 32px' }}>
          <div style={{ padding: '0 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: '#FFF', margin: 0 }}>🌟 熱門教學亮點</h2>
          </div>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '0 20px 20px', scrollbarWidth: 'none' }}>
            {feedVideos.length > 0 ? (
              feedVideos.map((video, i) => (
                <div 
                  key={video.id || i}
                  onClick={() => router.push(`/explore`)}
                  style={{
                    flexShrink: 0, width: 140, height: 220, borderRadius: 20, position: 'relative', overflow: 'hidden', cursor: 'pointer',
                    border: '1px solid rgba(255,255,255,0.1)', background: '#1e293b'
                  }}
                >
                  <video src={video.video_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted loop autoPlay playsInline />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 60%)' }} />
                  <div style={{ position: 'absolute', bottom: 12, left: 12, right: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#FFF', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{video.title}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Play size={10} /> {video.coach_name || '教練'}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ width: '100%', textAlign: 'center', padding: '20px 0', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
                目前尚未有短影音
              </div>
            )}
          </div>
        </section>

        {/* =========================================
            第四屏：AI 推薦助理
        ========================================= */}
        <section style={{ padding: '0 20px 40px' }}>
          <div 
            onClick={() => router.push('/coaches')}
            style={{
              padding: 24, borderRadius: 24, background: 'linear-gradient(135deg, #1E1B4B, #0B1220)',
              border: '1px solid rgba(99, 102, 241, 0.3)', position: 'relative', overflow: 'hidden',
              cursor: 'pointer', boxShadow: '0 12px 30px rgba(49, 46, 129, 0.3)'
            }}
          >
            <div style={{ position: 'absolute', top: -30, right: -30, width: 150, height: 150, background: 'radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, transparent 70%)', borderRadius: '50%' }} />
            
            <Sparkles size={28} color="#818CF8" style={{ marginBottom: 16 }} />
            <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 900, color: '#FFF' }}>不知道找誰？</h2>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
              告訴我們你的學習目標<br/>AI 將為你配對最合適的專業教練
            </p>
            <button style={{ 
              background: '#818CF8', color: '#FFF', border: 0, padding: '12px 24px', borderRadius: 16,
              fontSize: 14, fontWeight: 800, display: 'inline-block'
            }}>
              AI 幫我找教練
            </button>
          </div>
        </section>

        {/* =========================================
            第五屏：基礎設施 (會員/錢包/設定) 退居幕後
        ========================================= */}
        <section style={{ padding: '24px 20px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>
            我的帳戶
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div onClick={() => router.push('/dashboard/user/wallet')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 16, cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Wallet size={20} color="rgba(255,255,255,0.5)" />
                <span style={{ fontSize: 15, fontWeight: 700, color: '#FFF' }}>點數錢包與儲值</span>
              </div>
              <ChevronRight size={18} color="rgba(255,255,255,0.3)" />
            </div>

            <div onClick={() => router.push('/levels')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 16, cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Star size={20} color="rgba(255,255,255,0.5)" />
                <span style={{ fontSize: 15, fontWeight: 700, color: '#FFF' }}>會員等級 (一般會員)</span>
              </div>
              <ChevronRight size={18} color="rgba(255,255,255,0.3)" />
            </div>

            <div onClick={() => router.push('/dashboard/user/edit')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 16, cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Settings size={20} color="rgba(255,255,255,0.5)" />
                <span style={{ fontSize: 15, fontWeight: 700, color: '#FFF' }}>個人設定</span>
              </div>
              <ChevronRight size={18} color="rgba(255,255,255,0.3)" />
            </div>
            
            <button 
              onClick={logout}
              style={{ 
                marginTop: 16, padding: 16, borderRadius: 16, background: 'transparent', 
                border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', 
                fontSize: 15, fontWeight: 800, cursor: 'pointer'
              }}
            >
              登出
            </button>
          </div>
        </section>

      </main>

      {/* 推薦碼彈窗 */}
      {showReferralPrompt && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 24
        }}>
          <div style={{
            background: '#0B1220', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: '32px 24px', width: '100%', maxWidth: 360,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16
          }}>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#FFF' }}>有朋友推薦你嗎？</h3>
            <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 1.5 }}>
              可以輸入推薦碼，<br />也可以之後再補。
            </p>
            <div style={{ width: '100%', marginTop: 8 }}>
              <input
                type="text"
                placeholder="輸入推薦碼"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12, padding: '14px 16px', color: '#FFF', fontSize: 16, textAlign: 'center',
                  fontWeight: 800, letterSpacing: '2px', outline: 'none'
                }}
              />
              {bindError && <p style={{ margin: '8px 0 0', color: '#EF4444', fontSize: 13, textAlign: 'center', fontWeight: 600 }}>{bindError}</p>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 12, marginTop: 8 }}>
              <button onClick={handleBindReferral} disabled={binding || !referralCode.trim()} style={{
                width: '100%', padding: 14, borderRadius: 12, border: 0,
                background: referralCode.trim() ? '#FF8A3D' : 'rgba(255,255,255,0.1)', color: referralCode.trim() ? '#000' : 'rgba(255,255,255,0.3)',
                fontWeight: 900, fontSize: 15, cursor: referralCode.trim() ? 'pointer' : 'not-allowed'
              }}>
                {binding ? '綁定中...' : '確認綁定'}
              </button>
              <button onClick={handleDismissReferral} style={{ width: '100%', padding: 14, borderRadius: 12, border: 0, background: 'transparent', color: 'rgba(255,255,255,0.5)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                (可略過)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
