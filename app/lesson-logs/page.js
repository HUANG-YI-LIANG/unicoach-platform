'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { BookOpen, Calendar, Loader2, Star } from 'lucide-react';

const DARK = 'var(--color-text)';
const MUTED = 'var(--color-text-muted)';
const BLUE = 'var(--color-primary)';

function formatDateTime(value) {
  if (!value) return '時間待定';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '時間待定';
  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function RatingStars({ value }) {
  const rating = Math.max(0, Math.min(5, Number(value) || 0));
  return (
    <span aria-label={`表現評分 ${rating} / 5`} style={{ display: 'inline-flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={16}
          fill={star <= rating ? '#F59E0B' : 'none'}
          color={star <= rating ? '#F59E0B' : 'var(--color-border)'}
        />
      ))}
    </span>
  );
}

export default function LessonLogsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const bookingId = searchParams.get('booking') || searchParams.get('bookingId') || '';
  const [lessonLogs, setLessonLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const apiPath = useMemo(() => {
    if (!bookingId) return '/api/lesson-logs?limit=10';
    return `/api/lesson-logs?booking=${encodeURIComponent(bookingId)}`;
  }, [bookingId]);

  useEffect(() => {
    if (!authLoading && !user) {
      const redirectPath = bookingId ? `/lesson-logs?booking=${encodeURIComponent(bookingId)}` : '/lesson-logs';
      router.replace(`/login?redirect=${encodeURIComponent(redirectPath)}`);
    }
  }, [authLoading, user, bookingId, router]);

  useEffect(() => {
    if (authLoading || !user) return;

    let cancelled = false;
    setLoading(true);
    setError('');

    fetch(apiPath, { cache: 'no-store' })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || '無法取得課後日誌');
        return data;
      })
      .then((data) => {
        if (!cancelled) setLessonLogs(data.lessonLogs || []);
      })
      .catch((err) => {
        if (!cancelled) {
          setLessonLogs([]);
          setError(err.message || '無法取得課後日誌');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [apiPath, authLoading, user]);

  if (authLoading || loading) {
    return (
      <main style={{ minHeight: '100vh', padding: '32px 16px 96px', display: 'grid', placeItems: 'center', color: MUTED }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontWeight: 800 }}>
          <Loader2 className="animate-spin" size={20} /> 載入課後日誌中...
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', padding: '24px 16px 96px', background: 'transparent' }}>
      <section style={{ maxWidth: 720, margin: '0 auto', display: 'grid', gap: 16 }}>
        <button
          type="button"
          onClick={() => router.back()}
          style={{ justifySelf: 'start', border: 'none', background: 'transparent', color: BLUE, fontWeight: 900, cursor: 'pointer', padding: 0 }}
        >
          ‹ 返回
        </button>

        <header style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 20, boxShadow: 'var(--shadow-card)' }}>
          <p style={{ margin: '0 0 6px', color: MUTED, fontSize: 12, fontWeight: 800 }}>LESSON LOG</p>
          <h1 style={{ margin: 0, color: DARK, fontSize: 24, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen size={22} color={BLUE} /> 課後日誌
          </h1>
          <p style={{ margin: '8px 0 0', color: MUTED, fontSize: 13, lineHeight: 1.6 }}>
            {bookingId ? '這是通知連結對應的預約課後日誌。' : '最近的課後日誌會顯示在這裡。'}
          </p>
        </header>

        {error && (
          <div style={{ background: 'var(--warning-bg)', color: 'var(--warning)', borderRadius: 14, padding: 14, fontSize: 13, fontWeight: 800 }}>
            {error}
          </div>
        )}

        {!error && lessonLogs.length === 0 && (
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 22, color: MUTED, fontSize: 14, lineHeight: 1.7 }}>
            目前尚未找到這筆預約的課後日誌。若教練剛送出，請稍後重新整理。
          </div>
        )}

        {lessonLogs.map((log) => (
          <article key={log.id} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 18, boxShadow: 'var(--shadow-card)', display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <h2 style={{ margin: '0 0 6px', color: DARK, fontSize: 18, fontWeight: 900 }}>
                  {log.booking?.serviceTitle || '課程紀錄'}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: MUTED, fontSize: 12, fontWeight: 700 }}>
                  <Calendar size={13} color={BLUE} /> {formatDateTime(log.booking?.expectedTime)}
                </div>
              </div>
              <RatingStars value={log.performanceRating} />
            </div>

            {Array.isArray(log.focusAreas) && log.focusAreas.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {log.focusAreas.map((area) => (
                  <span key={area} style={{ fontSize: 11, fontWeight: 800, color: BLUE, background: 'rgba(96, 165, 250, 0.10)', borderRadius: 999, padding: '5px 9px' }}>
                    {area}
                  </span>
                ))}
              </div>
            )}

            <div style={{ display: 'grid', gap: 10 }}>
              <section>
                <h3 style={{ margin: '0 0 6px', color: DARK, fontSize: 13, fontWeight: 900 }}>課後回饋</h3>
                <p style={{ margin: 0, color: MUTED, fontSize: 13, lineHeight: 1.7 }}>{log.shortFeedback || '尚無回饋內容'}</p>
              </section>
              {log.nextStep && (
                <section>
                  <h3 style={{ margin: '0 0 6px', color: DARK, fontSize: 13, fontWeight: 900 }}>下次建議</h3>
                  <p style={{ margin: 0, color: MUTED, fontSize: 13, lineHeight: 1.7 }}>{log.nextStep}</p>
                </section>
              )}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
