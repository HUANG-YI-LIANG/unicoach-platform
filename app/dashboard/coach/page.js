'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { 
  ShoppingBag, MessageCircle, UserCircle, FileText, 
  ChevronRight, TrendingUp, Clock, Wallet, CheckCircle, Info,
  Plus, ShieldCheck, ShieldAlert, Shield, X, ExternalLink, CalendarDays, ListChecks
} from 'lucide-react';
import VideoUpload from '@/components/VideoUpload';

// ── Palette & constants (Synced with User Dashboard) ──────────────────────────
const BLUE   = '#2563EB';
const BG     = '#F1F5F9';
const CARD   = '#FFFFFF';
const BORDER = '#F1F5F9';
const MUTED  = '#94A3B8';
const DARK   = '#0F172A';
const RADIUS = '20px';
const SHADOW = '0 2px 16px rgba(0,0,0,0.06)';

const BOOKING_STATUS = {
  pending_payment: { label: '待付款', color: '#92400E' },
  scheduled: { label: '已確認', color: '#1D4ED8' },
  in_progress: { label: '進行中', color: '#854D0E' },
  pending_completion: { label: '待完課', color: '#7C3AED' },
  completed: { label: '已完成', color: '#059669' },
  cancelled: { label: '已取消', color: '#991B1B' },
};

function bookingStatus(status) {
  return BOOKING_STATUS[status] || { label: status || '未知', color: MUTED };
}

// ── Reusable Components ──────────────────────────────────────────────────────
function SLabel({ children }) {
  return <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: MUTED,
    textTransform: 'uppercase', marginBottom: 8, paddingLeft: 2 }}>{children}</p>;
}

function MetricCard({ label, value, icon: Icon, color, onClick }) {
  return (
    <div 
      onClick={onClick}
      style={{ 
        background: CARD, borderRadius: 16, padding: '16px 14px', boxShadow: SHADOW, flex: 1, minWidth: 0,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.15s',
      }}
      onMouseEnter={e => onClick && (e.currentTarget.style.transform = 'translateY(-2px)')}
      onMouseLeave={e => onClick && (e.currentTarget.style.transform = 'translateY(0)')}
    >
      <div style={{ display:'flex', alignItems:'center', gap: 6, marginBottom: 4 }}>
        <Icon size={14} style={{ color: MUTED }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: MUTED, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{label}</span>
      </div>
      <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: color || DARK }}>{value}</p>
    </div>
  );
}

function QuickAction({ icon: Icon, label, color, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <div 
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ 
        background: CARD, borderRadius: 16, padding: '16px 12px', boxShadow: SHADOW,
        display:'flex', flexDirection:'column', alignItems:'center', gap: 8, cursor:'pointer',
        transition: 'transform 0.2s, background 0.2s',
        transform: hover ? 'translateY(-2px)' : 'none',
        border: `1px solid ${hover ? BORDER : 'transparent'}`
      }}
    >
      <div style={{ width: 40, height: 40, borderRadius: 12, background: `${color}15`, color: color, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Icon size={20} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color: DARK }}>{label}</span>
    </div>
  );
}

