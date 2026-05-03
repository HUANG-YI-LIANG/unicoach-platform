'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CalendarDays, Clock3, FilterX, GraduationCap, MapPin, SlidersHorizontal, Star, Video } from 'lucide-react';
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
  return `${month}/${day} ${hour}:${minute}`;
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

function getSportEmoji(sport) {
  const value = String(sport || '').toLowerCase();

  if (value.includes('籃')) return '🏀';
  if (value.includes('棒')) return '⚾';
  if (value.includes('羽')) return '🏸';
  if (value.includes('網')) return '🎾';
  if (value.includes('桌')) return '🏓';
  if (value.includes('排')) return '🏐';
  if (value.includes('足') || value.includes('soccer')) return '⚽';
  if (value.includes('游')) return '🏊';
  if (value.includes('跑') || value.includes('田徑')) return '🏃';
  if (value.includes('健身') || value.includes('重訓')) return '🏋️';

  return '🎯';
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
          background: #0B1120;
          color: #F8FAFC;
          padding-bottom: 96px;
        }
        .coach-shell {
          width: min(1120px, calc(100vw - 24px));
          margin: 0 auto;
          padding: 16px 0 32px;
        }
        .hero {
          padding: 0 0 16px;
        }
        .hero h1 {
          margin: 0 0 4px;
          font-size: 22px;
          line-height: 1.2;
          font-weight: 900;
          color: #FFFFFF;
        }
        .hero p {
          margin: 0;
          color: #94A3B8;
          font-size: 13px;
        }
        .filter-panel {
          background: rgba(30, 41, 59, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 16px;
          position: sticky;
          top: 12px;
          z-index: 20;
        }
        .filter-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }
        .filter-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 900;
          color: #FFFFFF;
        }
        .clear-btn {
          border: none;
          background: transparent;
          color: #94A3B8;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }
        .filters-grid {
          display: grid;
          grid-template-columns: 1.7fr 1fr 1fr 1fr;
          gap: 12px;
        }
        .filter-group {
          background: rgba(15, 23, 42, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 12px;
        }
        .filter-group-title {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          font-size: 12px;
          font-weight: 800;
          color: #CBD5E1;
        }
        .filter-helper {
          color: #64748B;
          font-size: 11px;
          margin-bottom: 8px;
        }
        .section-toggle {
          display: none;
          border: none;
          background: transparent;
          color: #38BDF8;
          font-weight: 800;
          font-size: 12px;
          cursor: pointer;
        }
        .date-row, .time-row {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          scrollbar-width: none;
          padding-bottom: 4px;
        }
        .date-row::-webkit-scrollbar, .time-row::-webkit-scrollbar {
          display: none;
        }
        .date-btn, .time-btn {
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.05);
          color: #F1F5F9;
          border-radius: 8px;
          padding: 8px 10px;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
          cursor: pointer;
        }
        .date-btn.active, .time-btn.active {
          background: #38BDF8;
          color: #0F172A;
          border-color: #38BDF8;
        }
        .time-btn.disabled {
          background: rgba(255, 255, 255, 0.02);
          color: #475569;
          border-color: transparent;
          cursor: not-allowed;
        }
        .time-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .field, .select {
          width: 100%;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 8px 10px;
          background: rgba(15, 23, 42, 0.5);
          color: #F8FAFC;
          font-size: 13px;
          outline: none;
        }
        .results-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 12px 0;
          color: #94A3B8;
          font-size: 12px;
          font-weight: 700;
        }
        .card-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 12px;
        }
        .coach-card {
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 16px;
          backdrop-filter: blur(10px);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .avatar {
          width: 56px;
          height: 56px;
          border-radius: 12px;
          background: rgba(56, 189, 248, 0.1);
          color: #38BDF8;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: 900;
          flex-shrink: 0;
        }
        .card-actions {
          display: flex;
          gap: 8px;
        }
        .ghost-btn, .primary-btn {
          flex: 1;
          border: none;
          border-radius: 8px;
          padding: 10px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
        }
        .ghost-btn {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #E2E8F0;
        }
        .primary-btn {
          background: #F59E0B;
          color: #FFFFFF;
        }
        .empty-state, .loading-state {
          padding: 40px 20px;
          text-align: center;
          color: #94A3B8;
          background: rgba(30, 41, 59, 0.5);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          font-size: 13px;
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
            width: calc(100vw - 24px);
          }
          .filter-panel {
            border-radius: 16px;
            padding: 12px;
          }
          .card-grid {
            grid-template-columns: 1fr;
          }
        }
      ` }} />

      <div className="coach-shell">
        
        <section className="hero">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ flex: '1 1 240px' }}>
              <h1>找適合你的教練</h1>
              <p>依照地區、時段與教學項目，快速找到可預約的教練。</p>
            </div>
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                background: isFilterOpen ? '#38BDF8' : 'rgba(255, 255, 255, 0.05)',
                color: isFilterOpen ? '#0F172A' : '#38BDF8',
                border: '1px solid #38BDF8', borderRadius: 8, fontSize: 13, fontWeight: 700,
                cursor: 'pointer', whiteSpace: 'nowrap'
              }}
            >
              <SlidersHorizontal size={14} />
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
                  <div style={{ color: '#94a3b8', fontSize: 13, padding: '12px', background: 'rgba(15, 23, 42, 0.5)', borderRadius: 12, textAlign: 'center' }}>
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
                      <div style={{ color: '#94a3b8', fontSize: 13, padding: '12px', width: '100%', textAlign: 'center' }}>
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
          <div>排序：最快可約優先</div>
        </div>

        {loading ? (
          <div className="loading-state">載入教練資料中...</div>
        ) : coaches.length === 0 ? (
          <div className="empty-state">目前沒有符合條件的教練，請嘗試調整篩選條件。</div>
        ) : (
          <div className="card-grid">
            {coaches.map((coach) => (
              <article key={coach.id} className="coach-card">
                {/* 1. 狀態與評價 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '11px', fontWeight: 800 }}>
                  <span style={{ color: '#38BDF8', background: 'rgba(56, 189, 248, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                    {coach.coach_level_label || '初階教練'}
                  </span>
                  {coach.rating_avg > 0 ? (
                    <span style={{ color: '#F59E0B' }}>⭐ {coach.rating_avg} ({coach.review_count})</span>
                  ) : (
                    <span style={{ color: '#94A3B8' }}>新教練</span>
                  )}
                  <span style={{ color: '#4ADE80', background: 'rgba(74, 222, 128, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                    已驗證
                  </span>
                </div>

                {/* 2. 頭像、姓名、一句話定位 */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', cursor: 'pointer' }} onClick={() => router.push(`/coaches/${coach.id}`)}>
                  <div className="avatar">
                    {coach.name?.slice(0, 1) || '教'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#F8FAFC' }}>{coach.name}</h2>
                      {coach.has_video && (
                        <span style={{ color: '#38BDF8', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '2px', fontWeight: 700 }}>
                          <Video size={12}/> 看30秒介紹
                        </span>
                      )}
                    </div>
                    {(coach.philosophy || coach.experience) && (
                      <div style={{ color: '#94A3B8', fontSize: '12px', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {coach.philosophy || coach.experience}
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. 主教項目與地區 */}
                <div style={{ display: 'flex', gap: '6px', fontSize: '12px', color: '#94A3B8', flexWrap: 'wrap', alignItems: 'center' }}>
                  {(() => {
                    const sports = (coach.service_areas || '').split(/[、，\s]+/).filter(Boolean);
                    if (sports.length === 0) return null;
                    return (
                      <span style={{ fontWeight: 800, color: '#38BDF8' }}>主教：{getSportEmoji(sports[0])} {sports[0]}</span>
                    );
                  })()}
                  <span style={{ color: '#64748B' }}>|</span>
                  <span>地區：{coach.location || '未填寫'}</span>
                  {(() => {
                    const sports = (coach.service_areas || '').split(/[、，\s]+/).filter(Boolean);
                    const sparringSports = sports.slice(1);
                    if (sparringSports.length > 0) {
                      return (
                        <>
                          <span style={{ color: '#64748B' }}>|</span>
                          <span>可陪練：{sparringSports.join('、')}</span>
                        </>
                      );
                    }
                    return null;
                  })()}
                </div>

                {/* 4. 時間與價格 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15, 23, 42, 0.5)', padding: '10px 12px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ color: '#38BDF8', fontSize: '13px', fontWeight: 800 }}>
                      {coach.next_available_at ? formatNextAvailable(coach.next_available_at) : '可先聊聊確認時間'}
                    </span>
                    {coach.booked_slot_count > 0 ? (
                      <span style={{ color: '#EF4444', fontSize: '11px', fontWeight: 800 }}>🔥 最近被預約 {coach.booked_slot_count} 次</span>
                    ) : (
                      <span style={{ color: '#4ADE80', fontSize: '11px', fontWeight: 700 }}>本週還有時段可約</span>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 900, color: '#F8FAFC', fontSize: '14px' }}>體驗課 NT${Number(coach.min_price || 1000).toLocaleString()}</div>
                    <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>訂金 NT$300</div>
                  </div>
                </div>

                {/* 5. 成果 / 風格 */}
                <div style={{ fontSize: '12px', color: '#4ADE80', fontWeight: 800 }}>
                  🎯 {coach.experience ? `學員成果：${coach.experience.length > 20 ? coach.experience.slice(0, 20) + '...' : coach.experience}` : '教學風格：耐心陪練、適合初學者'}
                </div>

                {/* 6. 按鈕 */}
                <div className="card-actions">
                  <button type="button" className="ghost-btn" onClick={() => {
                    const params = new URLSearchParams(filters);
                    router.push(`/coaches/${coach.id}?${params.toString()}`);
                  }}>
                    看教練資料
                  </button>
                  <button type="button" className="primary-btn" onClick={() => {
                    const params = new URLSearchParams(filters);
                    router.push(`/coaches/${coach.id}?${params.toString()}`);
                  }}>
                    預約體驗課
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
