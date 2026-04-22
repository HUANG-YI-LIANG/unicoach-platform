'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

const DURATIONS = [30, 45, 60, 75, 90, 120, 150, 180];
const EMPTY_FORM = {
  title: '',
  description: '',
  duration_minutes: 60,
  price: 1000,
  is_active: true,
};

export default function CoachPlansPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [plans, setPlans] = useState([]);
  const [usingDefaults, setUsingDefaults] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login?redirect=/coach/plans');
      return;
    }
    if (user.role !== 'coach' && user.role !== 'admin') {
      router.push('/dashboard/user');
      return;
    }
    fetchPlans();
  }, [authLoading, user, router]);

  async function fetchPlans() {
    setLoading(true);
    try {
      const response = await fetch('/api/coach/plans');
      const payload = await response.json();
      if (!response.ok) {
        alert(payload.error || '無法取得方案');
        return;
      }
      setPlans(payload.plans || []);
      setUsingDefaults(Boolean(payload.using_defaults));
    } finally {
      setLoading(false);
    }
  }

  function startCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function startEdit(plan) {
    if (String(plan.id).startsWith('default-')) {
      setEditingId(null);
      setForm({
        title: plan.title,
        description: plan.description || '',
        duration_minutes: plan.duration_minutes,
        price: plan.price,
        is_active: true,
      });
      return;
    }

    setEditingId(plan.id);
    setForm({
      title: plan.title,
      description: plan.description || '',
      duration_minutes: plan.duration_minutes,
      price: plan.price,
      is_active: plan.is_active !== false,
    });
  }

  async function savePlan(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const endpoint = editingId ? `/api/coach/plans/${editingId}` : '/api/coach/plans';
      const response = await fetch(endpoint, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok) {
        alert(payload.error || '方案儲存失敗');
        return;
      }
      setEditingId(null);
      setForm(EMPTY_FORM);
      fetchPlans();
    } finally {
      setSaving(false);
    }
  }

  async function deletePlan(plan) {
    if (String(plan.id).startsWith('default-')) {
      alert('預設方案不需要刪除。新增自訂方案後，系統會改用你的自訂方案。');
      return;
    }
    if (!confirm(`確定刪除「${plan.title}」？`)) return;

    const response = await fetch(`/api/coach/plans/${plan.id}`, { method: 'DELETE' });
    const payload = await response.json();
    if (!response.ok) {
      alert(payload.error || '方案刪除失敗');
      return;
    }
    fetchPlans();
  }

  if (authLoading || loading) {
    return <div style={{ padding: 32, color: '#64748B' }}>載入方案資料中...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', padding: '24px 16px 96px' }}>
      <div style={{ maxWidth: 920, margin: '0 auto' }}>
        <button
          onClick={() => router.push('/dashboard/coach')}
          style={{ border: 'none', background: 'transparent', color: '#2563EB', fontWeight: 800, cursor: 'pointer', marginBottom: 18 }}
        >
          ← 回教練中心
        </button>

        <header style={{ marginBottom: 20 }}>
          <h1 style={{ margin: 0, color: '#0F172A', fontSize: 28, fontWeight: 900 }}>方案管理</h1>
          <p style={{ margin: '8px 0 0', color: '#64748B', fontSize: 14 }}>
            設定學生可選擇的課程長度與價格。預約成立時會保存方案快照，之後改價不會影響歷史訂單。
          </p>
        </header>

        {usingDefaults && (
          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8', borderRadius: 16, padding: 14, marginBottom: 18, fontSize: 13, fontWeight: 700 }}>
            目前正在使用系統預設方案。新增任一自訂方案後，前台會改顯示你的自訂方案。
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(280px, 0.8fr)', gap: 18 }}>
          <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {plans.map((plan) => (
              <div key={plan.id} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 18, padding: 18, boxShadow: '0 2px 12px rgba(15,23,42,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <h2 style={{ margin: 0, fontSize: 17, color: '#0F172A', fontWeight: 900 }}>{plan.title}</h2>
                      {String(plan.id).startsWith('default-') && (
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#2563EB', background: '#DBEAFE', borderRadius: 999, padding: '3px 8px' }}>預設</span>
                      )}
                      {!plan.is_active && (
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#991B1B', background: '#FEE2E2', borderRadius: 999, padding: '3px 8px' }}>停用</span>
                      )}
                    </div>
                    <p style={{ margin: 0, color: '#64748B', fontSize: 13 }}>{plan.description || '未填寫方案說明'}</p>
                  </div>
                  <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ color: '#0F172A', fontWeight: 900, fontSize: 18 }}>NT${Number(plan.price).toLocaleString()}</div>
                    <div style={{ color: '#64748B', fontWeight: 700, fontSize: 12 }}>{plan.duration_minutes} 分鐘</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button onClick={() => startEdit(plan)} style={{ padding: '9px 14px', borderRadius: 10, border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A', fontWeight: 800, cursor: 'pointer' }}>
                    {String(plan.id).startsWith('default-') ? '複製成自訂' : '編輯'}
                  </button>
                  {!String(plan.id).startsWith('default-') && (
                    <button onClick={() => deletePlan(plan)} style={{ padding: '9px 14px', borderRadius: 10, border: 'none', background: '#FEE2E2', color: '#991B1B', fontWeight: 800, cursor: 'pointer' }}>
                      刪除
                    </button>
                  )}
                </div>
              </div>
            ))}
          </section>

          <form onSubmit={savePlan} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 18, padding: 18, alignSelf: 'start', boxShadow: '0 2px 12px rgba(15,23,42,0.04)' }}>
            <h2 style={{ margin: '0 0 14px', fontSize: 18, fontWeight: 900, color: '#0F172A' }}>
              {editingId ? '編輯方案' : '新增方案'}
            </h2>
            <label style={{ display: 'block', fontSize: 12, color: '#64748B', fontWeight: 800, marginBottom: 6 }}>方案名稱</label>
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} style={inputStyle} placeholder="例如：基礎單堂課" />

            <label style={labelStyle}>方案說明</label>
            <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} style={{ ...inputStyle, minHeight: 84, resize: 'vertical' }} placeholder="簡短說明適合的學生或課程內容" />

            <label style={labelStyle}>課程長度</label>
            <select value={form.duration_minutes} onChange={(event) => setForm({ ...form, duration_minutes: Number(event.target.value) })} style={inputStyle}>
              {DURATIONS.map((duration) => <option key={duration} value={duration}>{duration} 分鐘</option>)}
            </select>

            <label style={labelStyle}>價格</label>
            <input type="number" value={form.price} onChange={(event) => setForm({ ...form, price: Number(event.target.value) })} style={inputStyle} min="100" max="50000" />

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, color: '#0F172A', fontWeight: 800, fontSize: 13 }}>
              <input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} />
              啟用此方案
            </label>

            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              <button disabled={saving} type="submit" style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: '#2563EB', color: '#FFFFFF', fontWeight: 900, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? '儲存中...' : '儲存方案'}
              </button>
              <button type="button" onClick={startCreate} style={{ padding: 12, borderRadius: 12, border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#64748B', fontWeight: 900, cursor: 'pointer' }}>
                清空
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: 12,
  color: '#64748B',
  fontWeight: 800,
  margin: '14px 0 6px',
};

const inputStyle = {
  width: '100%',
  border: '1px solid #CBD5E1',
  borderRadius: 12,
  padding: '11px 12px',
  color: '#0F172A',
  fontSize: 14,
  outline: 'none',
};
