'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CalendarDays, Check, Loader2, Save } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

const WEEKDAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
];

const SLOT_OPTIONS = Array.from({ length: 28 }, (_, index) => {
  const totalMinutes = (8 * 60) + (index * 30);
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const minutes = String(totalMinutes % 60).padStart(2, '0');
  const start = `${hours}:${minutes}`;
  const nextMinutes = totalMinutes + 30;
  const nextHours = String(Math.floor(nextMinutes / 60)).padStart(2, '0');
  const nextMins = String(nextMinutes % 60).padStart(2, '0');
  return {
    key: `${start}-${nextHours}:${nextMins}`,
    start,
    end: `${nextHours}:${nextMins}`,
    label: start,
  };
});

const EXCEPTION_FORM_DEFAULT = {
  exception_date: new Date().toISOString().slice(0, 10),
  exception_type: 'unavailable',
  start_time: '09:00',
  end_time: '10:00',
  reason: '',
};

function makeSlotMap(slots) {
  return new Set(
    slots.map((slot) => `${slot.weekday}-${slot.start}-${slot.end}`)
  );
}

export default function CoachSchedulePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [slots, setSlots] = useState([]);
  const [usingLegacy, setUsingLegacy] = useState(false);
  const [exceptions, setExceptions] = useState([]);
  const [exceptionForm, setExceptionForm] = useState(EXCEPTION_FORM_DEFAULT);
  const [savingException, setSavingException] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (!authLoading && user && user.role !== 'coach' && user.role !== 'admin') {
      router.push('/dashboard/user');
      return;
    }

    if (!authLoading && user) {
      fetch('/api/coach/availability')
        .then((response) => response.ok ? response.json() : null)
        .then((payload) => {
          setSlots((payload?.rules || []).map((rule) => ({
            weekday: Number(rule.weekday),
            start: String(rule.start_time || rule.start || '').slice(0, 5),
            end: String(rule.end_time || rule.end || '').slice(0, 5),
            slotMinutes: Number(rule.slot_minutes || 30),
          })));
          setUsingLegacy(Boolean(payload?.using_legacy_available_times));
          setExceptions(payload?.exceptions || []);
        })
        .finally(() => setLoading(false));
    }
  }, [authLoading, router, user]);

  const slotSet = useMemo(() => makeSlotMap(slots), [slots]);

  function toggleSlot(weekday, slotOption) {
    const key = `${weekday}-${slotOption.start}-${slotOption.end}`;
    const exists = slotSet.has(key);

    if (exists) {
      setSlots((current) =>
        current.filter((slot) => `${slot.weekday}-${slot.start}-${slot.end}` !== key)
      );
      return;
    }

    setSlots((current) => [
      ...current,
      {
        weekday,
        start: slotOption.start,
        end: slotOption.end,
        slotMinutes: 30,
      },
    ]);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const response = await fetch('/api/coach/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rules: slots.map((slot) => ({
            weekday: slot.weekday,
            start_time: slot.start,
            end_time: slot.end,
            slot_minutes: 30,
            is_active: true,
          })),
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        alert(payload.error || '固定時段儲存失敗');
        return;
      }

      alert('固定時段已更新');
      router.push('/dashboard/coach');
    } finally {
      setSaving(false);
    }
  }

  async function refreshAvailability() {
    const response = await fetch('/api/coach/availability');
    const payload = response.ok ? await response.json() : null;
    if (!payload) return;
    setSlots((payload.rules || []).map((rule) => ({
      weekday: Number(rule.weekday),
      start: String(rule.start_time || rule.start || '').slice(0, 5),
      end: String(rule.end_time || rule.end || '').slice(0, 5),
      slotMinutes: Number(rule.slot_minutes || 30),
    })));
    setUsingLegacy(Boolean(payload.using_legacy_available_times));
    setExceptions(payload.exceptions || []);
  }

  async function handleCreateException(event) {
    event.preventDefault();
    setSavingException(true);
    try {
      const response = await fetch('/api/coach/availability/exceptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exceptionForm),
      });
      const payload = await response.json();
      if (!response.ok) {
        alert(payload.error || '例外時段建立失敗');
        return;
      }
      setExceptionForm((current) => ({
        ...EXCEPTION_FORM_DEFAULT,
        exception_date: current.exception_date,
      }));
      await refreshAvailability();
    } finally {
      setSavingException(false);
    }
  }

  async function handleDeleteException(exceptionId) {
    if (!confirm('確定刪除此例外時段？')) return;

    const response = await fetch(`/api/coach/availability/exceptions/${exceptionId}`, {
      method: 'DELETE',
    });
    const payload = await response.json();
    if (!response.ok) {
      alert(payload.error || '例外時段刪除失敗');
      return;
    }
    await refreshAvailability();
  }

  if (authLoading || loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', color: '#94A3B8' }}>
        <Loader2 className="animate-spin" size={28} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F1F5F9', paddingBottom: 60 }}>
      <div style={{ width: 'min(1120px, calc(100vw - 24px))', margin: '0 auto', padding: '20px 0 40px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 18,
          background: '#FFFFFF',
          borderRadius: 24,
          boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
          padding: 18,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              onClick={() => router.back()}
              style={{ border: 'none', background: '#EFF6FF', color: '#2563EB', width: 40, height: 40, borderRadius: 14, cursor: 'pointer' }}
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: '#0F172A' }}>固定時段維護</h1>
              <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: 13 }}>勾選你每週固定可直接預約的時段。前台列表與教練頁會直接讀這裡。</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              border: 'none',
              background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
              color: '#FFFFFF',
              padding: '14px 18px',
              borderRadius: 16,
              fontWeight: 900,
              cursor: 'pointer',
              boxShadow: '0 12px 24px rgba(37, 99, 235, 0.22)',
            }}
          >
            {saving ? <Loader2 className="animate-spin" size={16} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} /> : <Save size={16} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />}
            儲存時段
          </button>
        </div>

        <div style={{
          background: '#FFFFFF',
          borderRadius: 28,
          boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
          padding: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#2563EB', fontWeight: 900, marginBottom: 12 }}>
            <CalendarDays size={16} />
            勾選式週課表
          </div>

          {usingLegacy && (
            <div style={{
              marginBottom: 14,
              padding: 14,
              borderRadius: 18,
              background: '#EFF6FF',
              color: '#1D4ED8',
              fontSize: 13,
              fontWeight: 800,
            }}>
              目前顯示的是舊版 available_times 資料。按下儲存後，系統會轉存到正式固定時段表。
            </div>
          )}

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 860, borderCollapse: 'separate', borderSpacing: 6 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', color: '#64748B', fontSize: 12, paddingBottom: 8 }}>時間</th>
                  {WEEKDAYS.map((day) => (
                    <th key={day.value} style={{ textAlign: 'center', color: '#64748B', fontSize: 12, paddingBottom: 8 }}>
                      {day.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SLOT_OPTIONS.map((slotOption) => (
                  <tr key={slotOption.key}>
                    <td style={{ color: '#64748B', fontSize: 12, fontWeight: 800, paddingRight: 4 }}>{slotOption.label}</td>
                    {WEEKDAYS.map((day) => {
                      const selected = slotSet.has(`${day.value}-${slotOption.start}-${slotOption.end}`);
                      return (
                        <td key={`${day.value}-${slotOption.key}`}>
                          <button
                            type="button"
                            onClick={() => toggleSlot(day.value, slotOption)}
                            style={{
                              width: '100%',
                              minWidth: 88,
                              border: 'none',
                              borderRadius: 14,
                              padding: '12px 8px',
                              background: selected ? 'linear-gradient(135deg, #2563EB, #1D4ED8)' : '#EFF6FF',
                              color: selected ? '#FFFFFF' : '#1D4ED8',
                              fontWeight: 900,
                              cursor: 'pointer',
                            }}
                          >
                            {selected ? <Check size={15} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} /> : null}
                            {selected ? '可約' : '空白'}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{
            marginTop: 16,
            padding: 14,
            borderRadius: 18,
            background: '#F8FAFC',
            color: '#475569',
            fontSize: 13,
            lineHeight: 1.7,
          }}>
            目前已選 {slots.length} 個 30 分鐘格位。
            這些時段會用來推算列表頁的「最快可約」、教練詳情頁的每週時段表，以及預約時可選時段。
          </div>
        </div>

        <div style={{
          background: '#FFFFFF',
          borderRadius: 28,
          boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
          padding: 20,
          marginTop: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0F172A', fontWeight: 900, marginBottom: 12 }}>
            <CalendarDays size={16} />
            單日例外時段
          </div>

          <p style={{ margin: '0 0 16px', color: '#64748B', fontSize: 13, lineHeight: 1.6 }}>
            用來設定特定日期的請假/停課，或臨時加開可約時段。例外會覆蓋上方固定週課表。
          </p>

          <form onSubmit={handleCreateException} style={{
            display: 'grid',
            gridTemplateColumns: '1.1fr 1fr 0.8fr 0.8fr 1.3fr auto',
            gap: 10,
            alignItems: 'end',
            marginBottom: 18,
          }}>
            <label style={fieldLabelStyle}>
              日期
              <input
                type="date"
                value={exceptionForm.exception_date}
                onChange={(event) => setExceptionForm({ ...exceptionForm, exception_date: event.target.value })}
                style={fieldInputStyle}
              />
            </label>

            <label style={fieldLabelStyle}>
              類型
              <select
                value={exceptionForm.exception_type}
                onChange={(event) => setExceptionForm({ ...exceptionForm, exception_type: event.target.value })}
                style={fieldInputStyle}
              >
                <option value="unavailable">不可約 / 請假</option>
                <option value="available">臨時可約</option>
              </select>
            </label>

            <label style={fieldLabelStyle}>
              開始
              <input
                type="time"
                step="1800"
                value={exceptionForm.start_time}
                onChange={(event) => setExceptionForm({ ...exceptionForm, start_time: event.target.value })}
                style={fieldInputStyle}
              />
            </label>

            <label style={fieldLabelStyle}>
              結束
              <input
                type="time"
                step="1800"
                value={exceptionForm.end_time}
                onChange={(event) => setExceptionForm({ ...exceptionForm, end_time: event.target.value })}
                style={fieldInputStyle}
              />
            </label>

            <label style={fieldLabelStyle}>
              備註
              <input
                value={exceptionForm.reason}
                onChange={(event) => setExceptionForm({ ...exceptionForm, reason: event.target.value })}
                placeholder="例如：比賽、考試、臨時加開"
                style={fieldInputStyle}
              />
            </label>

            <button
              type="submit"
              disabled={savingException}
              style={{
                border: 'none',
                background: exceptionForm.exception_type === 'available' ? '#059669' : '#F59E0B',
                color: '#FFFFFF',
                borderRadius: 14,
                padding: '12px 16px',
                fontWeight: 900,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {savingException ? '新增中...' : '新增例外'}
            </button>
          </form>

          {exceptions.length === 0 ? (
            <div style={{
              padding: 18,
              borderRadius: 18,
              background: '#F8FAFC',
              color: '#64748B',
              fontSize: 13,
              textAlign: 'center',
              fontWeight: 700,
            }}>
              目前沒有未來例外時段。
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {exceptions.map((exception) => (
                <div key={exception.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  border: '1px solid #E2E8F0',
                  borderRadius: 18,
                  padding: 14,
                  background: '#FFFFFF',
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{
                        padding: '3px 9px',
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 900,
                        color: exception.exception_type === 'available' ? '#065F46' : '#92400E',
                        background: exception.exception_type === 'available' ? '#D1FAE5' : '#FEF3C7',
                      }}>
                        {exception.exception_type === 'available' ? '臨時可約' : '不可約'}
                      </span>
                      <strong style={{ color: '#0F172A', fontSize: 14 }}>
                        {exception.exception_date} {String(exception.start_time).slice(0, 5)}-{String(exception.end_time).slice(0, 5)}
                      </strong>
                    </div>
                    <div style={{ color: '#64748B', fontSize: 12 }}>
                      {exception.reason || '未填寫備註'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteException(exception.id)}
                    style={{
                      border: 'none',
                      background: '#FEE2E2',
                      color: '#991B1B',
                      borderRadius: 12,
                      padding: '9px 12px',
                      fontWeight: 900,
                      cursor: 'pointer',
                    }}
                  >
                    刪除
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const fieldLabelStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  color: '#64748B',
  fontSize: 12,
  fontWeight: 900,
};

const fieldInputStyle = {
  border: '1px solid #CBD5E1',
  borderRadius: 12,
  padding: '11px 12px',
  color: '#0F172A',
  fontSize: 13,
  outline: 'none',
  width: '100%',
};
