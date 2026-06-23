'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Star, Target, MessageCircle, Clock, BookOpen } from 'lucide-react';
import Link from 'next/link';

export default function StudentProfilePage({ params }) {
  const router = useRouter();
  const { id } = params;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/student/${id}/portfolio`)
      .then(res => res.json())
      .then(resData => {
        if (!resData.error) {
          setData(resData);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="mobile-container" style={{ background: 'var(--bg-page)', minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!data || !data.student) {
    return (
      <div className="mobile-container" style={{ background: 'var(--bg-page)', minHeight: '100dvh' }}>
        <header className="page-header" style={{ padding: '16px 20px' }}>
          <button onClick={() => router.back()} className="icon-btn" style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)' }}>
            <ChevronLeft size={24} />
          </button>
        </header>
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
          找不到該學生資料。
        </div>
      </div>
    );
  }

  const { student, reviews } = data;

  return (
    <div className="mobile-container" style={{ background: 'var(--bg-page)', minHeight: '100dvh' }}>
      <header className="page-header" style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-card)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <button onClick={() => router.back()} className="icon-btn" style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', padding: 0 }}>
          <ChevronLeft size={24} />
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>學生履歷</h1>
      </header>

      <main style={{ padding: '24px 20px', paddingBottom: '120px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32 }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', overflow: 'hidden', flexShrink: 0 }}>
            {student.avatar_url ? (
              <img src={student.avatar_url} alt={student.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, color: 'var(--text-muted)' }}>
                {student.name?.[0] || '學'}
              </div>
            )}
          </div>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 8px' }}>
              {student.name}
            </h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: 6, fontWeight: 700 }}>
                {student.grade || '未填寫年級'}
              </span>
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 16, marginBottom: 32, border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: 'var(--primary)' }}>
            <Target size={18} />
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>學習目標</h3>
          </div>
          <p style={{ fontSize: 15, color: 'var(--text-light)', margin: 0, lineHeight: 1.6 }}>
            {student.learning_goals || '該學生尚未填寫具體的學習目標。'}
          </p>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, color: 'var(--text-primary)' }}>
            <BookOpen size={18} />
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>過去上課評價</h3>
          </div>
          
          {reviews.length === 0 ? (
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: 24, borderRadius: 12, textAlign: 'center', color: 'var(--text-muted)' }}>
              此學生目前還沒有收到其他教練的評價。
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {reviews.map(review => (
                <div key={review.id} style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
                        由 {review.coach_name} 評分
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} />
                        {new Date(review.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    {review.avg_score > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255, 171, 0, 0.1)', padding: '4px 8px', borderRadius: 12, color: '#FFAB00', fontSize: 13, fontWeight: 700 }}>
                        <Star size={14} fill="currentColor" />
                        <span>{review.avg_score.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                  
                  {review.comment ? (
                    <p style={{ fontSize: 14, color: 'var(--text-light)', margin: 0, lineHeight: 1.5, background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 8 }}>
                      "{review.comment}"
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Fixed Bottom Action Bar */}
        <div style={{
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: 'min(430px, 100vw)', padding: '16px 20px', background: 'var(--bg-card)',
          borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 12, zIndex: 10
        }}>
          <button 
            onClick={() => router.push(`/chat/${student.id}`)}
            style={{ flex: 1, padding: '16px', borderRadius: 100, border: 'none', background: 'var(--primary)', color: 'var(--text-light)', fontSize: 16, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)' }}
          >
            <MessageCircle size={20} />
            發送私訊給 {student.name}
          </button>
        </div>
      </main>
    </div>
  );
}
