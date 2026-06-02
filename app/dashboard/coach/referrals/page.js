'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { ArrowLeft, Users, Wallet, ChevronRight, User, TrendingUp, Loader2 } from 'lucide-react';

const BG = '#050816';
const CARD = '#0F172A';
const BORDER = 'rgba(255,255,255,0.06)';
const TEXT_LIGHT = '#FFFFFF';
const MUTED = '#94A3B8';
const ORANGE = '#FF8A3D';

export default function ReferralsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    fetch('/api/coach/referrals')
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [user, router]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: BG, color: MUTED }}>
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div style={{ background: BG, minHeight: '100vh', paddingBottom: 100, color: TEXT_LIGHT }}>
      <header style={{ padding: '24px 20px', display: 'flex', alignItems: 'center', gap: 16, borderBottom: `1px solid ${BORDER}`, position: 'sticky', top: 0, background: 'rgba(5, 8, 22, 0.8)', backdropFilter: 'blur(12px)', zIndex: 10 }}>
        <button onClick={() => router.push('/dashboard/coach')} style={{ background: 'none', border: 'none', color: TEXT_LIGHT, cursor: 'pointer', padding: 0 }}>
          <ArrowLeft size={24} />
        </button>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>推廣成效與獎勵</h1>
      </header>

      <div style={{ padding: '24px 20px' }}>
        {/* Summary Card */}
        <div style={{ background: 'linear-gradient(135deg, rgba(255, 138, 61, 0.15) 0%, rgba(255, 138, 61, 0.02) 100%)', borderRadius: 24, padding: 24, border: `1px solid rgba(255, 138, 61, 0.2)`, marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ background: 'rgba(255, 138, 61, 0.2)', padding: 10, borderRadius: 12 }}>
              <Wallet size={24} color={ORANGE} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: ORANGE }}>累積推廣獎勵</div>
          </div>
          <div style={{ fontSize: 40, fontWeight: 900, color: TEXT_LIGHT, letterSpacing: '-0.02em' }}>
            NT$ {data?.total_earnings?.toLocaleString() || 0}
          </div>
          <p style={{ margin: '12px 0 0', fontSize: 13, color: MUTED, lineHeight: 1.5 }}>
            只要被推薦的教練或學員產生訂單，您即可從平台服務費中抽取 <strong style={{ color: TEXT_LIGHT }}>{data?.commission_rate || 3}%</strong> 的分潤。
          </p>
        </div>

        {/* Referrals List */}
        <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={20} color={MUTED} />
          已推薦用戶 ({data?.referrals?.length || 0})
        </h2>

        {data?.referrals?.length === 0 ? (
          <div style={{ background: CARD, borderRadius: 16, padding: 32, textAlign: 'center', border: `1px solid ${BORDER}` }}>
            <p style={{ margin: 0, color: MUTED, fontSize: 14 }}>尚未有任何人使用您的推廣碼註冊</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {data?.referrals?.map(ref => (
              <div key={ref.id} style={{ background: CARD, borderRadius: 16, padding: 16, border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED }}>
                    <User size={24} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>{ref.name}</p>
                      <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: ref.role === 'coach' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: ref.role === 'coach' ? '#3B82F6' : '#10B981', fontWeight: 800 }}>
                        {ref.role === 'coach' ? '教練' : '學員'}
                      </span>
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: MUTED }}>
                      貢獻訂單：{ref.booking_count} 筆
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: 11, color: MUTED, fontWeight: 700 }}>為您帶來</p>
                  <p style={{ margin: '2px 0 0', fontSize: 15, fontWeight: 900, color: ref.total_contribution > 0 ? ORANGE : TEXT_LIGHT }}>
                    NT$ {ref.total_contribution.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
