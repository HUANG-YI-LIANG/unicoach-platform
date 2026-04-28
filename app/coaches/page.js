'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CalendarDays, Clock3, FilterX, GraduationCap, MapPin, SlidersHorizontal, Star } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

const STORAGE_KEY = 'coach-search-filters-v1';
const LEVEL_OPTIONS = [
  { value: '', label: '全部等級' },
  { value: '1', label: '初階' },
  { value: '2', label: '進階' },
  { value: '3', label: '專業' },
];
const PRICE_OPTIONS = [
  { value: '', label: '不限價格' },
  { value: '1000', label: '1000 以下' },
  { value: '1500', label: '1500 以下' },
  { value: '2000', label: '2000 以下' },
];
const TIME_OPTIONS = Array.from({ length: 28 }, (_, index) => {
  const totalMinutes = (8 * 60) + (index * 30);
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const minutes = String(totalMinutes % 60).padStart(2, '0');
  return `${hours}:${minutes}`;
});

function getTodayDateString() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function addDays(dateString, offsetDays) {
  const [year, month, day] = dateString.split('-').map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day + offsetDays));
  return utcDate.toISOString().slice(0, 10);
}

function formatDateChip(dateString) {
  const date = new Date(`${dateString}T00:00:00+08:00`);
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).format(date);
}

function formatNextAvailable(value) {
  if (!value) {
    return '尚未設定固定時段';
  }

  const date = new Date(value);
  const parts = new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const month = parts.find((part) => part.type === 'month')?.value || '--';
  const day = parts.find((part) => part.type === 'day')?.value || '--';
  const hour = parts.find((part) => part.type === 'hour')?.value || '--';
  const minute = parts.find((part) => part.type === 'minute')?.value || '--';
  return `最快可約：${month}/${day} ${hour}:${minute}`;
}

function buildFiltersFromSearchParams(searchParams) {
  return {
    sport: searchParams.get('sport') || '',
    date: searchParams.get('date') || '',
    time: searchParams.get('time') || '',
    region: searchParams.get('region') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    level: searchParams.get('level') || '',
  };
}

