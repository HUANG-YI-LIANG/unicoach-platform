'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CalendarDays, Check, Loader2, Save } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';

const WEEKDAYS = [
  { value: 1, label: '一' },
  { value: 2, label: '二' },
  { value: 3, label: '三' },
  { value: 4, label: '四' },
  { value: 5, label: '五' },
  { value: 6, label: '六' },
  { value: 0, label: '日' },
];

const FORMAL_BOOKING_STATUSES = ['confirmed', 'scheduled', 'in_progress', 'pending_completion', 'completed'];

function getWeekBounds(baseDate = new Date()) {
  const start = new Date(baseDate);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diffToMonday);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start, end };
}

function isSameDate(left, right) {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

function formatScheduleDate(date) {
  const weekday = WEEKDAYS.find((day) => day.value === date.getDay())?.label || '';
  return `${date.getMonth() + 1}/${date.getDate()}（${weekday}）`;
}

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
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [slots, setSlots] = useState([]);
  const [usingLegacy, setUsingLegacy] = useState(false);
  const [exceptions, setExceptions] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [selectedWeekday, setSelectedWeekday] = useState(new Date().getDay());
  const [exceptionForm, setExceptionForm] = useState(EXCEPTION_FORM_DEFAULT);
  const [savingException, setSavingException] = useState(false);

  const applyAvailabilityPayload = useCallback((payload) => {
    setSlots((payload?.rules || []).map((rule) => ({
      weekday: Number(rule.weekday),
      start: String(rule.start_time || rule.start || '').slice(0, 5),
      end: String(rule.end_time || rule.end || '').slice(0, 5),
      slotMinutes: Number(rule.slot_minutes || 30),
    })));
    setUsingLegacy(Boolean(payload?.using_legacy_available_times));
    setExceptions(payload?.exceptions || []);
  }, []);

  const fetchAvailability = useCallback(async () => {
    setLoading(true);
    setLoadError('');

    try {
      const response = await fetchWithTimeout('/api/coach/availability');
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || '固定時段載入失敗');
      }
      applyAvailabilityPayload(payload);
    } catch (error) {
      setLoadError(error.message || '無法載入固定時段');
    } finally {
      setLoading(false);
    }
  }, [applyAvailabilityPayload]);

  const fetchBookings = useCallback(async () => {
    try {
      const response = await fetchWithTimeout('/api/bookings');
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) return;
      setBookings(Array.isArray(payload.bookings) ? payload.bookings : []);
    } catch (error) {
      setBookings([]);
    }
  }, []);

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
      fetchAvailability();
      fetchBookings();
    }
  }, [authLoading, fetchAvailability, fetchBookings, router, user]);

  const slotSet = useMemo(() => makeSlotMap(slots), [slots]);
  const formalBookings = useMemo(() => bookings.filter((booking) => FORMAL_BOOKING_STATUSES.includes(booking.status)), [bookings]);
  const weeklyScheduleSummary = useMemo(() => {
    const now = new Date();
    const { start, end } = getWeekBounds(now);
    const withDates = formalBookings
      .map((booking) => ({ ...booking, expectedDate: booking.expected_time ? new Date(booking.expected_time) : null }))
      .filter((booking) => booking.expectedDate && !Number.isNaN(booking.expectedDate.getTime()));
    const todayCourses = withDates
      .filter((booking) => isSameDate(booking.expectedDate, now))
      .sort((left, right) => left.expectedDate - right.expectedDate);
    const weekCourses = withDates
      .filter((booking) => booking.expectedDate >= start && booking.expectedDate < end)
      .sort((left, right) => left.expectedDate - right.expectedDate);
    const upcomingCourses = weekCourses.filter((booking) => booking.expectedDate >= now);
    return {
      openedSlotCount: slots.length,
      todayCourses,
      weekCourses,
      upcomingCourses,
      todayBookingCount: todayCourses.length,
      weekBookingCount: weekCourses.length,
      hasOpenSlots: slots.length > 0,
    };
  }, [formalBookings, slots.length]);
  const selectedWeekdayLabel = WEEKDAYS.find((day) => day.value === selectedWeekday)?.label || '一';
  const visibleDaySlots = useMemo(() => slots
    .filter((slot) => slot.weekday === selectedWeekday)
    .sort((left, right) => left.start.localeCompare(right.start)), [selectedWeekday, slots]);

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
    await fetchAvailability();
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', color: 'var(--text-muted)' }}>
        <Loader2 className="animate-spin" size={28} />
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 420, background: 'var(--bg-surface)', border: '1px solid var(--border-main)', borderRadius: 20, padding: 24, textAlign: 'center', color: 'var(--text-main)' }}>
          <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 900 }}>無法載入固定時段</h1>
          <p style={{ margin: '0 0 18px', color: 'var(--text-muted)', fontSize: 14 }}>{loadError}</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button type="button" onClick={fetchAvailability} style={{ border: 'none', background: 'var(--primary)', color: 'var(--text-light)', borderRadius: 12, padding: '11px 16px', fontWeight: 900, cursor: 'pointer' }}>重新載入</button>
            <button type="button" onClick={() => router.push('/dashboard/coach')} style={{ border: '1px solid var(--border-input)', background: 'transparent', color: 'var(--text-main)', borderRadius: 12, padding: '11px 16px', fontWeight: 900, cursor: 'pointer' }}>回教練中心</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'transparent', paddingBottom: 60 }}>
      <div style={{ width: 'min(1120px, calc(100vw - 24px))', margin: '0 auto', padding: '20px 0 40px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 18,
          background: 'var(--bg-surface)',
          borderRadius: 24,
          boxShadow: 'var(--shadow-md)',
          border: '1px solid var(--border-main)',
          padding: 18,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              onClick={() => router.back()}
              style={{ border: 'none', background: 'var(--bg-input)', color: 'var(--text-main)', width: 40, height: 40, borderRadius: 14, cursor: 'pointer' }}
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: 'var(--text-main)' }}>固定時段維護</h1>
              <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>勾選你每週固定可直接預約的時段。前台列表與教練頁會直接讀這裡。</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              border: 'none',
              background: 'var(--primary)',
              color: 'var(--text-light)',
              padding: '14px 18px',
              borderRadius: 16,
              fontWeight: 900,
              cursor: 'pointer',
              boxShadow: '0 8px 24px var(--primary-bg)',
            }}
          >
            {saving ? <Loader2 className="animate-spin" size={16} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} /> : <Save size={16} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />}
            新增可上課時段
          </button>
        </div>

        <section style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 12,
          marginBottom: 18,
        }}>
          {[
            { label: '本週已開放時段數', value: weeklyScheduleSummary.openedSlotCount, empty: '尚未設定可上課時段' },
            { label: '今日預約數', value: weeklyScheduleSummary.todayBookingCount, empty: '本週還沒有正式預約' },
            { label: '本週預約數', value: weeklyScheduleSummary.weekBookingCount, empty: '本週還沒有正式預約' },
            { label: '尚未開放時段提醒', value: weeklyScheduleSummary.hasOpenSlots ? '已設定' : '需設定', empty: '尚未設定可上課時段' },
          ].map((item) => (
            <div key={item.label} style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-main)',
              borderRadius: 20,
              padding: 16,
              boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 900, marginBottom: 8 }}>{item.label}</div>
              <div style={{ color: 'var(--text-main)', fontSize: 24, fontWeight: 950 }}>{item.value}</div>
              {Number(item.value) === 0 || item.value === '需設定' ? (
                <div style={{ color: 'var(--warning)', fontSize: 12, fontWeight: 800, marginTop: 6 }}>{item.empty}</div>
              ) : null}
            </div>
          ))}
        </section>

        <section style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 14,
          marginBottom: 20,
        }}>
          <div style={summaryPanelStyle}>
            <h2 style={summaryPanelTitleStyle}>今日課程</h2>
            {weeklyScheduleSummary.todayCourses.length === 0 ? (
              <p style={emptySummaryStyle}>本週還沒有正式預約</p>
            ) : weeklyScheduleSummary.todayCourses.slice(0, 3).map((booking) => (
              <div key={booking.id} style={courseRowStyle}>
                <strong>{booking.expectedDate.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}</strong>
                <span>{booking.user_name || '學員'} · {booking.service_title || '課程'}</span>
              </div>
            ))}
          </div>
          <div style={summaryPanelStyle}>
            <h2 style={summaryPanelTitleStyle}>本週即將上課</h2>
            {weeklyScheduleSummary.upcomingCourses.length === 0 ? (
              <p style={emptySummaryStyle}>本週還沒有正式預約</p>
            ) : weeklyScheduleSummary.upcomingCourses.slice(0, 4).map((booking) => (
              <div key={booking.id} style={courseRowStyle}>
                <strong>{formatScheduleDate(booking.expectedDate)}</strong>
                <span>{booking.expectedDate.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })} · {booking.user_name || '學員'}</span>
              </div>
            ))}
          </div>
          <div style={summaryPanelStyle}>
            <h2 style={summaryPanelTitleStyle}>可被預約時段</h2>
            {/* weekday chips */}
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6, marginBottom: 10 }}>
              {WEEKDAYS.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => setSelectedWeekday(day.value)}
                  style={{
                    flex: '0 0 auto',
                    border: `1px solid ${selectedWeekday === day.value ? 'var(--primary)' : 'var(--border-main)'}`,
                    background: selectedWeekday === day.value ? 'var(--primary)' : 'var(--bg-input)',
                    color: selectedWeekday === day.value ? 'var(--text-light)' : 'var(--text-main)',
                    borderRadius: 999,
                    padding: '7px 11px',
                    fontSize: 12,
                    fontWeight: 900,
                    cursor: 'pointer',
                  }}
                >
                  {day.label}
                </button>
              ))}
            </div>
            {/* compact schedule rows */}
            {visibleDaySlots.length === 0 ? (
              <p style={emptySummaryStyle}>週{selectedWeekdayLabel} 尚未設定可上課時段</p>
            ) : visibleDaySlots.map((slot) => (
              <button
                key={`${slot.weekday}-${slot.start}-${slot.end}`}
                type="button"
                onClick={() => toggleSlot(slot.weekday, { start: slot.start, end: slot.end })}
                style={{ ...courseRowStyle, width: '100%', border: '1px solid var(--border-main)', cursor: 'pointer', textAlign: 'left' }}
              >
                <strong>週{selectedWeekdayLabel}</strong>
                <span>{slot.start}-{slot.end} · 編輯時段</span>
              </button>
            ))}
          </div>
        </section>

        <div style={{ marginBottom: 18, padding: 14, borderRadius: 18, background: 'var(--bg-input)', color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.7, fontWeight: 700 }}>
          學生只能預約你開放且未被占用的時段；pending_payment 不等於正式排程，付款確認前請不要視為已保留正式課表。
        </div>

        <div style={{
          background: 'var(--bg-surface)',
          borderRadius: 28,
          boxShadow: 'var(--shadow-md)',
          border: '1px solid var(--border-main)',
          padding: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--primary)', fontWeight: 900, marginBottom: 12 }}>
            <CalendarDays size={16} />
            勾選式週課表
          </div>

          {usingLegacy && (
            <div style={{
              marginBottom: 14,
              padding: 14,
              borderRadius: 18,
              background: 'var(--primary-bg)',
              color: 'var(--primary)',
              fontSize: 13,
              fontWeight: 800,
            }}>
              目前顯示的是舊版 available_times 資料。按下儲存後，系統會轉存到正式固定時段表。
            </div>
          )}

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 720, borderCollapse: 'separate', borderSpacing: 6 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: 12, paddingBottom: 8 }}>時間</th>
                  {WEEKDAYS.map((day) => (
                    <th key={day.value} style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, paddingBottom: 8 }}>
                      {day.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SLOT_OPTIONS.map((slotOption) => (
                  <tr key={slotOption.key}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 800, paddingRight: 4 }}>{slotOption.label}</td>
                    {WEEKDAYS.map((day) => {
                      const selected = slotSet.has(`${day.value}-${slotOption.start}-${slotOption.end}`);
                      return (
                        <td key={`${day.value}-${slotOption.key}`}>
                          <button
                            type="button"
                            onClick={() => toggleSlot(day.value, slotOption)}
                            style={{
                              width: '100%',
                              minWidth: 68,
                              border: 'none',
                              borderRadius: 14,
                              padding: '12px 8px',
                              background: selected ? 'var(--primary)' : 'var(--bg-input)',
                              color: selected ? 'var(--text-light)' : 'var(--text-muted)',
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
            background: 'var(--bg-input)',
            color: 'var(--text-muted)',
            fontSize: 13,
            lineHeight: 1.7,
          }}>
            目前已選 {slots.length} 個 30 分鐘格位。
            這些時段會用來推算列表頁的「最快可約」、教練詳情頁的每週時段表，以及預約時可選時段。
          </div>
        </div>

        <div style={{
          background: 'var(--bg-surface)',
          borderRadius: 28,
          boxShadow: 'var(--shadow-md)',
          border: '1px solid var(--border-main)',
          padding: 20,
          marginTop: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-main)', fontWeight: 900, marginBottom: 12 }}>
            <CalendarDays size={16} color="var(--primary)" />
            單日例外時段
          </div>
          
          <p style={{ margin: '0 0 16px', color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6 }}>
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
                background: exceptionForm.exception_type === 'available' ? 'var(--success)' : 'var(--warning)',
                color: 'var(--text-light)',
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
              background: 'var(--bg-input)',
              color: 'var(--text-muted)',
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
                  border: '1px solid var(--border-main)',
                  borderRadius: 18,
                  padding: 14,
                  background: 'var(--bg-input)',
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{
                        padding: '3px 9px',
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 900,
                        color: exception.exception_type === 'available' ? 'var(--success)' : 'var(--warning)',
                        background: exception.exception_type === 'available' ? 'var(--success-bg)' : 'var(--warning-bg)',
                      }}>
                        {exception.exception_type === 'available' ? '臨時可約' : '不可約'}
                      </span>
                      <strong style={{ color: 'var(--text-main)', fontSize: 14 }}>
                        {exception.exception_date} {String(exception.start_time).slice(0, 5)}-{String(exception.end_time).slice(0, 5)}
                      </strong>
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                      {exception.reason || '未填寫備註'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteException(exception.id)}
                    style={{
                      border: 'none',
                      background: 'var(--danger-bg)',
                      color: 'var(--error)',
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

const summaryPanelStyle = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-main)',
  borderRadius: 22,
  padding: 16,
  boxShadow: 'var(--shadow-sm)',
};

const summaryPanelTitleStyle = {
  margin: '0 0 12px',
  color: 'var(--text-main)',
  fontSize: 15,
  fontWeight: 950,
};

const emptySummaryStyle = {
  margin: 0,
  color: 'var(--text-muted)',
  fontSize: 13,
  lineHeight: 1.6,
  fontWeight: 800,
};

const courseRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 10,
  marginBottom: 8,
  padding: 12,
  borderRadius: 14,
  background: 'var(--bg-input)',
  color: 'var(--text-main)',
  fontSize: 13,
  fontWeight: 800,
};

const fieldLabelStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  color: 'var(--text-muted)',
  fontSize: 12,
  fontWeight: 900,
};

const fieldInputStyle = {
  border: '1px solid var(--border-input)',
  background: 'var(--bg-input)',
  borderRadius: 12,
  padding: '11px 12px',
  color: 'var(--text-main)',
  fontSize: 13,
  outline: 'none',
  width: '100%',
};
