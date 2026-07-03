'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Star, Target, MessageCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

export default function StudentDiscoveryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [confirmModal, setConfirmModal] = useState(null); // { studentId, name, leadPrice }
  const [processing, setProcessing] = useState(false);

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

  const handleStartChat = async (student) => {
    const coachLevel = user?.level || 1;
    if (coachLevel === 1) {
      // Free for Level 1, directly buy
      await executeBuyLead(student.id);
    } else {
      // Paid for Level 2+, show modal
      setConfirmModal({
        studentId: student.id,
        name: student.name,
        leadPrice: student.lead_price || 30
      });
    }
  };

  const executeBuyLead = async (studentId) => {
    try {
      setProcessing(true);
      const res = await fetch('/api/chat/buy-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId })
      });
      const data = await res.json();
      
      if (!res.ok) {
        if (res.status === 402) {
          if (confirm('您的錢包餘額不足，是否前往儲值？')) {
            router.push('/dashboard/coach/earnings');
          }
        } else {
          alert(data.error || '開發學生失敗');
        }
        return;
      }
      
      // Success, navigate to chat
      router.push(`/chat/${studentId}`);
    } catch (err) {
      console.error(err);
      alert('網路錯誤，請稍後再試');
    } finally {
      setProcessing(false);
      setConfirmModal(null);
    }
  };

  return (
    <div className="mobile-container" style={{ background: 'var(--bg-page)', minHeight: '100dvh', position: 'relative' }}>
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
                      <span style={{ fontSize: 13, color: 'var(--primary)', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                        Lv {student.level || 1}
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
                      handleStartChat(student);
                    }}
                    style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: 'var(--primary)', color: 'var(--text-light)', fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    disabled={processing}
                  >
                    <MessageCircle size={18} />
                    {user?.level === 1 ? '✨ 新手免費 發送訊息' : `💰 支付 ${student.lead_price || 30} 點 發送訊息`}
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/dashboard/coach/students/${student.id}`);
                    }}
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

      {/* Confirmation Modal */}
      {confirmModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.8)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20, backdropFilter: 'blur(5px)'
        }}>
          <div style={{
            background: 'var(--bg-card)', padding: 24, borderRadius: 20, width: '100%', maxWidth: 400,
            border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255, 171, 0, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={32} color="#FFAB00" />
              </div>
            </div>
            
            <h2 style={{ fontSize: 20, fontWeight: 800, textAlign: 'center', color: 'var(--text-primary)', margin: '0 0 12px' }}>
              開啟開發對話
            </h2>
            
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.5, margin: '0 0 24px' }}>
              這將會扣除您錢包中的 <strong style={{ color: 'var(--primary)' }}>{confirmModal.leadPrice} 點</strong> 來開啟與 <strong style={{ color: 'var(--text-light)' }}>{confirmModal.name}</strong> 的專屬聊天室。
            </p>

            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                onClick={() => setConfirmModal(null)}
                style={{ flex: 1, padding: '14px', borderRadius: 12, border: 'none', background: 'rgba(255,255,255,0.1)', color: 'var(--text-light)', fontSize: 16, fontWeight: 800 }}
                disabled={processing}
              >
                取消
              </button>
              <button 
                onClick={() => executeBuyLead(confirmModal.studentId)}
                style={{ flex: 1, padding: '14px', borderRadius: 12, border: 'none', background: 'var(--primary)', color: 'var(--text-light)', fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                disabled={processing}
              >
                {processing ? <div className="spinner" style={{ width: 20, height: 20 }} /> : '確定扣款'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
