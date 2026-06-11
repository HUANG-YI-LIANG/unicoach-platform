'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Loader2, UserPlus, Clock } from 'lucide-react';

const DARK = '#050816';
const CARD = '#0B1220';
const BORDER = 'rgba(255,255,255,0.05)';
const ORANGE = '#FF8A3D';
const TEXT_LIGHT = '#FFFFFF';
const MUTED = '#94A3B8';

export default function ReferralsPage() {
  const router = useRouter();
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRewards = async () => {
      try {
        const res = await fetch('/api/user/referrals');
        if (res.ok) {
          const data = await res.json();
          setRewards(data.rewards || []);
        }
      } catch (err) {
        console.error('Failed to fetch referral rewards', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRewards();
  }, []);

  return (
    <main style={{ minHeight: '100vh', padding: '24px 16px 96px', background: DARK, color: TEXT_LIGHT, fontFamily: 'sans-serif' }}>
      <section style={{ maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <button
          onClick={() => router.back()}
          style={{
            background: 'transparent', border: 0, padding: 0, color: MUTED,
            display: 'flex', alignItems: 'center', gap: 4, fontSize: 15, cursor: 'pointer',
            fontWeight: 600, width: 'fit-content'
          }}
        >
          <ChevronLeft size={20} /> 返回錢包
        </button>

        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <UserPlus size={28} color={ORANGE} /> 推廣人上課明細
          </h1>
          <p style={{ margin: 0, color: MUTED, fontSize: 14 }}>
            追蹤 90 天內您推薦的好友完課狀況，單邊推廣享 3% 回饋，若雙方皆有推廣人則各享 2.5% 回饋。
          </p>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <Loader2 className="animate-spin" color={ORANGE} />
          </div>
        ) : rewards.length === 0 ? (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 24, padding: 40, textAlign: 'center' }}>
            <UserPlus size={48} color={MUTED} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
            <p style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: TEXT_LIGHT }}>目前尚無推廣紀錄</p>
            <p style={{ margin: 0, fontSize: 14, color: MUTED }}>當您推薦的好友完成課程後，收益明細將會顯示在此處。</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {rewards.map(reward => {
              const isPending = reward.status === 'pending';
              const ratePercent = reward.reward_rate * 100;
              
              return (
                <div key={reward.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <p style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: TEXT_LIGHT }}>
                        {reward.referee?.name || '未知使用者'} 的課程
                      </p>
                      <p style={{ margin: 0, fontSize: 13, color: MUTED }}>
                        {new Date(reward.created_at).toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 900, color: isPending ? ORANGE : '#10B981' }}>
                        +{reward.reward_points} 點
                      </p>
                      <span style={{ 
                        display: 'inline-block', padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                        background: isPending ? 'rgba(255,138,61,0.1)' : 'rgba(16,185,129,0.1)',
                        color: isPending ? ORANGE : '#10B981'
                      }}>
                        {isPending ? '24H 後入帳' : '已入帳'}
                      </span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: MUTED, background: 'rgba(255,255,255,0.02)', padding: '10px 12px', borderRadius: 8 }}>
                    <Clock size={14} />
                    <span>計算比例：{ratePercent}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