export default function CoachesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [filters, setFilters] = useState({
    sport: '',
    date: '',
    time: '',
    region: '',
    maxPrice: '',
    level: '',
  });
  const [coaches, setCoaches] = useState([]);
  const [allSports, setAllSports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [mobileSections, setMobileSections] = useState({
    sport: false,
    availability: false,
    region: false,
    price: false,
    level: false,
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const upcomingDates = useMemo(() => {
    const today = getTodayDateString();
    return Array.from({ length: 7 }, (_, index) => addDays(today, index));
  }, []);

  const availableTimeSet = useMemo(() => {
    if (!filters.date) {
      return new Set();
    }

    return new Set(
      coaches.flatMap((coach) => coach.available_time_options || [])
    );
  }, [coaches, filters.date]);

  useEffect(() => {
    const queryFilters = buildFiltersFromSearchParams(searchParams);
    const hasQueryFilters = Object.values(queryFilters).some(Boolean);

    if (hasQueryFilters) {
      setFilters(queryFilters);
      setInitialized(true);
      return;
    }

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setFilters({
          sport: parsed.sport || '',
          date: parsed.date || '',
          time: parsed.time || '',
          region: parsed.region || '',
          maxPrice: parsed.maxPrice || '',
          level: parsed.level || '',
        });
      }
    } catch (error) {
      console.error('Failed to read coach filters:', error);
    } finally {
      setInitialized(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!initialized) {
      return;
    }

    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });

    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(nextUrl, { scroll: false });

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch (error) {
      console.error('Failed to persist coach filters:', error);
    }
  }, [filters, initialized, pathname, router]);

  useEffect(() => {
    if (!initialized) {
      return;
    }

    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });

    setLoading(true);
    fetch(`/api/coaches?${params.toString()}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load coaches');
        }
        setCoaches(data.coaches || []);
        if (data.allSports) {
          setAllSports(data.allSports);
        }
      })
      .catch((error) => {
        console.error('Fetch coaches error:', error);
        setCoaches([]);
      })
      .finally(() => setLoading(false));
  }, [filters, initialized]);

  function requireSignedInForAvailability() {
    if (authLoading) {
      return false;
    }

    return redirectToLoginIfNeeded(filters);
  }

  function redirectToLoginIfNeeded(nextFilters) {
    if (user) {
      return true;
    }

    const nextPath = `${pathname}?${new URLSearchParams(nextFilters).toString()}`;
    router.push(`/login?redirect=${encodeURIComponent(nextPath)}`);
    return false;
  }

  function updateFilter(key, value) {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleDateSelect(dateString) {
    if (!requireSignedInForAvailability()) {
      return;
    }

    setFilters((current) => ({
      ...current,
      date: current.date === dateString ? '' : dateString,
      time: current.date === dateString ? '' : current.time,
    }));
  }

  function handleTimeSelect(timeValue) {
    if (!requireSignedInForAvailability()) {
      return;
    }

    if (!filters.date) {
      return;
    }

    setFilters((current) => ({
      ...current,
      time: current.time === timeValue ? '' : timeValue,
    }));
  }

  function clearAllFilters() {
    setFilters({
      sport: '',
      date: '',
      time: '',
      region: '',
      maxPrice: '',
      level: '',
    });
  }

  function syncFromFastest(coach) {
    if (!coach?.next_available_date || !coach?.next_available_time) {
      return;
    }

    const nextFilters = {
      ...filters,
      date: coach.next_available_date,
      time: coach.next_available_time,
    };

    if (!redirectToLoginIfNeeded(nextFilters)) {
      return;
    }

    setFilters(nextFilters);
  }

  function toggleMobileSection(key) {
    setMobileSections((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  return (
    <div className="coach-page">
      <style dangerouslySetInnerHTML={{ __html: `
        .coach-page {
          min-height: 100vh;
          background:
            radial-gradient(circle at top left, rgba(14, 165, 233, 0.14), transparent 32%),
            linear-gradient(180deg, #f7fbff 0%, #eef4ff 100%);
          color: #0f172a;
          padding-bottom: 96px;
        }
        .coach-shell {
          width: min(1120px, calc(100vw - 24px));
          margin: 0 auto;
          padding: 20px 0 40px;
        }
        .hero {
          padding: 8px 0 20px;
        }
        .eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.8);
          color: #1d4ed8;
          font-weight: 800;
          font-size: 12px;
          border: 1px solid rgba(37, 99, 235, 0.12);
        }
        .hero h1 {
          margin: 16px 0 8px;
          font-size: clamp(28px, 5vw, 44px);
          line-height: 1.05;
          font-weight: 900;
          letter-spacing: -0.04em;
        }
        .hero p {
          margin: 0;
          color: #475569;
          font-size: 15px;
          max-width: 720px;
        }
        .filter-panel {
          background: rgba(255, 255, 255, 0.84);
          border: 1px solid rgba(148, 163, 184, 0.2);
          box-shadow: 0 24px 60px rgba(15, 23, 42, 0.08);
          border-radius: 28px;
          padding: 20px;
          backdrop-filter: blur(16px);
          position: sticky;
          top: 12px;
          z-index: 20;
        }
        .filter-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }
        .filter-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 15px;
          font-weight: 900;
        }
        .clear-btn {
          border: none;
          background: transparent;
          color: #2563eb;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
        }
        .filters-grid {
          display: grid;
          grid-template-columns: 1.7fr 1fr 1fr 1fr;
          gap: 14px;
        }
        .filter-group {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 14px;
        }
        .filter-group-title {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          font-size: 13px;
          font-weight: 900;
        }
        .filter-helper {
          color: #64748b;
          font-size: 12px;
          margin-bottom: 12px;
        }
        .section-toggle {
          display: none;
          border: none;
          background: transparent;
          color: #2563eb;
          font-weight: 800;
          cursor: pointer;
        }
        .date-row, .time-row {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          scrollbar-width: none;
          padding-bottom: 4px;
        }
        .date-row::-webkit-scrollbar, .time-row::-webkit-scrollbar {
          display: none;
        }
        .date-btn, .time-btn {
          border: 1px solid #dbeafe;
          background: #ffffff;
          color: #1e3a8a;
          border-radius: 14px;
          padding: 10px 12px;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
          cursor: pointer;
        }
        .date-btn.active, .time-btn.active {
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: #ffffff;
          border-color: transparent;
        }
        .time-btn.disabled {
          background: #e2e8f0;
          color: #94a3b8;
          border-color: transparent;
          cursor: not-allowed;
          position: relative;
        }
        .time-btn.disabled::after {
          content: attr(data-status);
          margin-left: 6px;
          font-size: 11px;
        }
        .time-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .field, .select {
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 14px;
          padding: 12px 14px;
          background: #ffffff;
          font-size: 14px;
          outline: none;
        }
        .results-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 18px 0 14px;
          color: #475569;
          font-size: 14px;
        }
        .card-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 16px;
        }
        .coach-card {
          background: rgba(255, 255, 255, 0.94);
          border: 1px solid rgba(148, 163, 184, 0.18);
          border-radius: 26px;
          padding: 18px;
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.06);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .coach-card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }
        .level-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 900;
        }
        .coach-header {
          display: flex;
          gap: 14px;
          cursor: pointer;
        }
        .avatar {
          width: 56px;
          height: 56px;
          border-radius: 18px;
          background: linear-gradient(135deg, #0f172a, #2563eb);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          font-weight: 900;
          flex-shrink: 0;
        }
        .coach-name {
          margin: 0;
          font-size: 20px;
          font-weight: 900;
        }
        .coach-meta {
          margin-top: 4px;
          color: #64748b;
          font-size: 13px;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .fastest-slot {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 18px;
          padding: 12px 14px;
        }
        .fastest-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 900;
          color: #1d4ed8;
        }
        .fastest-button {
          border: none;
          background: transparent;
          color: #0f172a;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
          text-align: left;
          padding: 0;
        }
        .stats-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }
        .stat-box {
          border-radius: 18px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 12px;
        }
        .stat-label {
          color: #64748b;
          font-size: 12px;
          margin-bottom: 8px;
        }
        .stat-value {
          font-size: 16px;
          font-weight: 900;
        }
        .schedule-flag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 10px;
          border-radius: 999px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          color: #334155;
          font-size: 12px;
          font-weight: 800;
        }
        .card-actions {
          display: flex;
          gap: 10px;
        }
        .ghost-btn, .primary-btn {
          flex: 1;
          border: none;
          border-radius: 16px;
          padding: 14px;
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
        }
        .ghost-btn {
          background: #e2e8f0;
          color: #0f172a;
        }
        .primary-btn {
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: #ffffff;
        }
        .empty-state, .loading-state {
          padding: 60px 20px;
          text-align: center;
          color: #64748b;
          background: rgba(255,255,255,0.8);
          border-radius: 24px;
          border: 1px solid rgba(148, 163, 184, 0.18);
        }
        @media (max-width: 900px) {
          .filters-grid {
            grid-template-columns: 1fr;
          }
          .section-toggle {
            display: inline-flex;
          }
          .filter-group.mobile-collapsed .mobile-content {
            display: none;
          }
        }
        @media (max-width: 640px) {
          .coach-shell {
            width: calc(100vw - 16px);
          }
          .filter-panel {
            border-radius: 24px;
            padding: 16px;
          }
          .card-grid {
            grid-template-columns: 1fr;
          }
          .stats-row {
            grid-template-columns: 1fr;
          }
          .card-actions {
            flex-direction: column;
          }
        }
      ` }} />

      <div className="coach-shell">
        
        <section className="hero">
          <div className="eyebrow">
            <CalendarDays size={14} />
            尋找理想教練
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ flex: '1 1 300px' }}>
              <h1 style={{ margin: '0 0 12px', fontSize: '28px' }}>探索專屬您的教練</h1>
              <p style={{ margin: 0, color: '#64748b', fontSize: '16px', lineHeight: 1.5 }}>
                預設顯示所有優質教練，您也可以透過點擊右側按鈕展開篩選，依據時段、地區與價格快速縮小範圍。
              </p>
            </div>
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px',
                background: isFilterOpen ? '#EFF6FF' : '#2563EB',
                color: isFilterOpen ? '#2563EB' : '#FFFFFF',
                border: 'none', borderRadius: 24, fontSize: 16, fontWeight: 800,
                cursor: 'pointer', transition: 'all 0.2s ease',
                boxShadow: isFilterOpen ? 'none' : '0 4px 12px rgba(37,99,235,0.3)',
                whiteSpace: 'nowrap'
              }}
            >
              <SlidersHorizontal size={18} />
              {isFilterOpen ? '收起篩選' : '篩選教練'}
            </button>
          </div>
        </section>

        {isFilterOpen && (
          <section className="filter-panel" style={{ marginTop: 24, animation: 'fadeIn 0.3s ease-out' }}>
          <div className="filter-header">
            <div className="filter-title">
              <SlidersHorizontal size={16} />
              主篩選區
            </div>
            <button type="button" className="clear-btn" onClick={clearAllFilters}>
              <FilterX size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              清除所有篩選
            </button>
          </div>

          <div className="filters-grid">
            <div className={`filter-group ${mobileSections.sport ? '' : 'mobile-collapsed'}`}>
              <div className="filter-group-title">
                <span>運動項目</span>
                <button type="button" className="section-toggle" onClick={() => toggleMobileSection('sport')}>
                  {mobileSections.sport ? '收合' : '展開'}
                </button>
              </div>
              <div className="mobile-content">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {allSports.map((sport) => (
                    <button
                      key={sport}
                      type="button"
                      className={`time-btn ${filters.sport === sport ? 'active' : ''}`}
                      onClick={() => updateFilter('sport', filters.sport === sport ? '' : sport)}
                      style={{ padding: '6px 12px', width: 'auto', borderRadius: '16px' }}
                    >
                      {sport}
                    </button>
                  ))}
                  {allSports.length === 0 && (
                    <div style={{ fontSize: 13, color: '#94a3b8' }}>目前沒有可用運動項目</div>
                  )}
                </div>
              </div>
            </div>

            <div className={`filter-group ${mobileSections.availability ? '' : 'mobile-collapsed'}`}>
              <div className="filter-group-title">
                <span>可預約時段</span>
                <button type="button" className="section-toggle" onClick={() => toggleMobileSection('availability')}>
                  {mobileSections.availability ? '收合' : '展開'}
                </button>
              </div>
              <div className="mobile-content">
                <div className="filter-helper">先選日期，再選時間。未來 7 天內不可約時段也會顯示。</div>
                <div className="date-row">
                  {upcomingDates.map((dateString) => (
                    <button
                      key={dateString}
                      type="button"
                      className={`date-btn ${filters.date === dateString ? 'active' : ''}`}
                      onClick={() => handleDateSelect(dateString)}
                    >
                      {formatDateChip(dateString)}
                    </button>
                  ))}
                </div>
                <div style={{ height: 12 }} />
                {!filters.date ? (
                  <div style={{ color: '#64748b', fontSize: 13, padding: '12px', background: '#f8fafc', borderRadius: 12, textAlign: 'center' }}>
                    請先選擇上方日期，以查看可預約的時間。
                  </div>
                ) : (
                  <div className="time-grid">
                    {TIME_OPTIONS.filter((timeValue) => availableTimeSet.has(timeValue)).length > 0 ? (
                      TIME_OPTIONS.filter((timeValue) => availableTimeSet.has(timeValue)).map((timeValue) => (
                        <button
                          key={timeValue}
                          type="button"
                          className={`time-btn ${filters.time === timeValue ? 'active' : ''}`}
                          onClick={() => handleTimeSelect(timeValue)}
                        >
                          {timeValue}
                        </button>
                      ))
                    ) : (
                      <div style={{ color: '#64748b', fontSize: 13, padding: '12px', width: '100%', textAlign: 'center' }}>
                        該日期目前沒有可預約的時段。
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className={`filter-group ${mobileSections.region ? '' : 'mobile-collapsed'}`}>
              <div className="filter-group-title">
                <span>想上課的地區</span>
                <button type="button" className="section-toggle" onClick={() => toggleMobileSection('region')}>
                  {mobileSections.region ? '收合' : '展開'}
                </button>
              </div>
              <div className="mobile-content">
                <input
                  className="field"
                  placeholder="例如：台北、大安、新北"
                  value={filters.region}
                  onChange={(event) => updateFilter('region', event.target.value)}
                />
              </div>
            </div>

            <div className={`filter-group ${mobileSections.price ? '' : 'mobile-collapsed'}`}>
              <div className="filter-group-title">
                <span>價格區間</span>
                <button type="button" className="section-toggle" onClick={() => toggleMobileSection('price')}>
                  {mobileSections.price ? '收合' : '展開'}
                </button>
              </div>
              <div className="mobile-content">
                <select className="select" value={filters.maxPrice} onChange={(event) => updateFilter('maxPrice', event.target.value)}>
                  {PRICE_OPTIONS.map((option) => (
                    <option key={option.value || 'all'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={`filter-group ${mobileSections.level ? '' : 'mobile-collapsed'}`}>
              <div className="filter-group-title">
                <span>教練等級</span>
                <button type="button" className="section-toggle" onClick={() => toggleMobileSection('level')}>
                  {mobileSections.level ? '收合' : '展開'}
                </button>
              </div>
              <div className="mobile-content">
                <select className="select" value={filters.level} onChange={(event) => updateFilter('level', event.target.value)}>
                  {LEVEL_OPTIONS.map((option) => (
                    <option key={option.value || 'all'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>
        )}

        <div className="results-bar">
          <div>共找到 {coaches.length} 位教練</div>
          <div>排序：時段匹配優先，其次固定時段與等級加權</div>
        </div>

        {loading ? (
          <div className="loading-state">載入教練資料中...</div>
        ) : coaches.length === 0 ? (
          <div className="empty-state">目前沒有符合這組條件的教練，可以調整日期、時間或其他篩選。</div>
        ) : (
          <div className="card-grid">
            {coaches.map((coach) => {
              const levelColors = {
                beginner: { background: '#dbeafe', color: '#1d4ed8' },
                advanced: { background: '#dcfce7', color: '#15803d' },
                professional: { background: '#fef3c7', color: '#b45309' },
              };
              const badgeStyle = levelColors[coach.coach_level] || levelColors.beginner;

              return (
                <article key={coach.id} className="coach-card">
                  {/* 【頂部信任區】 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#1E3A8A', background: '#DBEAFE', padding: '4px 8px', borderRadius: 100 }}>
                          {coach.coach_level_label}
                        </div>
                        <div style={{ fontSize: 13, color: '#f59e0b', fontWeight: 900, background: '#FEF3C7', padding: '4px 8px', borderRadius: 100 }}>
                          ⭐ {coach.rating_avg || 0} ({coach.review_count || 0})
                        </div>
                      </div>
                      <div style={{ color: '#2563EB', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4, background: '#EFF6FF', padding: '4px 8px', borderRadius: 100 }}>
                        <Video size={14} />
                        30秒快速認識教練
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#059669', background: '#D1FAE5', padding: '2px 6px', borderRadius: 4 }}>✅ 平台審核通過</span>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#059669', background: '#D1FAE5', padding: '2px 6px', borderRadius: 4 }}>✅ 已驗證身分證</span>
                    </div>
                  </div>

                  {/* 【核心成交區】 */}
                  <div className="coach-header" style={{ marginTop: 8, alignItems: 'flex-start' }} onClick={() => router.push(`/coaches/${coach.id}`)}>
                    <div className="avatar" style={{ width: 64, height: 64, fontSize: 26, borderRadius: 20 }}>{coach.name?.slice(0, 1) || '教'}</div>
                    <div style={{ flex: 1 }}>
                      <h2 className="coach-name" style={{ fontSize: 22 }}>{coach.name}</h2>
                      
                      {/* 教學項目 (Badge 化) */}
                      {(() => {
                        const sports = (coach.service_areas || '').split(/[、，\s]+/).filter(Boolean);
                        if (sports.length === 0) return null;
                        const mainSport = sports[0];
                        const sparringSports = sports.slice(1);
                        return (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                            <span style={{ background: '#1E3A8A', color: '#fff', fontSize: 12, fontWeight: 800, padding: '4px 8px', borderRadius: 6 }}>
                              主教：{getSportEmoji(mainSport)} {mainSport}
                            </span>
                            {sparringSports.length > 0 && (
                              <span style={{ background: '#F1F5F9', color: '#475569', fontSize: 12, fontWeight: 700, padding: '4px 8px', borderRadius: 6 }}>
                                可陪練：{sparringSports.map(s => `${getSportEmoji(s)} ${s}`).join(' 、')}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                      
                      {/* 一句話定位 */}
                      {(coach.philosophy || coach.experience) && (
                        <div style={{ marginTop: 8, fontSize: 14, fontWeight: 800, color: '#334155' }}>
                          {coach.philosophy ? coach.philosophy.slice(0, 20) : coach.experience?.slice(0, 20)}
                          {(coach.philosophy || coach.experience).length > 20 ? '...' : ''}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 【地區與焦慮區】 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                    <div style={{ color: '#64748b', fontSize: 13, fontWeight: 600, display: 'flex', gap: 6, alignItems: 'center', padding: '0 4px' }}>
                      <MapPin size={14} />
                      {coach.location || '未填地區'} {coach.service_areas?.includes('到府') ? '(可到府)' : ''}
                      {coach.university && (
                        <>
                          <span style={{ color: '#cbd5e1' }}>|</span>
                          <span>{coach.university}</span>
                        </>
                      )}
                    </div>
                    <div className="fastest-slot" style={{ padding: '10px 14px' }}>
                      <div className="fastest-label">
                        <Clock3 size={16} />
                        最近可約時間
                      </div>
                      <button type="button" className="fastest-button" onClick={() => syncFromFastest(coach)}>
                        {formatNextAvailable(coach.next_available_at)}
                      </button>
                    </div>
                    {coach.booked_slot_count > 0 ? (
                      <div style={{ color: '#E11D48', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6, background: '#FFF1F2', padding: '6px 12px', borderRadius: 12 }}>
                        🔥 最近已被預約 {coach.booked_slot_count} 次
                      </div>
                    ) : (
                      <div style={{ color: '#166534', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6, background: '#F0FDF4', padding: '6px 12px', borderRadius: 12 }}>
                        ✨ 本週還有時段可約
                      </div>
                    )}
                  </div>

                  {/* 【結果展示區】 */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8, marginTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px 16px', borderRadius: 16 }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: 13, color: '#64748b', fontWeight: 800 }}>體驗課</span>
                        {/* 暫時移除訂金文案，但保留位置與高度 */}
                        <span style={{ fontSize: 12, minHeight: 18 }}></span>
                      </div>
                      <span style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>NT${Number(coach.min_price || 1000).toLocaleString()}</span>
                    </div>
                    
                    <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '12px 16px', borderRadius: 16 }}>
                      <div style={{ fontSize: 12, color: '#166534', fontWeight: 900, marginBottom: 4 }}>🎯 最近學員成果</div>
                      <div style={{ fontSize: 14, color: '#15803D', fontWeight: 700, lineHeight: 1.4 }}>
                        {coach.experience ? 
                          (coach.experience.length > 30 ? coach.experience.slice(0, 30) + '...' : coach.experience) 
                          : '持續陪伴初學者建立信心與基礎能力'}
                      </div>
                    </div>
                  </div>

                  {/* 【CTA 區】 */}
                  <div className="card-actions" style={{ marginTop: 12 }}>
                    <button type="button" className="ghost-btn" style={{ flex: 1 }} onClick={() => {
                      const params = new URLSearchParams(filters);
                      router.push(`/coaches/${coach.id}?${params.toString()}`);
                    }}>
                      👉 先看看教練
                    </button>
                    <button type="button" className="primary-btn" style={{ flex: 1.8, background: '#F59E0B', color: '#fff', boxShadow: '0 8px 20px rgba(245,158,11,0.3)' }} onClick={() => {
                      const params = new URLSearchParams(filters);
                      router.push(`/coaches/${coach.id}?${params.toString()}`);
                    }}>
                      👉 預約體驗課
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
