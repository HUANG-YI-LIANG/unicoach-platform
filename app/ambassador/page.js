'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import {
  Wallet,
  Clock,
  Users,
  TrendingUp,
  UserPlus,
  CheckCircle2,
  QrCode,
  Download,
  ChevronRight,
  LogOut,
  Gem,
  Hexagon,
  X,
  Home,
  Search,
  ClipboardList,
  User,
  Copy,
  ExternalLink,
  ArrowUpRight,
  ShieldCheck,
  Crown,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

const DASHBOARD_ENDPOINT = '/api/ambassador/dashboard';

function formatMoney(amount) {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    minimumFractionDigits: 0,
  }).format(Number(amount || 0));
}

function formatActivityTime(value) {
  if (!value) return '剛剛';

  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return '剛剛';

  const diffMs = Date.now() - timestamp;
  const minutes = Math.max(0, Math.floor(diffMs / 60000));

  if (minutes < 1) return '剛剛';
  if (minutes < 60) return `${minutes} 分鐘前`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小時前`;

  return new Intl.DateTimeFormat('zh-TW', {
    month: '2-digit',
    day: '2-digit',
  }).format(timestamp);
}

function normalizeDashboardData(payload) {
  const data = payload?.data || payload || {};
  const profile = data.profile || {};
  const financials = data.financials || {};
  const stats = data.stats || {};

  return {
    profile: {
      code: profile.code || '—',
      status: profile.status || 'inactive',
      levelName: profile.levelName || 'Bronze',
      commissionRate: Number(profile.commissionRate || 0),
    },
    financials: {
      totalEarnings: Number(financials.totalEarnings || 0),
      pendingEarnings: Number(financials.pendingEarnings || 0),
      availableEarnings: Number(financials.availableEarnings || 0),
      thisMonthEarnings: Number(financials.thisMonthEarnings || 0),
    },
    stats: {
      studentCount: Number(stats.studentCount || 0),
      coachCount: Number(stats.coachCount || 0),
      completedClassesCount: Number(stats.completedClassesCount || 0),
      conversionRate: Number(stats.conversionRate || 0),
      todaySignups: Number(stats.todaySignups ?? (Number(stats.todaySignupsStudent || 0) + Number(stats.todaySignupsCoach || 0))),
      todayCompletedClasses: Number(stats.todayCompletedClasses || 0),
    },
    levels: Array.isArray(data.levels) ? data.levels : [],
    recentEarnings: Array.isArray(data.recentEarnings) ? data.recentEarnings : [],
  };
}

function MobileShell({ children }) {
  return (
    <div className="ambassador-shell">
      <div className="ambassador-frame">{children}</div>
    </div>
  );
}

function UniCoachMark() {
  return (
    <div className="ambassador-logo" aria-label="UniCoach Ambassador">
      <div className="ambassador-logo__mark">U</div>
      <span>UniCoach</span>
    </div>
  );
}

function PageHeader() {
  const router = useRouter();

  return (
    <header className="ambassador-header">
      <div className="ambassador-header__inner">
        <UniCoachMark />
        <button type="button" onClick={() => router.push('/dashboard/user')} className="ambassador-return-button">
          <LogOut className="ambassador-icon ambassador-icon--sm" />
          返回平台
        </button>
      </div>
    </header>
  );
}

function HeroCard({ data }) {
  const { profile, financials } = data;

  return (
    <section className="ambassador-hero" aria-labelledby="ambassador-hero-title">
      <div className="ambassador-hero__light ambassador-hero__light--one" aria-hidden="true" />
      <div className="ambassador-hero__light ambassador-hero__light--two" aria-hidden="true" />

      <div className="ambassador-hero__topline">
        <div>
          <p className="ambassador-overline">當前等級</p>
          <h1 id="ambassador-hero-title" className="ambassador-hero__title">
            {profile.levelName}
            <span>Ambassador</span>
          </h1>
        </div>

        <div className="ambassador-diamond-badge" aria-hidden="true">
          <Gem className="ambassador-icon ambassador-icon--xl" strokeWidth={2.15} />
        </div>
      </div>

      <div className="ambassador-hero__middle">
        <div className="ambassador-hero__pill">
          <Crown className="ambassador-icon ambassador-icon--xs" />
          <span>分潤比例</span>
          <strong>{profile.commissionRate}%</strong>
        </div>
      </div>

      <div className="ambassador-hero__earnings">
        <p>本月累計收益</p>
        <strong>{formatMoney(financials.thisMonthEarnings)}</strong>
      </div>

      <div className="ambassador-hero__footer">
        <div className="ambassador-hero__hint">
          <ShieldCheck className="ambassador-icon ambassador-icon--sm" />
          <span>完成課程後收益才會入帳</span>
        </div>
        <ArrowUpRight className="ambassador-icon ambassador-icon--sm ambassador-hero__arrow" />
      </div>
    </section>
  );
}

function ReferralToolCard({ data }) {
  const { profile } = data;
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [downloadingQR, setDownloadingQR] = useState(false);
  const [referralOrigin, setReferralOrigin] = useState('https://unicoach.app');
  const referralLink = `${referralOrigin}/register?ref=${profile.code}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(referralLink)}&bgcolor=ffffff&color=000000`;

  useEffect(() => {
    setReferralOrigin(window.location.origin);
  }, []);

  const handleCopy = async (text, setter) => {
    try {
      await navigator.clipboard.writeText(text);
      setter(true);
      setTimeout(() => setter(false), 2000);
    } catch {
      setter(false);
    }
  };

  const handleDownloadQR = async () => {
    try {
      setDownloadingQR(true);
      const response = await fetch(qrCodeUrl);
      if (!response.ok) throw new Error('QR Code download failed');

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = 'unicoach-ambassador-qr.png';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(qrCodeUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setDownloadingQR(false);
    }
  };

  return (
    <section className="ambassador-card ambassador-referral-card" aria-labelledby="referral-tools-title">
      <div className="ambassador-section-heading">
        <div>
          <p>Creator toolkit</p>
          <h2 id="referral-tools-title">推廣工具</h2>
        </div>
        <span>專屬</span>
      </div>

      <div className="ambassador-tool-stack">
        <div className="ambassador-copy-panel ambassador-copy-panel--code">
          <div className="ambassador-copy-panel__label">
            <Sparkles className="ambassador-icon ambassador-icon--xs" />
            推廣碼
          </div>
          <div className="ambassador-copy-row">
            <div className="ambassador-copy-row__value ambassador-copy-row__value--code">{profile.code}</div>
            <button type="button" onClick={() => handleCopy(profile.code, setCopiedCode)} className="ambassador-secondary-button">
              <Copy className="ambassador-icon ambassador-icon--sm" />
              {copiedCode ? '已複製' : '複製'}
            </button>
          </div>
        </div>

        <div className="ambassador-copy-panel">
          <div className="ambassador-copy-panel__label">
            <ExternalLink className="ambassador-icon ambassador-icon--xs" />
            推廣連結
          </div>
          <div className="ambassador-copy-row">
            <div className="ambassador-copy-row__value">{referralLink}</div>
            <button type="button" onClick={() => handleCopy(referralLink, setCopiedLink)} className="ambassador-secondary-button">
              <Copy className="ambassador-icon ambassador-icon--sm" />
              {copiedLink ? '已複製' : '複製'}
            </button>
          </div>
        </div>

        <div className="ambassador-action-grid">
          <button type="button" onClick={() => setShowQR(true)} className="ambassador-action-button">
            <QrCode className="ambassador-icon ambassador-icon--md" />
            顯示 QR Code
          </button>
          <button type="button" onClick={handleDownloadQR} className="ambassador-action-button ambassador-action-button--primary">
            <Download className="ambassador-icon ambassador-icon--md" />
            {downloadingQR ? '準備中' : '下載 QR Code'}
          </button>
        </div>
      </div>

      {showQR && (
        <div className="ambassador-modal" role="dialog" aria-modal="true" aria-label="Ambassador referral QR Code">
          <div className="ambassador-modal__card">
            <div className="ambassador-modal__header">
              <div>
                <p>Referral QR</p>
                <h3>您的專屬 QR Code</h3>
              </div>
              <button type="button" onClick={() => setShowQR(false)} className="ambassador-icon-button" aria-label="關閉 QR Code">
                <X className="ambassador-icon ambassador-icon--md" />
              </button>
            </div>
            <div className="ambassador-qr-box">
              <img src={qrCodeUrl} alt="Ambassador referral QR Code" />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function StatsGrid({ data }) {
  const { financials, stats } = data;

  return (
    <section className="ambassador-stats-grid" aria-label="Ambassador performance stats">
      <StatCard title="可提領餘額" value={formatMoney(financials.availableEarnings)} icon={Wallet} hint="立即提領" tone="positive" />
      <StatCard title="待結算收益" value={formatMoney(financials.pendingEarnings)} icon={Clock} hint="預計 3 天後入帳" tone="warning" />
      <StatCard title="總邀請人數" value={`${stats.studentCount + stats.coachCount} 人`} icon={Users} hint={`學員 ${stats.studentCount} / 教練 ${stats.coachCount}`} />
      <StatCard title="本月轉換率" value={`${stats.conversionRate}%`} icon={TrendingUp} hint="追蹤完課轉換" tone="positive" />
      <StatCard title="今日新增" value={`${stats.todaySignups} 人`} icon={UserPlus} hint="今日綁定邀請" />
      <StatCard title="今日完課" value={`${stats.todayCompletedClasses} 堂`} icon={CheckCircle2} hint={`累計完課 ${stats.completedClassesCount} 堂`} tone="positive" />
    </section>
  );
}

function StatCard({ title, value, icon: Icon, hint, tone = 'default' }) {
  return (
    <article className={`ambassador-stat-card ambassador-stat-card--${tone}`}>
      <div className="ambassador-stat-card__top">
        <div className="ambassador-stat-card__icon">
          <Icon className="ambassador-icon ambassador-icon--md" strokeWidth={2.15} />
        </div>
        <ChevronRight className="ambassador-icon ambassador-icon--xs ambassador-stat-card__chevron" />
      </div>
      <p className="ambassador-stat-card__title">{title}</p>
      <div className="ambassador-stat-card__value">{value}</div>
      <div className="ambassador-stat-card__hint">{hint}</div>
    </article>
  );
}

function RecentEarnings({ earnings = [] }) {
  return (
    <section className="ambassador-card ambassador-activity-card" aria-labelledby="recent-earnings-title">
      <div className="ambassador-section-heading ambassador-section-heading--inline">
        <div>
          <p>Activity feed</p>
          <h2 id="recent-earnings-title">最近收益</h2>
        </div>
        <span>即時</span>
      </div>
      {earnings.length > 0 ? (
        <div className="ambassador-earning-list">
          {earnings.slice(0, 3).map((earning, index) => (
            <EarningRow
              key={earning.id || `${earning.name || 'earning'}-${index}`}
              name={earning.name || 'UniCoach'}
              action={earning.action || '收益已入帳'}
              amount={Number(earning.amount || 0)}
              time={earning.time || formatActivityTime(earning.createdAt)}
            />
          ))}
        </div>
      ) : (
        <div className="ambassador-empty-state">
          <div className="ambassador-empty-state__icon">
            <Wallet className="ambassador-icon ambassador-icon--md" />
          </div>
          <strong>尚無近期收益</strong>
          <p>完成課程並確認入帳後，收益紀錄會顯示在這裡。</p>
        </div>
      )}
    </section>
  );
}

function EarningRow({ name, action, amount, time }) {
  return (
    <div className="ambassador-earning-row">
      <div className="ambassador-avatar" aria-hidden="true">
        {name.slice(0, 1)}
      </div>
      <div className="ambassador-earning-row__meta">
        <div>{name}</div>
        <p>{action}</p>
      </div>
      <div className="ambassador-earning-row__amount">
        <strong>+{formatMoney(amount)}</strong>
        <span>{time}</span>
      </div>
    </div>
  );
}

function LevelProgressCard({ currentLevel, levels }) {
  const normalizedLevels = levels.length > 0
    ? levels.map((level) => ({ name: level.name, rate: `${Number(level.commissionRate || 0)}%` }))
    : [{ name: currentLevel || 'Ambassador', rate: '目前' }];

  return (
    <section className="ambassador-card ambassador-level-section" aria-labelledby="ambassador-level-title">
      <div className="ambassador-section-heading ambassador-section-heading--inline">
        <div>
          <p>Status ladder</p>
          <h2 id="ambassador-level-title">大使等級</h2>
        </div>
        <span>依平台設定</span>
      </div>
      <div className="ambassador-level-grid">
        {normalizedLevels.map((level) => (
          <LevelBadge key={level.name} name={level.name} rate={level.rate} active={level.name.toLowerCase() === String(currentLevel || '').toLowerCase()} />
        ))}
      </div>
    </section>
  );
}

function LevelBadge({ name, rate, active }) {
  return (
    <div className={active ? 'ambassador-level-card ambassador-level-card--active' : 'ambassador-level-card'}>
      <div className="ambassador-level-card__icon">
        {active ? <Gem className="ambassador-icon ambassador-icon--md" strokeWidth={2.25} /> : <Hexagon className="ambassador-icon ambassador-icon--md" strokeWidth={1.9} />}
      </div>
      <div className="ambassador-level-card__name">{name}</div>
      <div className="ambassador-level-card__rate">{rate}</div>
      {active && <div className="ambassador-level-card__current">目前</div>}
    </div>
  );
}

function LoadingDashboard() {
  return (
    <main className="ambassador-content" aria-busy="true">
      <section className="ambassador-hero ambassador-skeleton ambassador-skeleton--hero" />
      <section className="ambassador-card ambassador-skeleton ambassador-skeleton--card" />
      <section className="ambassador-stats-grid">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="ambassador-stat-card ambassador-skeleton" />
        ))}
      </section>
    </main>
  );
}

function ErrorDashboard({ message, onRetry }) {
  return (
    <main className="ambassador-content">
      <section className="ambassador-card ambassador-state-card">
        <div className="ambassador-empty-state ambassador-empty-state--large">
          <div className="ambassador-empty-state__icon">
            <ShieldCheck className="ambassador-icon ambassador-icon--md" />
          </div>
          <strong>{message || '無法讀取 Ambassador Dashboard'}</strong>
          <p>請確認帳號狀態，或稍後再試一次。</p>
          <button type="button" onClick={onRetry} className="ambassador-action-button ambassador-action-button--primary">
            <RefreshCw className="ambassador-icon ambassador-icon--md" />
            重新整理
          </button>
        </div>
      </section>
    </main>
  );
}

function BottomNav() {
  const pathname = usePathname();
  const navItems = [
    { name: '首頁', href: '/', icon: Home },
    { name: '探索', href: '/search', icon: Search },
    { name: '找教練', href: '/coaches', icon: ClipboardList },
    { name: '我的', href: '/ambassador', icon: User },
  ];

  return (
    <nav className="ambassador-bottom-nav" aria-label="Ambassador bottom navigation">
      <div className="ambassador-bottom-nav__inner">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link key={item.name} href={item.href} className={isActive ? 'ambassador-nav-item ambassador-nav-item--active' : 'ambassador-nav-item'} aria-current={isActive ? 'page' : undefined}>
              <Icon className="ambassador-icon ambassador-icon--nav" strokeWidth={isActive ? 2.5 : 2} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default function AmbassadorPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [dashboardState, setDashboardState] = useState({ status: 'loading', data: null, error: '' });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const loadDashboard = async () => {
    setDashboardState((current) => ({ ...current, status: 'loading', error: '' }));

    try {
      const response = await fetch(DASHBOARD_ENDPOINT, {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || payload?.error) {
        throw new Error(payload?.error || '讀取數據失敗');
      }

      setDashboardState({ status: 'ready', data: normalizeDashboardData(payload), error: '' });
    } catch (error) {
      setDashboardState({ status: 'error', data: null, error: error?.message || '讀取數據失敗' });
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  return (
    <MobileShell>
      <PageHeader />
      {(loading || dashboardState.status === 'loading') && <LoadingDashboard />}
      {!loading && user && user.role !== 'ambassador' && (
        <ErrorDashboard message="你沒有推廣大使權限" onRetry={() => router.push('/')} />
      )}
      {!loading && user && user.role === 'ambassador' && dashboardState.status === 'error' && (
        <ErrorDashboard message={dashboardState.error} onRetry={loadDashboard} />
      )}
      {!loading && user && user.role === 'ambassador' && dashboardState.status === 'ready' && dashboardState.data && (
        <main className="ambassador-content">
          <HeroCard data={dashboardState.data} />
          <ReferralToolCard data={dashboardState.data} />
          <StatsGrid data={dashboardState.data} />
          <RecentEarnings earnings={dashboardState.data.recentEarnings} />
          <LevelProgressCard currentLevel={dashboardState.data.profile.levelName} levels={dashboardState.data.levels} />
        </main>
      )}
      <BottomNav />
    </MobileShell>
  );
}