export default function CoachDashboard() {
  const [profile, setProfile] = useState(null);
  const [coachDetail, setCoachDetail] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [chatRooms, setChatRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [threshold, setThreshold] = useState('15');
  const router = useRouter();
  const { logout } = useAuth();

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/profile'),
      fetch('/api/bookings'),
      fetch('/api/chat/rooms'),
      fetch('/api/admin/settings'),
    ]).then(async ([profRes, bookRes, chatRes, settRes]) => {
      if (!profRes.ok) return router.push('/login');
      
      const [pData, bData, cData, settingsData] = await Promise.all([
        profRes.json(),
        bookRes.json(),
        chatRes.json(),
        settRes.ok ? settRes.json() : Promise.resolve({}),
      ]);

      if (pData.profile) setProfile(pData.profile);
      if (pData.coach) setCoachDetail(pData.coach);
      if (bData.bookings) setBookings(bData.bookings);
      if (cData.rooms) setChatRooms(cData.rooms); 
      if (settingsData.settings?.no_show_threshold) setThreshold(settingsData.settings.no_show_threshold);
      setLoading(false);
    }).catch((err) => {
      console.error('Coach dashboard fetch error:', err);
      setLoading(false);
    });
  }, [router]);

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'70vh' }}>
      <p style={{ color: MUTED, fontSize: 15, fontWeight: 600 }}>載入中…</p>
    </div>
  );

  const confirmedBookings = bookings.filter(b => ['scheduled', 'in_progress', 'pending_completion'].includes(b.status)).length;
  // ✅ 修正：累加各房未讀數
  const pendingMessages = chatRooms.reduce((sum, r) => sum + (r.unread_count || 0), 0);
  const latestRoomId = chatRooms[0]?.id;
  
  const netEarnings = bookings.reduce((sum, b) => b.status === 'completed' ? sum + (b.coach_payout || 0) : sum, 0);
  const instructorShare = coachDetail ? (100 - coachDetail.commission_rate) : 55;

  return (
    <div style={{ background: BG, minHeight: '100vh', paddingBottom: 100 }}>
      
      {/* ── 1. Header ────────────────────────────────────────────── */}
      <header style={{ padding: '20px 16px 0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <h1 style={{ margin:0, fontSize: 20, fontWeight: 900, color: BLUE, letterSpacing: '-0.02em' }}>UniCoach</h1>
        <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#059669', background: '#D1FAE5', padding: '4px 10px', borderRadius: 100 }}>已登入</span>
        </div>
      </header>

      {/* ── 2. Identity Card ─────────────────────────────────────── */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ 
          background: `linear-gradient(135deg, ${BLUE}, #1E40AF)`, 
          borderRadius: RADIUS, boxShadow: '0 8px 30px rgba(37,99,235,0.2)', 
          padding: '24px', color: '#fff' 
        }}>
          <div style={{ display:'flex', alignItems:'center', gap: 16, marginBottom: 24 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize: 28, fontWeight: 900, border: '2px solid rgba(255,255,255,0.4)', position:'relative', overflow: 'hidden' }}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                profile?.name?.charAt(0) ?? 'C'
              )}
              
              {/* Verification Badge Overlay */}
              <div style={{ 
                position: 'absolute', bottom: -2, right: -2, 
                background: coachDetail?.approval_status === 'approved' ? '#059669' : 
                            coachDetail?.approval_status === 'rejected' ? '#EF4444' : 
                            coachDetail?.approval_status === 'suspended' ? '#6B7280' : '#F59E0B',
                border: '2px solid #1E40AF',
                borderRadius: '50%', padding: 4, display:'flex'
              }}>
                {coachDetail?.approval_status === 'approved' ? <ShieldCheck size={12} color="white" /> : 
                 coachDetail?.approval_status === 'rejected' ? <ShieldAlert size={12} color="white" /> : 
                 <Shield size={12} color="white" />}
              </div>
            </div>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{profile?.name} 教練</p>
                {coachDetail?.approval_status === 'approved' && (
                  <CheckCircle size={16} color="#34D399" />
                )}
              </div>
              <p style={{ margin: 0, fontSize: 12, opacity: 0.8 }}>
                {coachDetail?.approval_status === 'approved' ? '✅ 已通過身份驗證' : 
                 coachDetail?.approval_status === 'rejected' ? '❌ 驗證未通過 (請更新資料)' : 
                 coachDetail?.approval_status === 'suspended' ? '🚫 帳號已被停用' :
                 '⏳ 身份驗證審核中'}
              </p>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap: 1, background: 'rgba(255,255,255,0.1)', borderRadius: 16, overflow:'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
            {[
              { label: '單堂定價', value: `$${coachDetail?.base_price ?? 0}`, clickable: true },
              { label: '平台抽成', value: `${coachDetail?.commission_rate ?? 45}%` },
              { label: '教練實拿', value: `${instructorShare}%` }
            ].map((s, i) => (
              <div 
                key={i} 
                onClick={s.clickable ? () => router.push('/coach/profile/edit') : undefined}
                style={{ 
                  padding: '12px 0', textAlign:'center', background:'rgba(255,255,255,0.05)',
                  cursor: s.clickable ? 'pointer' : 'default',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => s.clickable && (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
                onMouseLeave={e => s.clickable && (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              >
                <p style={{ margin: 0, fontSize: 10, opacity: 0.7, textTransform:'uppercase', fontWeight: 700, marginBottom: 2 }}>{s.label}</p>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 3. Quick Stats (Metrics) ────────────────────────────── */}
      <div style={{ padding: '24px 16px 0', display:'flex', gap: 12 }}>
        <MetricCard 
          label="待回覆訊息" 
          value={pendingMessages} 
          icon={MessageCircle} 
          color={BLUE} 
          onClick={() => latestRoomId ? router.push(`/chat/${latestRoomId}`) : router.push('/chat')} 
        />
        <MetricCard 
          label="待處理訂單" 
          value={confirmedBookings} 
          icon={Clock} 
          color="#F59E0B" 
          onClick={() => router.push('/bookings')} 
        />
        <MetricCard label="本月累計" value={`$${netEarnings.toLocaleString()}`} icon={Wallet} color="#059669" />
      </div>

      {/* ── 4. Action Grid ───────────────────────────────────────── */}
      <div style={{ padding: '24px 16px 0' }}>
        <SLabel>快速入口</SLabel>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap: 12 }}>
          <QuickAction icon={ShoppingBag} label="訂單" color="#6366F1" onClick={() => router.push('/bookings')} />
          <QuickAction icon={TrendingUp} label="價格調整" color="#10B981" onClick={() => router.push('/coach/profile/edit')} />
          <QuickAction icon={ListChecks} label="方案管理" color="#7C3AED" onClick={() => router.push('/coach/plans')} />
          <QuickAction icon={UserCircle} label="基本資料" color="#F59E0B" onClick={() => router.push('/coach/profile/edit')} />
          <QuickAction icon={FileText} label="紀錄卡" color="#EC4899" onClick={() => router.push('/bookings')} />
          <QuickAction icon={CalendarDays} label="時段維護" color="#2563EB" onClick={() => router.push('/coach/schedule')} />
        </div>
      </div>

      {/* ── 5. Video Management ────────────────────────────────────── */}
      <div style={{ padding: '24px 16px 0' }}>
        <VideoUpload />
      </div>

      {/* ── 6. 教學訂單管理 Section ─────────────────────────────── */}
      <div style={{ padding: '24px 16px 0' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 12, paddingLeft: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <SLabel style={{ margin: 0 }}>教學訂單管理</SLabel>
            <button 
              onClick={() => setIsModalOpen(true)}
              style={{ 
                background: `${BLUE}15`, color: BLUE, border:'none', padding: '4px 12px', 
                borderRadius: 100, fontSize: 11, fontWeight: 800, cursor:'pointer',
                display: 'flex', alignItems: 'center', gap: 4
              }}
            >
              <Plus size={12} strokeWidth={3} /> 尋找學員
            </button>
          </div>
          <button 
            onClick={() => router.push('/bookings')}
            style={{ background: 'none', border:'none', color: BLUE, fontSize:12, fontWeight:700, cursor:'pointer' }}
          >查看全部</button>
        </div>
        
        <div style={{ background: CARD, borderRadius: RADIUS, boxShadow: SHADOW, overflow:'hidden' }}>
          {bookings.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign:'center' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>📊</div>
              <p style={{ margin: 0, fontSize: 15, color: DARK, fontWeight: 700 }}>目前沒有訂單</p>
              <p style={{ margin: '4px 0 20px', fontSize: 12, color: MUTED }}>完善教練資料後，學員就能更容易找到你</p>
              <button 
                onClick={() => router.push('/coach/profile/edit')}
                style={{ background: BLUE, color:'#fff', border:'none', padding: '10px 24px', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor:'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.2)' }}
              >
                完善教練資料 →
              </button>
            </div>
          ) : (
            bookings.slice(0, 3).map(b => {
              const status = bookingStatus(b.status);
              return (
              <div key={b.id} style={{ padding: '16px 20px', borderBottom:`1px solid ${BORDER}`, display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer' }} onClick={() => router.push('/bookings')}>
                <div style={{ display:'flex', alignItems:'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: BG, color: MUTED, display:'flex', alignItems:'center', justifyContent:'center', fontWeight: 800 }}>
                    {b.user_name?.charAt(0) ?? 'U'}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: DARK }}>{b.user_name || '學員'}</p>
                    <p style={{ margin: 0, fontSize: 11, color: MUTED }}>{b.expected_time ? new Date(b.expected_time).toLocaleDateString('zh-TW') : '時間待定'}</p>
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: status.color }}>
                    {status.label}
                  </span>
                  <ChevronRight size={14} color={MUTED} />
                </div>
              </div>
              );
            })
          )}
        </div>
        <p style={{ marginTop: 12, fontSize: 11, color: MUTED, display: 'flex', flexDirection: 'column', gap: 4, padding: '0 4px', lineHeight: 1.5 }}>
          <span>ℹ️ 取消政策：開課前 1 小時內取消，可能需支付取消費用，詳情依平台規定。</span>
          <span style={{ color: '#F59E0B', fontWeight: 700 }}>⚠️ 曠課提醒：開課後 {threshold} 分鐘未到視為曠課，不予退費。</span>
        </p>
      </div>

      {/* ── 7. Payout Info ─────────────────────────────────────── */}
      <div style={{ padding: '24px 16px 0' }}>
        <SLabel>收入結算摘要</SLabel>
        <div style={{ background: CARD, borderRadius: RADIUS, boxShadow: SHADOW, padding: 20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: MUTED, fontWeight: 600 }}>本月累積總收 (Net)</span>
            <span style={{ fontSize: 15, fontWeight: 900, color: '#059669' }}>${netEarnings.toLocaleString()}</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap: 10, background: '#F8FAFC', padding: 12, borderRadius: 12 }}>
            <Info size={16} color={BLUE} />
            <p style={{ margin: 0, fontSize: 11, color: '#64748B', lineHeight: 1.5 }}>
              系統會自動扣除 <b>{coachDetail?.commission_rate ?? 45}%</b> 平台服務費。<br/>
              結算金額將於每月 5 號撥款至您的指定帳戶。
            </p>
          </div>
        </div>
      </div>

      {/* ── Logout ─────────────────────────────────────────────────── */}
      <div style={{ padding: '32px 16px 0' }}>
        <button onClick={logout} style={{
          width:'100%', padding:14, background:'#FFFFFF', border:`1px solid ${BORDER}`,
          borderRadius:16, color:'#EF4444', fontWeight:700, fontSize:14, cursor:'pointer',
          boxShadow: SHADOW
        }}>安全登出系統</button>
      </div>

      {/* ── 8. Search Student Modal (Task 1) ────────────────────── */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}>
          <div style={{
            background: CARD, borderRadius: RADIUS, width: '100%', maxWidth: 400,
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden',
            position: 'relative', animation: 'modalIn 0.3s ease-out'
          }}>
            <div style={{ padding: '20px 20px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: DARK }}>尋找學員來源</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: MUTED }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Option 1: Platform Orders (Primary) */}
              <div style={{
                padding: 20, borderRadius: 16, border: `2px solid ${BLUE}`,
                background: `${BLUE}05`, cursor: 'pointer', transition: 'transform 0.2s'
              }}
              onClick={() => {
                setIsModalOpen(false);
                router.push('/bookings');
              }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                   <span style={{ fontSize: 12, fontWeight: 800, color: BLUE, background: `${BLUE}15`, padding: '2px 8px', borderRadius: 100 }}>【主要】平台訂單</span>
                </div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: DARK }}>查看平台訂單</h3>
                <p style={{ margin: '4px 0 12px', fontSize: 13, color: MUTED }}>管理已預約、待付款與已確認的學生訂單</p>
                <button style={{ 
                  width: '100%', padding: '10px', background: BLUE, color: WHITE, 
                  border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700 
                }}>
                  [ 查看訂單 ]
                </button>
              </div>

              {/* Option 2: External (Secondary) */}
              <div style={{
                padding: 16, borderRadius: 16, border: `1px solid ${BORDER}`,
                background: '#F8FAFC', cursor: 'pointer'
              }}
              onClick={() => window.open('https://www.facebook.com/groups/764311090264010', '_blank')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                   <span style={{ fontSize: 11, fontWeight: 700, color: MUTED }}>【次要】外部接案</span>
                </div>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: DARK }}>FB 家教社團</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'space-between', marginTop: 8 }}>
                  <span style={{ fontSize: 12, color: MUTED }}>前往外部來源尋找機會</span>
                  <span style={{ color: BLUE, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2 }}>
                    [ 前往社團 ] <ExternalLink size={12} />
                  </span>
                </div>
              </div>
            </div>
            
            <div style={{ padding: '0 20px 20px' }}>
               <p style={{ margin: 0, fontSize: 11, color: MUTED, textAlign: 'center' }}>
                 多方曝光可大幅提升接案成功率
               </p>
            </div>
          </div>

          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes modalIn {
              from { opacity: 0; transform: translateY(20px) scale(0.95); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}} />
        </div>
      )}

    </div>
  );
}
