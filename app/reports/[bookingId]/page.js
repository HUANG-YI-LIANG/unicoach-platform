'use client';
import { useState, use } from 'react';
import { useRouter } from 'next/navigation';

const BLUE  = '#2563EB';
const DARK  = '#0F172A';
const MUTED = '#94A3B8';
const BG    = '#F1F5F9';
const WHITE = '#FFFFFF';

function ScoreButton({ value, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      style={{
        width: 44, height: 44, borderRadius: '50%', border: 'none',
        background: selected ? BLUE : '#E2E8F0',
        color: selected ? WHITE : DARK,
        fontWeight: 800, fontSize: 15, cursor: 'pointer',
        transition: 'all 0.15s',
        transform: selected ? 'scale(1.1)' : 'scale(1)',
      }}
    >
      {value}
    </button>
  );
}

function ScoreRow({ label, value, onChange }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: DARK }}>{label}</p>
      <div style={{ display: 'flex', gap: 8 }}>
        {[1, 2, 3, 4, 5].map(v => (
          <ScoreButton key={v} value={v} selected={value === v} onClick={onChange} />
        ))}
        <span style={{ marginLeft: 8, fontSize: 12, color: MUTED, alignSelf: 'center' }}>
          {value ? `${value} 分` : '請選擇'}
        </span>
      </div>
    </div>
  );
}

