'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Globe, // Basketball proxy
  Activity, // Fitness proxy
  Award,    // Soccer proxy
  Zap,      // Badminton proxy
  HelpCircle,
  Star,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  X,
  Loader2
} from 'lucide-react';
import { useAuth } from './AuthProvider';

const BLUE = '#2563EB';
const BG = '#0F172A'; // Dark
const CARD = 'rgba(255, 255, 255, 0.05)';
const BORDER = 'rgba(255, 255, 255, 0.1)';
const WHITE = '#FFFFFF';

const SPORTS = [
  { id: 'badminton', label: '羽球', icon: Zap, color: '#FCD34D' },
  { id: 'basketball', label: '籃球', icon: Globe, color: '#F97316' },
  { id: 'fitness', label: '健身', icon: Activity, color: '#10B981' },
  { id: 'soccer', label: '足球', icon: Award, color: '#3B82F6' },
];

export default function Onboarding() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedSport, setSelectedSport] = useState(null);
  const [coaches, setCoaches] = useState([]);
  const [recommendation, setRecommendation] = useState(null);
  const [closing, setClosing] = useState(false);

  // ── 1. Check Visibility Logics ──────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    
    // Condition: Not logged in AND haven't seen onboarding in this session
    const done = sessionStorage.getItem('onboarding_done');
    if (!user && !done) {
      setVisible(true);
      fetchCoaches();
    }
  }, [user, authLoading]);

  const fetchCoaches = async () => {
    try {
      const res = await fetch('/api/coaches');
      if (res.ok) {
        const data = await res.json();
        setCoaches(data.coaches || []);
      }
    } catch (err) {
      console.error('Onboarding fetch coaches error:', err);
    }
  };

  // ── 2. Handle Step 1 -> Step 2 ──────────────────────────────────────────────
  const handleSportSelect = (sportId) => {
    setSelectedSport(sportId);
    
    // Find recommendation: Look for sport keyword in service_areas/name/philosophy
    // Fallback: Pick highest rated coach
    let match = null;
    if (sportId !== 'unsure') {
      const keyword = sportId.toUpperCase();
      match = coaches.find(c => 
        (c.service_areas?.toUpperCase().includes(keyword)) ||
        (c.name?.toUpperCase().includes(keyword))
      );
    }
    
    // If no match or unsure, pick absolute best rated
    if (!match) {
      match = [...coaches].sort((a, b) => b.rating_avg - a.rating_avg)[0] || coaches[0];
    }
    
    setRecommendation(match);
    setStep(2);
  };

  // ── 3. Handle Step 2 -> Step 3 (Redirect) ───────────────────────────────────
  const handleProceed = () => {
    if (!recommendation) return;
    
    setClosing(true);
    sessionStorage.setItem('onboarding_done', 'true');
    
    // Small delay for fade-out feel
    setTimeout(() => {
      router.push(`/coaches/${recommendation.id || recommendation.user_id}`);
      setVisible(false);
    }, 300);
  };

  const handleSkip = () => {
    setClosing(true);
    sessionStorage.setItem('onboarding_done', 'true');
    setTimeout(() => setVisible(false), 300);
  };

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      background: BG, zIndex: 9999, display: 'flex', flexDirection: 'column',
      animation: closing ? 'fadeOut 0.3s forwards' : 'fadeIn 0.3s forwards',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
      
      {/* ── Progress Bar ────────────────────────────────────────────── */}
      <div style={{ padding: '20px 24px', display: 'flex', gap: 6, alignItems: 'center' }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ 
            width: 8, height: 8, borderRadius: '50%', 
            background: i <= step ? BLUE : 'rgba(255,255,255,0.2)',
            transition: 'background 0.3s'
          }} />
        ))}
        {step < 3 && (
          <button onClick={handleSkip} style={{ 
            marginLeft: 'auto', background: 'none', border: 'none', 
            color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: 600 
          }}>跳過</button>
        )}
      </div>

      <div style={{ flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', animation: 'slideUp 0.4s ease-out' }}>
        
        {step === 1 ? (
          /* ── STEP 1: SPORT SELECTION ────────────────────────────────── */
          <>
            <h2 style={{ fontSize: 28, fontWeight: 900, color: WHITE, margin: '20px 0 10px', lineHeight: 1.2 }}>
              Hi! 很高興見到你<br/>想上什麼樣的課？
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, marginBottom: 40 }}>10 秒內為您媒合最合適的大學生教練</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {SPORTS.map(s => (
                <button 
                  key={s.id} 
                  onClick={() => handleSportSelect(s.id)}
                  style={{
                    background: CARD, border: `1px solid ${BORDER}`, borderRadius: 24,
                    padding: '24px 16px', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: 12, cursor: 'pointer', outline: 'none'
                  }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: `${s.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <s.icon size={24} color={s.color} />
                  </div>
                  <span style={{ color: WHITE, fontSize: 16, fontWeight: 700 }}>{s.label}</span>
                </button>
              ))}
              
              <button 
                onClick={() => handleSportSelect('unsure')}
                style={{
                  gridColumn: 'span 2', background: 'none', border: `1px solid ${BORDER}`,
                  borderRadius: 100, padding: '14px', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 8, marginTop: 10
                }}
              >
                <HelpCircle size={18} color="rgba(255,255,255,0.5)" />
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 600 }}>🤔 不確定，幫我選</span>
              </button>
            </div>
          </>
        ) : (
          /* ── STEP 2: COACH RECOMMENDATION ────────────────────────────── */
          <>
            <h2 style={{ fontSize: 28, fontWeight: 900, color: WHITE, margin: '20px 0 10px', lineHeight: 1.2 }}>
              太棒了！<br/>我們找到了這位：
            </h2>

            <div style={{ 
              background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
              border: `1px solid ${BORDER}`, borderRadius: 32, padding: '4px', overflow: 'hidden'
            }}>
              <div style={{ position: 'relative', borderRadius: 28, overflow: 'hidden', height: 280, background: '#111' }}>
                <div style={{ 
                  position: 'absolute', bottom: 0, left: 0, width: '100%', 
                  background: 'linear-gradient(0deg, rgba(0,0,0,0.8) 0%, transparent 100%)',
                  padding: '24px 20px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', background: BLUE, padding: '2px 8px', borderRadius: 100 }}>🔥 新手首選</span>
                  </div>
                  <h3 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: WHITE }}>{recommendation?.name || '菁英教練'}</h3>
                </div>
                {/* Display Coach Avatar or Placeholder */}
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#222' }}>
                  {recommendation?.avatar_url ? (
                    <img 
                      src={recommendation.avatar_url} 
                      alt={recommendation.name} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  ) : (
                    <span style={{ color: BLUE, fontSize: 60, fontWeight: 900 }}>
                      {recommendation?.name?.charAt(0) || 'C'}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Star size={14} fill="#FCD34D" color="#FCD34D" />
                    <span style={{ color: WHITE, fontWeight: 700, fontSize: 14 }}>{recommendation?.rating_avg || '5.0'}</span>
                  </div>
                  <div style={{ width: 1, height: 12, background: BORDER }} />
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 600 }}>完課數：{recommendation?.review_count || recommendation?.completions || '12'}＋</span>
                </div>

                <div style={{ display: 'flex', gap: 8, background: 'rgba(59,130,246,0.1)', padding: '12px 16px', borderRadius: 16, marginBottom: 20 }}>
                  <CheckCircle2 size={18} color={BLUE} style={{ flexShrink: 0 }} />
                  <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}>
                    {selectedSport === 'unsure' 
                      ? '✅ 適合：想找到適合自己的運動的人' 
                      : '✅ 適合：完全沒基礎 / 想從0開始的人'}
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase' }}>體驗課價格</p>
                    <p style={{ margin: 0, fontSize: 18, color: WHITE, fontWeight: 900 }}>${recommendation?.base_price || '1,000'}</p>
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'right' }}>只需支付 30% 訂金<br/>即可保留名額</p>
                </div>

                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                  <TrendingUp size={14} color={BLUE} /> 大多數人會先試這位教練 👍
                </p>

                <button 
                  onClick={handleProceed}
                  style={{
                    width: '100%', background: BLUE, color: WHITE, borderRadius: 20,
                    padding: '16px', fontSize: 16, fontWeight: 800, border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: '0 8px 30px rgba(37,99,235,0.3)', cursor: 'pointer'
                  }}
                >
                  👉 看這位教練
                </button>
                
                <button 
                  onClick={() => setStep(1)}
                  style={{ 
                    width: '100%', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', 
                    fontSize: 13, fontWeight: 600, marginTop: 16 
                  }}
                >
                  想看其他教練？換一位
                </button>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
