'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { getDashboardPathForRole } from '@/lib/authRedirects';
import {
  Menu, Bell, ArrowUpRight, ChevronRight, MessageCircle, 
  Search, Dumbbell, BookOpen, Palette, Users, Star, Clock, MapPin, Check
} from 'lucide-react';

const BG = 'var(--bg-primary)';
const CARD = 'var(--bg-card)';
const ORANGE = 'var(--accent)';
const MUTED = 'var(--text-muted)';
const TEXT_LIGHT = 'var(--text-primary)';
const BORDER = 'var(--border)';

const EMPTY_PROFILE = { name: '', avatar_url: null };

function SectionLabel({ children }) {
  return (
    <p style={{
      fontSize: 12, fontWeight: 700, letterSpacing: '0.1em',
      color: MUTED, textTransform: 'uppercase', marginBottom: 16, paddingLeft: 4
    }}>
      {children}
    </p>
  );
}

export default function UserDashboard() {
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [bookings, setBookings] = useState([]);
  const [recommendedCoaches, setRecommendedCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading) {
    return (
      <div className="mobile-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <p style={{ color: MUTED }}>載入中...</p>
      </div>
    );
  }

  const nextBooking = bookings[0] || null;

  return (
    <div className="mobile-container fade-in" style={{ backgroundColor: BG, minHeight: '100vh' }}>
      
      {/* ── HEADER ── */}
      <header style={{ 
        padding: 'var(--padding-page)', paddingTop: '40px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ 
            width: 44, height: 44, borderRadius: 22, backgroundColor: CARD,
            border: `1px solid ${BORDER}`, overflow: 'hidden'
          }}>
            {profile.avatar_url && <img src={profile.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
          </div>
          <div>
            <p style={{ fontSize: 13, color: MUTED, marginBottom: 2 }}>晚安，</p>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: TEXT_LIGHT, letterSpacing: '-0.02em', margin: 0 }}>
              {profile.name || '學員'}
            </h1>
          </div>
        </div>
        <button className="btn-press" onClick={() => router.push('/notifications')} style={{ 
          background: CARD, border: `1px solid ${BORDER}`, width: 44, height: 44, borderRadius: 22,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: TEXT_LIGHT
        }}>
          <Bell size={20} />
        </button>
      </header>

      <main style={{ padding: '0 var(--padding-page) 100px', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-section)' }}>
        
        {/* ── HERO COPY ── */}
        <section style={{ marginBottom: 8 }}>
          <h2 style={{ fontSize: 28, fontWeight: 900, color: TEXT_LIGHT, margin: '0 0 12px', lineHeight: 1.2 }}>
            找教練，<br />
            <span style={{ color: ORANGE }}>不用再滑社團文章。</span>
          </h2>
          <p style={{ fontSize: 15, color: MUTED, margin: 0, lineHeight: 1.6 }}>
            先看教學風格，再預約體驗課。<br />
            少問 10 次，直接看時段。
          </p>
        </section>

        {/* ── SEARCH ── */}
        <section>
          <div className="btn-press" onClick={() => router.push('/coaches')} style={{ 
            background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', boxShadow: 'var(--shadow-sm)'
          }}>
            <Search size={20} color={MUTED} />
            <span style={{ color: MUTED, fontSize: 15, fontWeight: 500 }}>想學什麼技能？</span>
          </div>
        </section>

        {/* ── LEARNING ACTIVITY ── */}
        <section>
          <SectionLabel>學習活動 · learning activity</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 14, boxShadow: 'var(--shadow-card)' }}>
              <p style={{ margin: '0 0 6px', color: MUTED, fontSize: 12, fontWeight: 650 }}>本週課程</p>
              <strong style={{ color: TEXT_LIGHT, fontSize: 20, fontWeight: 760 }}>{bookings.length || 0}</strong>
              <p style={{ margin: '4px 0 0', color: MUTED, fontSize: 11 }}>以實際訂單為準</p>
            </div>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 14, boxShadow: 'var(--shadow-card)' }}>
              <p style={{ margin: '0 0 6px', color: MUTED, fontSize: 12, fontWeight: 650 }}>下次預約</p>
              <strong style={{ color: TEXT_LIGHT, fontSize: 15, fontWeight: 720 }}>{nextBooking?.services?.title || '尚未安排'}</strong>
              <p style={{ margin: '4px 0 0', color: MUTED, fontSize: 11 }}>待確認時段會顯示於我的預約</p>
            </div>
            <div style={{ gridColumn: '1 / -1', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'var(--shadow-card)' }}>
              <div>
                <p style={{ margin: '0 0 4px', color: MUTED, fontSize: 12, fontWeight: 650 }}>最近觀看</p>
                <strong style={{ color: TEXT_LIGHT, fontSize: 15, fontWeight: 720 }}>繼續比較適合的教練</strong>
              </div>
              <button onClick={() => router.push('/coaches')} style={{ padding: '8px 12px', borderRadius: 999, background: 'rgba(255,138,61,0.10)', color: ORANGE, fontSize: 12, fontWeight: 700 }}>
                去探索
              </button>
            </div>
          </div>
        </section>

        {/* ── CATEGORIES ── */}
        <section>
          <SectionLabel>探索領域</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { icon: Dumbbell, label: '運動健身', color: '#3B82F6' },
              { icon: BookOpen, label: '語言學習', color: '#10B981' },
              { icon: Palette, label: '音樂藝術', color: '#8B5CF6' },
              { icon: Users, label: '商業職涯', color: ORANGE }
            ].map((cat, i) => {
              const Icon = cat.icon;
              return (
                <div key={i} className="hover-lift btn-press" onClick={() => router.push(`/coaches?category=${cat.label}`)} style={{ 
                  background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16,
                  display: 'flex', flexDirection: 'column', gap: 12, cursor: 'pointer'
                }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${cat.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: cat.color }}>
                    <Icon size={18} strokeWidth={2.5} />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: TEXT_LIGHT }}>{cat.label}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── RECENT BOOKINGS ── */}
        {bookings.length > 0 && (
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <SectionLabel style={{ margin: 0 }}>近期預約</SectionLabel>
              <span onClick={() => router.push('/dashboard/user/edit')} style={{ fontSize: 13, color: ORANGE, fontWeight: 600, cursor: 'pointer' }}>全部</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {bookings.slice(0, 2).map((b, i) => (
                <div key={i} className="hover-lift" style={{ 
                  background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 20,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 11, color: MUTED, fontWeight: 700 }}>{new Date(b.booking_date).getMonth()+1}月</span>
                      <span style={{ fontSize: 16, color: TEXT_LIGHT, fontWeight: 800 }}>{new Date(b.booking_date).getDate()}</span>
                    </div>
                    <div>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: TEXT_LIGHT, margin: '0 0 4px' }}>{b.services?.title}</h4>
                      <p style={{ fontSize: 13, color: MUTED, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Clock size={12} /> {b.start_time} - {b.end_time}
                      </p>
                    </div>
                  </div>
                  <div style={{ 
                    padding: '6px 12px', borderRadius: 100, fontSize: 12, fontWeight: 700,
                    background: 'rgba(255, 138, 61, 0.1)', color: ORANGE
                  }}>
                    預約成功
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── RECOMMENDED COACHES ── */}
        <section>
          <SectionLabel>推薦教練</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {recommendedCoaches.map((coach, idx) => (
              <div key={idx} className="hover-lift btn-press" onClick={() => router.push(`/coaches/${coach.id}`)} style={{ 
                background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 16,
                display: 'flex', gap: 16, cursor: 'pointer'
              }}>
                <img src={coach.avatar_url || 'https://placehold.co/100x100/1e293b/fff?text=Coach'} 
                     alt="coach" style={{ width: 64, height: 64, borderRadius: 16, objectFit: 'cover' }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: TEXT_LIGHT, margin: 0 }}>{coach.name}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255, 138, 61, 0.15)', padding: '2px 8px', borderRadius: 100 }}>
                      <Star size={10} color={ORANGE} fill={ORANGE} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: ORANGE }}>{coach.rating || '5.0'}</span>
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: MUTED, margin: '0 0 8px' }}>{coach.title || '專業教練'}</p>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {coach.skills?.slice(0, 2).map((skill, si) => (
                      <span key={si} style={{ fontSize: 11, color: MUTED, background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 6 }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
