'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';

const DURATIONS = [30, 45, 60, 75, 90, 120, 150, 180];
const EMPTY_FORM = {
  title: '',
  description: '',
  duration_minutes: 60,
  price: 1000,
  is_active: true,
};

function StatusDot({ done }) {
  return (
    <span style={{
      width: 20,
      height: 20,
      borderRadius: 999,
      flex: '0 0 auto',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: `1px solid ${done ? 'rgba(16,185,129,.45)' : 'var(--border-main)'}`,
      background: done ? 'rgba(16,185,129,.12)' : 'rgba(255,255,255,.035)',
      color: done ? '#10B981' : 'var(--text-muted)',
      fontSize: 11,
      fontWeight: 900,
    }}>
      {done ? '✓' : '·'}
    </span>
  );
}

function ChecklistRow({ done, label, hint }) {
  return (
    <div style={{ display: 'flex', gap: 10, padding: '10px 0', borderTop: '1px solid var(--border-main)' }}>
      <StatusDot done={done} />
      <div>
        <div style={{ color: 'var(--text-main)', fontWeight: 850, fontSize: 13 }}>{label}</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.45, marginTop: 2 }}>{hint}</div>
      </div>
    </div>
  );
}

export default function CoachPlansPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [coachDetail, setCoachDetail] = useState(null);
  const [plans, setPlans] = useState([]);
  const [usingDefaults, setUsingDefaults] = useState(false);
  const [availabilityRules, setAvailabilityRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
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
    setLoadError('');

    try {
      const [plansResponse, profileResponse, availabilityResponse] = await Promise.all([
        fetchWithTimeout('/api/coach/plans'),
        fetchWithTimeout('/api/auth/profile'),
        fetchWithTimeout('/api/coach/availability'),
      ]);

      const payload = await plansResponse.json().catch(() => ({}));
      if (!plansResponse.ok) {
        throw new Error(payload.error || '方案資料載入失敗');
      }
      setPlans(payload.plans || []);
      setUsingDefaults(Boolean(payload.using_defaults));

      if (profileResponse.ok) {
        const profilePayload = await profileResponse.json().catch(() => ({}));
        setProfile(profilePayload.profile || null);
        setCoachDetail(profilePayload.coach || null);
      }

      if (availabilityResponse.ok) {
        const availabilityPayload = await availabilityResponse.json().catch(() => ({}));
        setAvailabilityRules(Array.isArray(availabilityPayload.rules) ? availabilityPayload.rules : []);
      }
    } catch (error) {
      setLoadError(error.message || '無法載入方案');
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
      alert('預設方案不需要刪除。新增自訂課程方案後，系統會優先使用你的自訂方案；仍需完成審核、時段與公開服務狀態。');
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

  const readiness = useMemo(() => {
    const activePlans = plans.filter((plan) => plan?.is_active !== false && !String(plan?.id || '').startsWith('default-'));
    const hasActiveCoursePlan = activePlans.length > 0 && !usingDefaults;
    const hasAvailability = availabilityRules.some((rule) => rule?.is_active !== false);
    const isApproved = coachDetail?.approval_status === 'approved' || profile?.approval_status === 'approved';
    const hasCoachBasics = Boolean(
      profile?.name &&
      (coachDetail?.service_areas || coachDetail?.university || coachDetail?.location) &&
      (coachDetail?.experience || coachDetail?.philosophy || coachDetail?.teaching_features)
    );
    const publicServiceEnabled = Boolean(isApproved && hasActiveCoursePlan && hasAvailability);

    return {
      hasActiveCoursePlan,
      hasAvailability,
      isApproved,
      hasCoachBasics,
      publicServiceEnabled,
    };
  }, [availabilityRules, coachDetail, plans, profile, usingDefaults]);

  if (authLoading || loading) {
    return <div style={{ padding: 32, color: 'var(--text-muted)' }}>載入課程方案資料中...</div>;
  }

  if (loadError) {
    return (
      <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 420, background: 'var(--bg-surface)', border: '1px solid var(--border-main)', borderRadius: 20, padding: 24, textAlign: 'center', color: 'var(--text-main)' }}>
          <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 900 }}>無法載入課程方案</h1>
          <p style={{ margin: '0 0 18px', color: 'var(--text-muted)', fontSize: 14 }}>{loadError}</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button type="button" onClick={fetchPlans} style={{ border: 'none', background: 'var(--primary)', color: 'var(--text-light)', borderRadius: 12, padding: '11px 16px', fontWeight: 900, cursor: 'pointer' }}>重新載入</button>
            <button type="button" onClick={() => router.push('/coach/profile/edit')} style={{ border: '1px solid var(--border-input)', background: 'transparent', color: 'var(--text-main)', borderRadius: 12, padding: '11px 16px', fontWeight: 900, cursor: 'pointer' }}>完成教練資料</button>
            <button type="button" onClick={() => router.push('/dashboard/coach')} style={{ border: '1px solid var(--border-input)', background: 'transparent', color: 'var(--text-main)', borderRadius: 12, padding: '11px 16px', fontWeight: 900, cursor: 'pointer' }}>回教練中心</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'transparent', padding: '24px 16px 96px' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .plans-grid {
          display: grid;
          grid-template-columns: minmax(300px, 1.2fr) minmax(320px, 0.8fr);
          gap: 24px;
          align-items: start;
        }
        .plans-cta-row {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin: 18px 0 0;
        }
        @media (max-width: 1100px) {
          .plans-grid {
            display: flex;
            flex-direction: column-reverse;
            gap: 24px;
          }
        }
        .form-card {
          background: var(--bg-surface);
          border: 1px solid var(--border-main);
          border-radius: 16px;
          padding: 20px;
          box-shadow: var(--shadow-sm);
        }
      ` }} />
      <div style={{ maxWidth: 920, margin: '0 auto' }}>
        <button
          onClick={() => router.push('/dashboard/coach')}
          style={{ border: 'none', background: 'transparent', color: 'var(--primary)', fontWeight: 800, cursor: 'pointer', marginBottom: 18 }}
        >
          ← 回教練中心
        </button>

        <header style={{ marginBottom: 18 }}>
          <p style={{ margin: '0 0 6px', color: 'var(--text-muted)', fontSize: 12, fontWeight: 900, letterSpacing: '.08em' }}>課程方案</p>
          <h1 style={{ margin: 0, color: 'var(--text-main)', fontSize: 28, fontWeight: 900 }}>課程方案管理</h1>
          <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.65 }}>
            課程方案用來設定單堂課長、價格與說明。要能被學生預約，還需要完成審核、設定可上課時段、並確認公開服務已啟用。建立方案不代表已經完成上架。
          </p>
          <div className="plans-cta-row">
            <button type="button" onClick={startCreate} style={primaryButtonStyle}>新增課程方案</button>
            <button type="button" onClick={() => router.push('/coach/schedule')} style={secondaryButtonStyle}>設定可上課時段</button>
            {(profile?.id || user?.id) && (
              <button type="button" onClick={() => router.push(`/coaches/${profile?.id || user?.id}`)} style={secondaryButtonStyle}>查看公開教練頁</button>
            )}
          </div>
        </header>

        <section style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-main)', borderRadius: 18, padding: 18, marginBottom: 18, boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 8 }}>
            <div>
              <h2 style={{ margin: 0, color: 'var(--text-main)', fontSize: 16, fontWeight: 900 }}>可接單狀態 Checklist</h2>
              <p style={{ margin: '5px 0 0', color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.5 }}>依現有資料 best-effort 判斷；資料不足時請到對應頁面確認。</p>
            </div>
            <span style={{ border: '1px solid var(--border-main)', borderRadius: 999, padding: '5px 9px', color: readiness.publicServiceEnabled ? '#10B981' : 'var(--text-muted)', fontSize: 12, fontWeight: 900 }}>
              {readiness.publicServiceEnabled ? '可接單條件齊全' : '尚需確認'}
            </span>
          </div>
          <ChecklistRow done={readiness.isApproved} label="身分 / 學生證審核通過" hint={readiness.isApproved ? '已看到審核通過狀態。' : '尚未看到審核通過狀態，請確認教練資料與審核。'} />
          <ChecklistRow done={readiness.hasActiveCoursePlan} label="至少一個啟用中的課程方案" hint={readiness.hasActiveCoursePlan ? '已有自訂且啟用中的課程方案。' : '目前沒有可確認的自訂啟用方案；預設方案不等於正式上架。'} />
          <ChecklistRow done={readiness.hasAvailability} label="已設定可上課時段" hint={readiness.hasAvailability ? '已有固定可預約時段。' : '請到排程頁設定可上課時段。'} />
          <ChecklistRow done={readiness.publicServiceEnabled} label="公開服務已啟用" hint={readiness.publicServiceEnabled ? '公開頁可售條件已具備。' : '需同時具備審核、啟用方案與可上課時段；若仍未顯示，請確認公開教練頁。'} />
          <ChecklistRow done={readiness.hasCoachBasics} label="教練資料完整" hint={readiness.hasCoachBasics ? '基本自介與教學資料已填寫。' : '建議補齊教練資料、自介、地區或教學特色。'} />
        </section>

        {usingDefaults && (
          <div style={{ background: 'var(--primary-bg)', border: '1px solid var(--border-active)', color: 'var(--primary)', borderRadius: 16, padding: 14, marginBottom: 18, fontSize: 13, fontWeight: 700, lineHeight: 1.55 }}>
            目前正在使用系統預設課程方案。新增自訂課程方案後，系統會優先使用你的自訂方案；但仍需完成審核、時段與公開服務狀態，才代表可以被學生預約。
          </div>
        )}

        <div className="plans-grid">
          <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {plans.map((plan) => (
              <div key={plan.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-main)', borderRadius: 18, padding: 18, boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <h2 style={{ margin: 0, fontSize: 17, color: 'var(--text-main)', fontWeight: 900 }}>{plan.title}</h2>
                      {String(plan.id).startsWith('default-') && (
                        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--primary)', background: 'var(--primary-bg)', borderRadius: 999, padding: '3px 8px' }}>預設</span>
                      )}
                      {!plan.is_active && (
                        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--error)', background: 'var(--danger-bg)', borderRadius: 999, padding: '3px 8px' }}>停用</span>
                      )}
                    </div>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>{plan.description || '未填寫方案說明'}</p>
                  </div>
                  <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ color: 'var(--text-main)', fontWeight: 900, fontSize: 18 }}>NT${Number(plan.price).toLocaleString()}</div>
                    <div style={{ color: 'var(--text-muted)', fontWeight: 700, fontSize: 12 }}>{plan.duration_minutes} 分鐘</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button onClick={() => startEdit(plan)} style={{ padding: '9px 14px', borderRadius: 10, border: '1px solid var(--border-input)', background: 'transparent', color: 'var(--text-main)', fontWeight: 800, cursor: 'pointer' }}>
                    {String(plan.id).startsWith('default-') ? '複製成自訂' : '編輯'}
                  </button>
                  {!String(plan.id).startsWith('default-') && (
                    <button onClick={() => deletePlan(plan)} style={{ padding: '9px 14px', borderRadius: 10, border: 'none', background: 'var(--danger-bg)', color: 'var(--error)', fontWeight: 800, cursor: 'pointer' }}>
                      刪除
                    </button>
                  )}
                </div>
              </div>
            ))}
          </section>

          <form onSubmit={savePlan} className="form-card">
            <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 900, color: 'var(--text-main)' }}>
              {editingId ? '編輯課程方案' : '新增課程方案'}
            </h2>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', fontWeight: 800, marginBottom: 6 }}>方案名稱</label>
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} style={inputStyle} placeholder="例如：基礎單堂課" />

            <label style={labelStyle}>方案說明</label>
            <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} placeholder="簡短說明適合的學生或課程內容" />

            <label style={labelStyle}>課程長度</label>
            <select value={form.duration_minutes} onChange={(event) => setForm({ ...form, duration_minutes: Number(event.target.value) })} style={inputStyle}>
              {DURATIONS.map((duration) => <option key={duration} value={duration}>{duration} 分鐘</option>)}
            </select>

            <label style={labelStyle}>價格</label>
            <input type="number" value={form.price} onChange={(event) => setForm({ ...form, price: Number(event.target.value) })} style={inputStyle} min="100" max="50000" />

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, color: 'var(--text-main)', fontWeight: 800, fontSize: 13 }}>
              <input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} />
              啟用此課程方案
            </label>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button disabled={saving} type="submit" style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: 'var(--primary)', color: 'var(--text-light)', fontWeight: 900, fontSize: 14, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? '儲存中...' : '儲存方案'}
              </button>
              <button type="button" onClick={startCreate} style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid var(--border-input)', background: 'transparent', color: 'var(--text-muted)', fontWeight: 900, fontSize: 14, cursor: 'pointer' }}>
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
  color: 'var(--text-muted)',
  fontWeight: 800,
  margin: '14px 0 6px',
};

const inputStyle = {
  width: '100%',
  border: '1px solid var(--border-input)',
  background: 'var(--bg-input)',
  borderRadius: 12,
  padding: '11px 12px',
  color: 'var(--text-main)',
  fontSize: 14,
  outline: 'none',
};

const primaryButtonStyle = {
  border: 'none',
  background: 'var(--primary)',
  color: 'var(--text-light)',
  borderRadius: 12,
  padding: '10px 14px',
  fontWeight: 900,
  cursor: 'pointer',
};

const secondaryButtonStyle = {
  border: '1px solid var(--border-input)',
  background: 'transparent',
  color: 'var(--text-main)',
  borderRadius: 12,
  padding: '10px 14px',
  fontWeight: 900,
  cursor: 'pointer',
};
