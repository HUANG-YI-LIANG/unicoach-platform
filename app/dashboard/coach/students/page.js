'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Star, Target, MessageCircle, MapPin } from 'lucide-react';

export default function StudentDiscoveryPage() {
  const router = useRouter();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const observer = useRef();
  const lastElementRef = useRef(null);

  useEffect(() => {
    if (page === 1) setLoading(true);
    else setLoadingMore(true);

    fetch(`/api/students?page=${page}&limit=20`)
      .then(res => res.json())
      .then(data => {
        if (data.students) {
          setStudents(prev => page === 1 ? data.students : [...prev, ...data.students]);
          setHasMore(data.hasMore ?? false);
        }
      })
      .catch(console.error)
      .finally(() => {
        setLoading(false);
        setLoadingMore(false);
      });
  }, [page]);

  useEffect(() => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(p => p + 1);
      }
    });

    if (lastElementRef.current) {
      observer.current.observe(lastElementRef.current);
    }
  }, [loading, loadingMore, hasMore]);

  return (
    <div className="mobile-container" style={{ background: 'var(--bg-page)', minHeight: '100dvh' }}>
      <header className="page-header" style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-card)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <button onClick={() => router.back()} className="icon-btn" style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', padding: 0 }}>
          <ChevronLeft size={24} />
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>找學生 (主動開發)</h1>
      </header>

      <main style={{ padding: '20px' }}>
        <div style={{ marginBottom: 20 }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.5, margin: 0 }}>
            這裡列出的是近期活躍，且有填寫學習目標的學生。您可以查看他們的歷史評價，並主動傳送訊息介紹自己！
          </p>
        </div>

        {loading && page === 1 ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <div className="spinner" />
          </div>
        ) : students.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            目前沒有符合條件的學生。
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {students.map((student, idx) => (
              <div 
                key={student.id} 
                ref={idx === students.length - 1 ? lastElementRef : null}
                className="student-card" 
                style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 16, border: '1px solid rgba(255,255,255,0.05)' }}
                onClick={() => router.push(`/dashboard/coach/students/${student.id}`)}
              >
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', overflow: 'hidden', flexShrink: 0 }}>
                    {student.avatar_url ? (
                      <img src={student.avatar_url} alt={student.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: 'var(--text-muted)' }}>
                        {student.name?.[0] || '學'}
                      </div>
                    )}
                  </div>
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {student.name}
                      </h2>
                      {student.avg_score && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255, 171, 0, 0.1)', padding: '2px 8px', borderRadius: 12, color: '#FFAB00', fontSize: 12, fontWeight: 700 }}>
                          <Star size={12} fill="currentColor" />
                          <span>{student.avg_score}</span>
                        </div>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <span style={{ fontSize: 13, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 4 }}>
                        {student.grade || '未填寫年級'}
                      </span>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 8, borderLeft: '3px solid var(--primary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, color: 'var(--text-muted)' }}>
                        <Target size={14} />
                        <span style={{ fontSize: 12, fontWeight: 700 }}>學習目標</span>
                      </div>
                      <p style={{ fontSize: 14, color: 'var(--text-light)', margin: 0, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {student.learning_goals}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/chat/${student.id}`);
                    }}
                    style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: 'var(--primary)', color: 'var(--text-light)', fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  >
                    <MessageCircle size={18} />
                    發送訊息
                  </button>
                  <button 
                    onClick={() => router.push(`/dashboard/coach/students/${student.id}`)}
                    style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'var(--text-light)', fontSize: 15, fontWeight: 800 }}
                  >
                    查看歷史評價
                  </button>
                </div>
              </div>
            ))}
            {loadingMore && <div style={{ textAlign: 'center', padding: 20 }}><div className="spinner" style={{ width: 24, height: 24, margin: '0 auto' }}/></div>}
          </div>
        )}
      </main>
    </div>
  );
}
