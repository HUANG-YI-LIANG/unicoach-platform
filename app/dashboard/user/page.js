'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

// ── Mock data (replaced by API on mount) ──────────────────────────────────────
const MOCK = {
  name: '一般用戶', email: 'user@test.com',
  phone: null, address: null, language: '中文', learning_goals: null,
  level: 1, coupons: [
    { id: 1, discount: 10, label: '首單折抵', expires: '2026-06-30' },
    { id: 2, discount: 15, label: '等級獎勵', expires: '2026-09-01' },
  ],
};

// ── Palette & constants ───────────────────────────────────────────────────────
const BLUE   = '#2563EB';
const BG     = '#F1F5F9';
const CARD   = '#FFFFFF';
const BORDER = '#F1F5F9';
const MUTED  = '#94A3B8';
const DARK   = '#0F172A';
const RADIUS = '20px';
const SHADOW = '0 2px 16px rgba(0,0,0,0.06)';

// ── Reusable components ───────────────────────────────────────────────────────
function SLabel({ children }) {
  return <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: MUTED,
    textTransform: 'uppercase', marginBottom: 8, paddingLeft: 2 }}>{children}</p>;
}

function SettingRow({ icon, label, value, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '15px 18px', cursor: 'pointer',
        borderBottom: `1px solid ${BORDER}`,
        background: hovered ? '#F8FAFC' : CARD,
        transition: 'background 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{icon}</span>
        <span style={{ fontSize: 14, color: DARK, fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, color: MUTED, maxWidth: 140, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value || '未設定'}
        </span>
        <span style={{ fontSize: 12, color: '#CBD5E1', fontWeight: 700 }}>›</span>
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function UserDashboard() {
  const [profile, setProfile] = useState(MOCK);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [threshold, setThreshold] = useState('15');
  const router = useRouter();
  const { logout } = useAuth();

  useEffect(() => {
    (async () => {
      try {
        const [pr, br, sr] = await Promise.all([
          fetch('/api/auth/profile'), 
          fetch('/api/bookings'),
          fetch('/api/admin/settings').then(r => r.ok ? r.json() : {})
        ]);
        if (!pr.ok) { router.push('/login'); return; }
        const { profile: p } = await pr.json();
        if (p) setProfile(prev => ({ ...prev, ...p }));
        if (br.ok) { const { bookings: b } = await br.json(); if (b) setBookings(b); }
        if (sr.settings?.no_show_threshold) setThreshold(sr.settings.no_show_threshold);
      } catch(_) {}
      setLoading(false);
    })();
  }, []);

  // Removed local logout in favor of context logout
  const levelDiscount = `${(profile.level ?? 1) * 5}%`;

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'70vh' }}>
      <p style={{ color: MUTED, fontSize: 15, fontWeight: 600 }}>載入中…</p>
    </div>
  );

  return (
    <div style={{ background: BG, minHeight: '100vh', paddingBottom: 100 }}>

      {/* ── Card 1: Profile ────────────────────────────────────────── */}
      <div style={{ padding: '20px 16px 0' }}>
        <SLabel>我的帳號</SLabel>
        <div style={{ background: CARD, borderRadius: RADIUS, boxShadow: SHADOW, overflow: 'hidden' }}>
          {/* Top row: avatar + identity */}
          <div style={{ display:'flex', alignItems:'center', gap: 16, padding: '20px 20px 0' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: `linear-gradient(135deg, ${BLUE}, #3B82F6)`,
              color: '#fff', display:'flex', alignItems:'center', justifyContent:'center',
              fontSize: 22, fontWeight: 900, flexShrink: 0,
              boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
              overflow: 'hidden'
            }}>
              {profile.avatar_url ? (
                <img src={profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                profile.name?.charAt(0) ?? 'U'
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: DARK }}>{profile.name}</p>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: MUTED, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{profile.email}</p>
            </div>
          </div>

          {/* Stats grid */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 1, background: BORDER, margin: '16px 0 0', borderTop: `1px solid ${BORDER}` }}>
            {[
              { label: '帳號等級', value: `Lv ${profile.level ?? 1}`, color: BLUE },
              { label: '目前折扣', value: `${levelDiscount} OFF`, color: '#059669' },
            ].map(s => (
              <div key={s.label} style={{ background: CARD, padding: '14px 0', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 11, color: MUTED, fontWeight: 600, letterSpacing: '0.05em', textTransform:'uppercase' }}>{s.label}</p>
                <p style={{ margin: '4px 0 0', fontSize: 19, fontWeight: 900, color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Card 2: Coupons ────────────────────────────────────────── */}
      <div style={{ padding: '20px 16px 0' }}>
        <SLabel>我的優惠券</SLabel>
        <div style={{ display:'flex', gap: 12, overflowX:'auto', paddingBottom: 4, scrollbarWidth:'none' }}>
          {(profile.coupons ?? MOCK.coupons).map(c => (
            <div key={c.id} style={{
              minWidth: 140, background: CARD, borderRadius: 16,
              boxShadow: SHADOW, padding: '16px 18px', cursor:'pointer', flexShrink: 0,
              borderTop: `3px solid ${BLUE}`,
              transition: 'transform 0.15s', position:'relative',
            }}
              onMouseEnter={e => e.currentTarget.style.transform='translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}
            >
              <p style={{ margin: 0, fontSize: 26, fontWeight: 900, color: BLUE }}>{c.discount}%</p>
              <p style={{ margin: '4px 0 2px', fontSize: 13, fontWeight: 700, color: DARK }}>{c.label}</p>
              <p style={{ margin: 0, fontSize: 11, color: MUTED }}>至 {c.expires}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Card 3: Personal Info (iOS Settings style) ─────────────── */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom: 8 }}>
          <SLabel>個人資料</SLabel>
          <button
            style={{ fontSize:12, fontWeight:700, color:BLUE, background:'none', border:'none', padding:0, cursor:'pointer', marginBottom:8 }}
            onClick={() => router.push('/dashboard/user/edit')}
          >編輯</button>
        </div>
        <div style={{ background: CARD, borderRadius: RADIUS, boxShadow: SHADOW, overflow:'hidden' }}>
          <SettingRow icon="📞" label="聯絡電話" value={profile.phone} onClick={() => {}} />
          <SettingRow icon="📍" label="常用地址" value={profile.address} onClick={() => {}} />
          <SettingRow icon="🌐" label="語言" value={profile.language ?? '中文'} onClick={() => {}} />
          <SettingRow icon="🎯" label="學習目標" value={profile.learning_goals} onClick={() => {}} />
        </div>
      </div>

      {/* ── Card 4: Bookings ───────────────────────────────────────── */}
      <div style={{ padding: '20px 16px 0' }}>
        <SLabel>最新預約紀錄</SLabel>
        <div style={{ background: CARD, borderRadius: RADIUS, boxShadow: SHADOW, overflow:'hidden' }}>
          {bookings.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign:'center' }}>
              <p style={{ fontSize: 36, margin: '0 0 8px' }}>📅</p>
              <p style={{ margin: 0, fontSize: 14, color: MUTED, fontWeight: 500 }}>目前沒有預約紀錄</p>
              <button
                onClick={() => router.push('/coaches')}
                style={{ marginTop: 16, padding:'10px 28px', background: BLUE, color:'#fff',
                  border:'none', borderRadius: 12, fontSize:13, fontWeight:700, cursor:'pointer' }}
              >去找教練 →</button>
            </div>
          ) : bookings.slice(0,4).map(b => (
            <div key={b.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
              padding: '14px 18px', borderBottom:`1px solid ${BORDER}` }}>
              <div>
                <p style={{ margin:0, fontSize:14, fontWeight:700, color:DARK }}>{b.coach_name ?? `教練 #${b.coach_id?.substring(0,6)}`}</p>
                <p style={{ margin:'3px 0 0', fontSize:12, color:MUTED }}>
                  {b.expected_time ? new Date(b.expected_time).toLocaleDateString('zh-TW') : '時間待定'}
                  {' · '}NT${b.final_price ?? b.base_price}
                </p>
              </div>
              <span style={{
                fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:100,
                background: b.status==='completed'?'#D1FAE5': b.status==='scheduled'?'#DBEAFE':'#FEE2E2',
                color: b.status==='completed'?'#065F46': b.status==='scheduled'?'#1D4ED8':'#991B1B',
              }}>
                {b.status==='completed'?'已完成':b.status==='scheduled'?'已排程':b.status}
              </span>
            </div>
          ))}
        </div>
        <p style={{ marginTop: 12, fontSize: 11, color: MUTED, display: 'flex', flexDirection: 'column', gap: 4, padding: '0 4px', lineHeight: 1.5 }}>
          <span>ℹ️ 取消政策：開課前 1 小時內取消，可能需支付取消費用，詳情依平台規定。</span>
          <span style={{ color: '#F59E0B', fontWeight: 700 }}>⚠️ 曠課提醒：開課後 {threshold} 分鐘未到視為曠課，不予退費。</span>
        </p>
      </div>

      {/* ── Logout ─────────────────────────────────────────────────── */}
      <div style={{ padding: '28px 16px 0' }}>
        <button onClick={logout} style={{
          width:'100%', padding:14, background:'#F1F5F9', border:'none',
          borderRadius:16, color:'#64748B', fontWeight:600, fontSize:14, cursor:'pointer',
        }}>登出</button>
      </div>
    </div>
  );
}