export default function ReportPage({ params }) {
  const { bookingId } = use(params);
  const router = useRouter();

  const PROGRESS_MAP = {
    'obvious': '顯著進步',
    'slight': '穩定進步',
    'none': '持平',
    'needs_improvement': '需加強'
  };

  const [form, setForm] = useState({
    completedItems: '',
    focusScore: 0,
    cooperationScore: 0,
    completionScore: 0,
    understandingScore: 0,
    observation: '',
    suggestions: '',
    progressLevel: 'none',
  });
  const [submitting, setSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiDraft, setAiDraft] = useState(null);
  const [aiDraftApplied, setAiDraftApplied] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = form.focusScore && form.cooperationScore &&
    form.completionScore && form.understandingScore &&
    form.completedItems.trim();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) { setError('請填寫完整評分與本堂完成項目'); return; }
    setSubmitting(true);
    setError('');

    try {
      // 1. Submit learning report
      // Map form data and ensure progressLevel is one of: 'obvious', 'slight', 'none', 'needs_improvement'
      const reportRes = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, ...form, applyAiDraft: aiDraftApplied }),
      });
      const reportData = await reportRes.json();
      if (!reportRes.ok) throw new Error(reportData.error || '紀錄卡提交失敗');

      // 2. Mark booking as completed
      const statusRes = await fetch(`/api/bookings/${bookingId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
      const statusData = await statusRes.json();
      if (!statusRes.ok) throw new Error(statusData.error || '完課狀態更新失敗');

      alert('✅ 學習紀錄卡已提交，課程已完成！');
      router.push('/bookings');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerate = async () => {
    if (!form.observation && !form.suggestions) {
      alert('請至少先填寫幾個關鍵字喔！');
      return;
    }
    setIsGenerating(true);
    try {
      const res = await fetch('/api/ai/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, observation: form.observation, suggestions: form.suggestions })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI 擴寫失敗');

      setAiDraft(data.draft || null);
      setAiDraftApplied(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyAiDraft = () => {
    if (!aiDraft) return;
    setForm(f => ({
      ...f,
      observation: aiDraft.observation || f.observation,
      suggestions: aiDraft.suggestions || f.suggestions,
    }));
    setAiDraftApplied(true);
  };

  return (
    <div style={{ background: BG, minHeight: '100vh', paddingBottom: 100 }}>

      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${BLUE}, #1E40AF)`,
        padding: '16px 16px 24px',
        color: WHITE,
      }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', color: WHITE, fontSize: 20, cursor: 'pointer', marginBottom: 8 }}
        >
          ‹
        </button>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>📋 學習紀錄卡</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.8 }}>
          填寫完畢後系統將自動完成課程，抽成率也會依完課數調整 🎯
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Completed Items */}
        <div style={{ background: WHITE, borderRadius: 20, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 800, color: DARK }}>📝 本堂完成項目</p>
          <textarea
            value={form.completedItems}
            onChange={e => setForm(f => ({ ...f, completedItems: e.target.value }))}
            placeholder="例：完成基礎發球練習 3 組、腳步移動訓練、反手側身練習..."
            rows={3}
            style={{
              width: '100%', padding: '10px 14px', border: '1.5px solid #E2E8F0',
              borderRadius: 12, fontSize: 13, lineHeight: 1.6, resize: 'none',
              outline: 'none', fontFamily: 'inherit', color: DARK, boxSizing: 'border-box',
            }}
            onFocus={e => e.target.style.borderColor = BLUE}
            onBlur={e => e.target.style.borderColor = '#E2E8F0'}
          />
        </div>

        {/* Scores */}
        <div style={{ background: WHITE, borderRadius: 20, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <p style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 800, color: DARK }}>⭐ 學員表現評分（1-5 分）</p>
          <ScoreRow label="🎯 專注度" value={form.focusScore}
            onChange={v => setForm(f => ({ ...f, focusScore: v }))} />
          <ScoreRow label="🤝 配合度" value={form.cooperationScore}
            onChange={v => setForm(f => ({ ...f, cooperationScore: v }))} />
          <ScoreRow label="✅ 完成率" value={form.completionScore}
            onChange={v => setForm(f => ({ ...f, completionScore: v }))} />
          <ScoreRow label="💡 理解度" value={form.understandingScore}
            onChange={v => setForm(f => ({ ...f, understandingScore: v }))} />
        </div>

        {/* Progress Level */}
        <div style={{ background: WHITE, borderRadius: 20, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 800, color: DARK }}>📈 本堂進展評估</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(PROGRESS_MAP).map(([key, label]) => (
              <button
                key={key} type="button"
                onClick={() => setForm(f => ({ ...f, progressLevel: key }))}
                style={{
                  padding: '8px 16px', borderRadius: 100, border: 'none',
                  background: form.progressLevel === key ? BLUE : '#F1F5F9',
                  color: form.progressLevel === key ? WHITE : '#475569',
                  fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Observation & Suggestions */}
        <div style={{ background: WHITE, borderRadius: 20, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 800, color: DARK }}>🔍 教練觀察</p>
          <textarea
            value={form.observation}
            onChange={e => setForm(f => ({ ...f, observation: e.target.value }))}
            placeholder="學員動作習慣、需注意的地方（選填）"
            rows={2}
            style={{
              width: '100%', padding: '10px 14px', border: '1.5px solid #E2E8F0',
              borderRadius: 12, fontSize: 13, lineHeight: 1.6, resize: 'none',
              outline: 'none', fontFamily: 'inherit', color: DARK, boxSizing: 'border-box',
            }}
            onFocus={e => e.target.style.borderColor = BLUE}
            onBlur={e => e.target.style.borderColor = '#E2E8F0'}
          />
          <p style={{ margin: '14px 0 10px', fontSize: 13, fontWeight: 800, color: DARK }}>💪 下堂建議</p>
          <textarea
            value={form.suggestions}
            onChange={e => setForm(f => ({ ...f, suggestions: e.target.value }))}
            placeholder="下次上課可以加強的方向（選填）"
            rows={2}
            style={{
              width: '100%', padding: '10px 14px', border: '1.5px solid #E2E8F0',
              borderRadius: 12, fontSize: 13, lineHeight: 1.6, resize: 'none',
              outline: 'none', fontFamily: 'inherit', color: DARK, boxSizing: 'border-box',
            }}
            onFocus={e => e.target.style.borderColor = BLUE}
            onBlur={e => e.target.style.borderColor = '#E2E8F0'}
          />
          

          {aiDraft && (
            <div style={{
              marginTop: 16,
              border: '1px solid #DDD6FE',
              background: '#F5F3FF',
              borderRadius: 16,
              padding: 16,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 10 }}>
                <div>
                  <p style={{ margin: 0, color: '#5B21B6', fontSize: 13, fontWeight: 900 }}>AI 生成草稿</p>
                  <p style={{ margin: '3px 0 0', color: '#7C3AED', fontSize: 11 }}>
                    {aiDraft.model || 'AI'} · {aiDraft.generatedAt ? new Date(aiDraft.generatedAt).toLocaleString('zh-TW') : '剛剛生成'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleApplyAiDraft}
                  style={{
                    background: aiDraftApplied ? '#DDD6FE' : '#7C3AED',
                    color: aiDraftApplied ? '#5B21B6' : WHITE,
                    border: 'none',
                    padding: '9px 13px',
                    borderRadius: 12,
                    fontWeight: 900,
                    cursor: 'pointer',
                  }}
                >
                  {aiDraftApplied ? '已套用' : '套用草稿'}
                </button>
              </div>
              <div style={{ color: '#312E81', fontSize: 13, lineHeight: 1.7 }}>
                <strong>教練觀察：</strong>
                <p style={{ margin: '4px 0 10px' }}>{aiDraft.observation || '無'}</p>
                <strong>下堂建議：</strong>
                <p style={{ margin: '4px 0 0' }}>{aiDraft.suggestions || '無'}</p>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div style={{ background: '#FEE2E2', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#DC2626', fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit || submitting}
          style={{
            padding: '16px', borderRadius: 16, border: 'none',
            background: canSubmit && !submitting ? BLUE : '#CBD5E1',
            color: WHITE, fontWeight: 800, fontSize: 16, cursor: canSubmit ? 'pointer' : 'not-allowed',
            boxShadow: canSubmit ? '0 8px 24px rgba(37,99,235,0.25)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          {submitting ? '提交中…' : '✅ 提交紀錄卡並完成課程'}
        </button>

      </form>
    </div>
  );
}
