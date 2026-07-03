'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import Navigation from '@/components/Navigation';
import { Target, Search, Filter, Star, Clock, MapPin, ChevronRight, MessageCircle } from 'lucide-react';
import Image from 'next/image';

export default function DemandsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [demands, setDemands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [biddingId, setBiddingId] = useState(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user || user.role !== 'coach') {
        router.replace('/login');
        return;
      }
      fetchDemands();
    }
  }, [user, authLoading, router]);

  const fetchDemands = async () => {
    try {
      // For now we use the existing /api/students endpoint which returns students with learning_goals
      const res = await fetch('/api/students?limit=50');
      const data = await res.json();
      if (res.ok && Array.isArray(data.students)) {
        setDemands(data.students);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleBid = (studentId) => {
    // Basic interaction: prompt to spend points, then open chat
    setBiddingId(studentId);
    setTimeout(() => {
      const confirmBid = window.confirm("💡 接單將消耗 50 點數！\n確定要發送開課邀請聯絡這位學生嗎？");
      if (confirmBid) {
        // In a real app we'd call an API to deduct points and create a chat room
        // Here we just mock the success and go to chat
        alert("✅ 扣點成功！已為您開通專屬聊天室。");
        router.push(`/chat?user=${studentId}`);
      }
      setBiddingId(null);
    }, 100);
  };

  if (loading || authLoading) {
    return (
      <div className="mobile-container" style={{ background: '#050816', justifyContent: 'center', alignItems: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>載入懸賞單中...</p>
      </div>
    );
  }

  return (
    <div className="mobile-container" style={{ background: '#050816', minHeight: '100vh', overflowX: 'hidden', paddingBottom: 100 }}>
      
      <header style={{ padding: '32px 20px 24px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(20px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: '#FFF', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Target color="var(--accent)" />
              當週學生懸賞單
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
              主動出擊！找到符合您專長的潛在學生
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>可用點數</div>
            <div style={{ fontSize: 18, color: '#FFDF73', fontWeight: 900 }}>1,250 點</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Search size={18} color="rgba(255,255,255,0.4)" />
            <input type="text" placeholder="搜尋需求關鍵字..." style={{ background: 'transparent', border: 'none', color: '#FFF', outline: 'none', width: '100%', fontSize: 14 }} />
          </div>
          <button style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 16, padding: '0 16px', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Filter size={18} />
          </button>
        </div>
      </header>

      <main style={{ padding: '20px' }}>
        {demands.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <Target size={48} color="rgba(255,255,255,0.1)" style={{ marginBottom: 16 }} />
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, fontWeight: 600 }}>目前還沒有新的學生懸賞單</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {demands.map(student => {
              // Parse the learning_goals string into something visual if possible
              const goalText = student.learning_goals || '沒有填寫詳細需求';
              return (
                <div key={student.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ width: 48, height: 48, borderRadius: 24, background: 'rgba(255,255,255,0.1)', overflow: 'hidden', position: 'relative' }}>
                        {student.avatar_url ? (
                          <Image src={student.avatar_url} alt={student.name} fill style={{ objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 20, fontWeight: 800 }}>
                            {student.name?.[0] || '?'}
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: '#FFF' }}>{student.name}</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                          <Clock size={12} /> {new Date(student.created_at).toLocaleDateString()} 發布
                        </div>
                      </div>
                    </div>
                    <div style={{ background: 'rgba(255, 138, 61, 0.15)', color: 'var(--accent)', padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 800 }}>
                      🔥 新需求
                    </div>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 16, marginBottom: 20, border: '1px solid rgba(255,255,255,0.03)' }}>
                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 1.6, fontWeight: 500 }}>
                      {goalText}
                    </p>
                  </div>

                  <button 
                    onClick={() => handleBid(student.id)}
                    disabled={biddingId === student.id}
                    style={{ 
                      width: '100%', padding: '14px', borderRadius: 14, border: 'none', 
                      background: 'linear-gradient(135deg, #FF8A3D 0%, #FF5E3A 100%)', 
                      color: '#FFF', fontWeight: 900, fontSize: 15, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      boxShadow: '0 4px 14px rgba(255, 94, 58, 0.3)'
                    }}
                  >
                    <MessageCircle size={18} />
                    {biddingId === student.id ? '處理中...' : '消耗 50 點聯絡學生'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Navigation />
    </div>
  );
}
