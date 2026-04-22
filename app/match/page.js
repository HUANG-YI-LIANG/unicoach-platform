'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, MapPin, Search, ArrowRight, Loader2, User } from 'lucide-react';

const BLUE  = '#2563EB';
const DARK  = '#0F172A';
const MUTED = '#94A3B8';
const BG    = '#F8FAFC';
const WHITE = '#FFFFFF';

export default function AIMatchPage() {
  const router = useRouter();
  const [requirement, setRequirement] = useState('');
  const [isMatching, setIsMatching] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const handleMatch = async () => {
    if (!requirement.trim()) {
      setError('請輸入您的學習需求！');
      return;
    }
    setError('');
    setIsMatching(true);
    setResults(null);

    try {
      const res = await fetch('/api/ai/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userRequirement: requirement }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || '配對發生錯誤');
      }

      setResults(data.recommendations || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsMatching(false);
    }
  };

  return (
    <div style={{ background: BG, minHeight: '100vh', paddingBottom: 100 }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, #4F46E5, #7C3AED)`,
        padding: '32px 20px',
        color: WHITE,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        boxShadow: '0 10px 30px rgba(124, 58, 237, 0.2)'
      }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 36, height: 36, color: WHITE, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginBottom: 16 }}
        >
          ‹
        </button>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles /> AI 專屬教練配對
        </h1>
        <p style={{ margin: '12px 0 0', fontSize: 14, opacity: 0.9, lineHeight: 1.6 }}>
          不知道該選哪位教練？告訴我你想學什麼、你的程度，以及偏好的教練風格，我將為你找出最完美的教練！
        </p>
      </div>

      <div style={{ padding: '24px 20px', marginTop: -20 }}>
        {/* Input Form */}
        <div style={{ background: WHITE, borderRadius: 24, padding: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', position: 'relative', zIndex: 10 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: DARK, marginBottom: 12 }}>
            請描述您的需求
          </label>
          <textarea
            value={requirement}
            onChange={(e) => setRequirement(e.target.value)}
            placeholder="例如：我是網球初學者，想找在新竹、有耐心、會教基本擊球的教練..."
            rows={4}
            style={{
              width: '100%', padding: '16px', border: '1.5px solid #E2E8F0', borderRadius: 16,
              fontSize: 15, lineHeight: 1.6, resize: 'none', outline: 'none', color: DARK, boxSizing: 'border-box'
            }}
            onFocus={e => e.target.style.borderColor = '#7C3AED'}
            onBlur={e => e.target.style.borderColor = '#E2E8F0'}
          />

          {error && (
            <div style={{ marginTop: 12, color: '#EF4444', fontSize: 13, fontWeight: 700 }}>
              ⚠️ {error}
            </div>
          )}

          <button
            onClick={handleMatch}
            disabled={isMatching || !requirement.trim()}
            style={{
              width: '100%', marginTop: 16, padding: 16, borderRadius: 16, border: 'none',
              background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
              color: WHITE, fontWeight: 900, fontSize: 16, cursor: (isMatching || !requirement.trim()) ? 'not-allowed' : 'pointer',
              opacity: (isMatching || !requirement.trim()) ? 0.6 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 8px 24px rgba(124, 58, 237, 0.3)'
            }}
          >
            {isMatching ? (
              <>
                <Loader2 className="animate-spin" /> AI 分析中...
              </>
            ) : (
              <>
                <Search size={18} /> 開始智慧配對
              </>
            )}
          </button>
        </div>

        {/* Results */}
        {results && (
          <div style={{ marginTop: 32 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: DARK, marginBottom: 16 }}>
              ✨ 為您推薦的教練
            </h2>
            
            {results.length === 0 ? (
              <p style={{ color: MUTED, fontSize: 14 }}>很抱歉，目前沒有找到符合您條件的教練，請嘗試調整需求描述。</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {results.map((item, idx) => {
                  const { coach, reasoning } = item;
                  return (
                    <div key={idx} style={{ background: WHITE, borderRadius: 20, padding: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', borderBottom: '1px solid #F1F5F9', paddingBottom: 16, marginBottom: 16 }}>
                        <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: '#E2E8F0', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {coach.avatar_url ? (
                            <img src={coach.avatar_url} alt={coach.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <User size={32} color="#94A3B8" />
                          )}
                        </div>
                        <div style={{ flex: 1 }}>
                          <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 900, color: DARK }}>{coach.name}</h3>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 12, color: MUTED }}>
                            {coach.location && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12}/> {coach.location}</span>}
                            <span>NT$ {coach.base_price}/堂起</span>
                          </div>
                          <p style={{ margin: '8px 0 0', fontSize: 13, color: '#334155', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {coach.philosophy || coach.experience}
                          </p>
                        </div>
                      </div>
                      
                      <div style={{ background: '#F5F3FF', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                        <p style={{ margin: 0, fontSize: 14, color: '#5B21B6', lineHeight: 1.6, fontWeight: 500 }}>
                          <span style={{ fontWeight: 800 }}>AI 推薦理由：</span>{reasoning}
                        </p>
                      </div>

                      <button
                        onClick={() => router.push(`/coaches/${coach.user_id}`)}
                        style={{
                          width: '100%', padding: '12px', borderRadius: 12, border: 'none',
                          background: '#EFF6FF', color: BLUE, fontWeight: 800, fontSize: 14, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                        }}
                      >
                        查看教練詳情與預約 <ArrowRight size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
