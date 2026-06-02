'use client';
import { useState, use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Target, Star, MessageSquare, ArrowRight } from 'lucide-react';

const ORANGE = '#FF8A3D'; // or 'var(--color-accent)'
const DARK  = '#FFFFFF';
const MUTED = '#94A3B8';
const BG    = '#050816';
const CARD  = '#0F172A';
const BORDER = 'rgba(255,255,255,0.06)';

const FOCUS_TAGS = ['控球', '投籃', '腳步', '觀念', '體能', '解題', '口說', '實戰', '發音', '文法'];
const QUICK_TEMPLATES = [
  '今天比上次更敢出手了',
  '腳步節奏有進步',
  '觀念開始建立起來',
  '基本功越來越紮實',
  '繼續保持這個狀態',
  '下次上課挑戰進階動作'
];

export default function ReportPage({ params }) {
  const { bookingId } = use(params);
  const router = useRouter();

  const [form, setForm] = useState({
    focusAreas: [],
    performanceRating: 5,
    shortFeedback: '',
    nextStep: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [draftLoaded, setDraftLoaded] = useState(false);
  const storageKey = `lesson_log_draft_${bookingId}`;

  useEffect(() => {
    try {
      const draft = localStorage.getItem(storageKey);
      if (draft) {
        const parsed = JSON.parse(draft);
        setForm({
          focusAreas: Array.isArray(parsed.focusAreas) ? parsed.focusAreas.slice(0, 5) : [],
          performanceRating: Number(parsed.performanceRating) || 5,
          shortFeedback: typeof parsed.shortFeedback === 'string' ? parsed.shortFeedback.slice(0, 120) : '',
          nextStep: typeof parsed.nextStep === 'string' ? parsed.nextStep.slice(0, 120) : '',
        });
      }
    } catch (_) {
      localStorage.removeItem(storageKey);
    } finally {
      setDraftLoaded(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (draftLoaded) {
      localStorage.setItem(storageKey, JSON.stringify(form));
    }
  }, [form, storageKey, draftLoaded]);

  const canSubmit = form.performanceRating >= 1 && form.performanceRating <= 5 &&
                    form.shortFeedback.trim().length > 0 && form.shortFeedback.trim().length <= 120 &&
                    form.nextStep.trim().length <= 120;

  const handleTagToggle = (tag) => {
    setForm(prev => ({
      ...prev,
      focusAreas: prev.focusAreas.includes(tag)
        ? prev.focusAreas.filter(t => t !== tag)
        : [...prev.focusAreas, tag].slice(0, 5) // limit to 5
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) { setError('請確實填寫必填欄位 (回饋字數須在 120 字內)'); return; }
    setSubmitting(true);
    setError('');

    try {
      const reportRes = await fetch('/api/lesson-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: bookingId,
          performance_rating: form.performanceRating,
          focus_areas: form.focusAreas,
          short_feedback: form.shortFeedback.trim(),
          next_step: form.nextStep.trim() || undefined
        }),
      });
      const reportData = await reportRes.json();
      if (!reportRes.ok && reportRes.status !== 409) { // ignore conflict if already created
        throw new Error(reportData.error || '日誌提交失敗');
      }

      localStorage.removeItem(storageKey);
      router.push('/bookings');
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div style={{ background: BG, minHeight: '100vh', paddingBottom: 100, color: DARK, fontFamily: 'sans-serif' }}>
      {/* Header */}
      <div style={{
        padding: '24px 20px',
        borderBottom: `1px solid ${BORDER}`,
        background: CARD,
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', color: ORANGE, fontSize: 14, fontWeight: 800, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4, width: 'fit-content' }}
        >
          ‹ 返回
        </button>
        <h1 style={{ margin: '8px 0 0', fontSize: 24, fontWeight: 900, color: DARK }}>課後回饋卡</h1>
        <p style={{ margin: 0, fontSize: 13, color: MUTED }}>
          家長與學員非常期待看到教練的評語！
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        
        {/* 本堂重點 */}
        <div style={{ background: CARD, borderRadius: 24, padding: 24, border: `1px solid ${BORDER}`, boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
          <p style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 800, color: DARK, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Target size={18} color={ORANGE} /> 本堂重點 (可複選)
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {FOCUS_TAGS.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => handleTagToggle(tag)}
                style={{
                  padding: '8px 16px', borderRadius: 100,
                  background: form.focusAreas.includes(tag) ? 'rgba(255, 138, 61, 0.15)' : 'rgba(255,255,255,0.03)',
                  color: form.focusAreas.includes(tag) ? ORANGE : MUTED,
                  fontWeight: 800, fontSize: 13, cursor: 'pointer',
                  border: form.focusAreas.includes(tag) ? `1px solid ${ORANGE}` : `1px solid ${BORDER}`,
                  transition: 'all 0.2s',
                }}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* 學生表現評分 */}
        <div style={{ background: CARD, borderRadius: 24, padding: 24, border: `1px solid ${BORDER}`, boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
          <p style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 800, color: DARK, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Star size={18} color={ORANGE} /> 學生表現 (1~5分)
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 8 }}>
            {[1, 2, 3, 4, 5].map(v => (
              <button
                key={v}
                type="button"
                onClick={() => setForm(f => ({ ...f, performanceRating: v }))}
                style={{
                  width: '100%', maxWidth: 48, height: 48, borderRadius: '50%', justifySelf: 'center',
                  background: form.performanceRating === v ? ORANGE : 'rgba(255,255,255,0.03)',
                  color: form.performanceRating === v ? '#000' : MUTED,
                  border: form.performanceRating === v ? 'none' : `1px solid ${BORDER}`,
                  fontWeight: 900, fontSize: 18, cursor: 'pointer',
                  transition: 'all 0.15s',
                  transform: form.performanceRating === v ? 'scale(1.1)' : 'scale(1)',
                  boxShadow: form.performanceRating === v ? '0 4px 15px rgba(255, 138, 61, 0.4)' : 'none',
                }}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* 一句話回饋 */}
        <div style={{ background: CARD, borderRadius: 24, padding: 24, border: `1px solid ${BORDER}`, boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: DARK, display: 'flex', alignItems: 'center', gap: 8 }}>
              <MessageSquare size={18} color={ORANGE} /> 教練短評 <span style={{ color: '#EF4444' }}>*</span>
            </p>
            <span style={{ fontSize: 12, color: form.shortFeedback.length > 120 ? '#EF4444' : MUTED, fontWeight: 700 }}>
              {form.shortFeedback.length} / 120
            </span>
          </div>
          <textarea
            value={form.shortFeedback}
            onChange={e => setForm(f => ({ ...f, shortFeedback: e.target.value.slice(0, 120) }))}
            placeholder="今天表現得如何？"
            rows={3}
            style={{
              width: '100%', padding: '16px', border: `1px solid ${BORDER}`,
              borderRadius: 16, fontSize: 15, lineHeight: 1.6, resize: 'none',
              outline: 'none', background: 'rgba(255,255,255,0.02)', color: DARK, boxSizing: 'border-box',
              transition: 'border 0.2s',
            }}
            onFocus={e => e.target.style.borderColor = ORANGE}
            onBlur={e => e.target.style.borderColor = BORDER}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
            {QUICK_TEMPLATES.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setForm(f => {
                  const next = `${f.shortFeedback ? `${f.shortFeedback}，` : ''}${t}`.slice(0, 120);
                  return { ...f, shortFeedback: next };
                })}
                style={{
                  padding: '8px 14px', borderRadius: 100, border: `1px solid ${BORDER}`,
                  background: 'rgba(255,255,255,0.03)', color: MUTED,
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                onMouseOver={e => { e.currentTarget.style.borderColor = ORANGE; e.currentTarget.style.color = ORANGE; }}
                onMouseOut={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = MUTED; }}
              >
                + {t}
              </button>
            ))}
          </div>
        </div>

        {/* 下次建議 */}
        <div style={{ background: CARD, borderRadius: 24, padding: 24, border: `1px solid ${BORDER}`, boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: DARK, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ArrowRight size={18} color={ORANGE} /> 課後建議 (選填)
            </p>
            <span style={{ fontSize: 12, color: form.nextStep.length > 120 ? '#EF4444' : MUTED, fontWeight: 700 }}>
              {form.nextStep.length} / 120
            </span>
          </div>
          <textarea
            value={form.nextStep}
            onChange={e => setForm(f => ({ ...f, nextStep: e.target.value.slice(0, 120) }))}
            placeholder="下次可以進階練習的目標..."
            rows={2}
            style={{
              width: '100%', padding: '16px', border: `1px solid ${BORDER}`,
              borderRadius: 16, fontSize: 15, lineHeight: 1.6, resize: 'none',
              outline: 'none', background: 'rgba(255,255,255,0.02)', color: DARK, boxSizing: 'border-box',
              transition: 'border 0.2s',
            }}
            onFocus={e => e.target.style.borderColor = ORANGE}
            onBlur={e => e.target.style.borderColor = BORDER}
          />
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #EF4444', borderRadius: 16, padding: '14px 20px', fontSize: 14, color: '#EF4444', fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit || submitting}
          style={{
            padding: '18px', borderRadius: 20, border: 'none', marginTop: 12,
            background: canSubmit && !submitting ? ORANGE : 'rgba(255,255,255,0.05)',
            color: canSubmit && !submitting ? '#000' : MUTED, fontWeight: 900, fontSize: 16, cursor: canSubmit ? 'pointer' : 'not-allowed',
            boxShadow: canSubmit ? '0 8px 24px rgba(255, 138, 61, 0.25)' : 'none',
            transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
          }}
        >
          {submitting ? <Loader2 className="animate-spin" size={20} /> : '送出回饋卡'}
        </button>

      </form>
    </div>
  );
}
