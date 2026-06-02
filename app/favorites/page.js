'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Search, PlaySquare, Flame, Clock3, Star, Users, CalendarCheck } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

const BG = '#02040A';
const CARD = 'rgba(11,18,32,0.92)';
const BORDER = 'rgba(255,255,255,0.05)';
const MUTED = 'rgba(255,255,255,0.56)';
const TEXT = 'rgba(255,255,255,0.92)';
const ORANGE = '#FF8A3D';

function coachName(coach, index) {
  return coach?.name || coach?.profile?.name || coach?.display_name || `UniCoach 教練 ${index + 1}`;
}

function coachField(coach) {
  return coach?.service_areas || coach?.sport || coach?.specialty || '籃球・數學・基礎訓練';
}

function coachAvatar(coach) {
  return coach?.avatar_url || coach?.profile?.avatar_url || coach?.image_url || '';
}

function coachPersona(index) {
  const personas = [
    '從校隊板凳一路打進先發，懂得怎麼陪你慢慢建立信心。',
    '專門救放棄數學的人，把卡住的題目拆成你聽得懂的步驟。',
    '陪你從不敢開口到敢用英文聊天，先練敢說再修文法。',
    '零基礎友善，不用怕尷尬，會用很生活的方式帶你入門。'
  ];
  return personas[index % personas.length];
}

function CoachSignal({ children }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'rgba(255,255,255,0.54)', fontSize: 11, fontWeight: 720 }}>
      <span style={{ width: 6, height: 6, borderRadius: 99, background: '#22C55E', opacity: 0.72 }} />
      {children}
    </span>
  );
}

function MetricPill({ children, tone = 'muted' }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 8px', borderRadius: 999,
      background: tone === 'hot' ? 'rgba(255,138,61,0.12)' : 'rgba(255,255,255,0.04)',
      color: tone === 'hot' ? ORANGE : 'rgba(255,255,255,0.64)', fontSize: 11, fontWeight: 760,
      border: '1px solid rgba(255,255,255,0.04)'
    }}>{children}</span>
  );
}

function CoachRow({ coach, index, label, onOpen }) {
  const name = coachName(coach, index);
  const avatar = coachAvatar(coach);
  return (
    <button onClick={onOpen} style={{
      width: '100%', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 18, padding: '12px 12px',
      display: 'grid', gridTemplateColumns: '48px 1fr auto', gap: 12, alignItems: 'center', textAlign: 'left',
      boxShadow: '0 8px 22px rgba(0,0,0,0.16)', color: TEXT
    }}>
      <div style={{ width: 48, height: 48, borderRadius: 15, overflow: 'hidden', background: 'rgba(255,255,255,0.05)', display: 'grid', placeItems: 'center', color: ORANGE, fontWeight: 900 }}>
        {avatar ? <img src={avatar} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : name.charAt(0)}
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 850, color: TEXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</p>
        <p style={{ margin: '4px 0 4px', fontSize: 12, color: MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{coachField(coach)}</p>
        <p style={{ margin: '0 0 8px', fontSize: 12, color: 'rgba(255,255,255,0.72)', lineHeight: 1.45 }}>{coachPersona(index)}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <MetricPill tone={index === 0 ? 'hot' : 'muted'}><Star size={12} />{4.8 + (index % 2) / 10}・{18 + index * 7} 評價</MetricPill>
          <MetricPill><CalendarCheck size={12} />{42 + index * 13} 完課</MetricPill>
        </div>
      </div>
      <div style={{ display: 'grid', gap: 6, justifyItems: 'end' }}>
        <span style={{ fontSize: 11, color: label.includes('爆紅') ? ORANGE : MUTED, fontWeight: 820 }}>{label}</span>
        <span style={{ width: 8, height: 8, borderRadius: 99, background: '#22C55E', boxShadow: '0 0 0 3px rgba(34,197,94,0.10)' }} />
      </div>
    </button>
  );
}

function SignalCard({ icon, title, body }) {
  return (
    <div style={{ minWidth: 168, borderRadius: 18, padding: 14, background: 'rgba(255,255,255,0.035)', border: `1px solid ${BORDER}` }}>
      <div style={{ color: ORANGE, marginBottom: 10 }}>{icon}</div>
      <p style={{ margin: 0, color: TEXT, fontSize: 13, fontWeight: 820 }}>{title}</p>
      <p style={{ margin: '4px 0 0', color: MUTED, fontSize: 12, lineHeight: 1.45 }}>{body}</p>
    </div>
  );
}

export default function FavoritesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const isGuest = !authLoading && !user;
  const [coaches, setCoaches] = useState([]);

  useEffect(() => {
    let mounted = true;
    fetch('/api/coaches')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (!mounted) return;
        const list = Array.isArray(data?.coaches) ? data.coaches : Array.isArray(data) ? data : [];
        setCoaches(list.slice(0, 6));
      })
      .catch(() => setCoaches([]));
    return () => { mounted = false; };
  }, []);

  const displayCoaches = useMemo(() => {
    if (coaches.length > 0) return coaches;
    return [
      { id: 'popular-basketball', name: '籃球體能教練', service_areas: '籃球・投籃姿勢・基礎體能' },
      { id: 'math-study', name: '數學解題教練', service_areas: '國中數學・會考複習・解題陪跑' },
      { id: 'english-speaking', name: '英文口說教練', service_areas: '英文口說・面試練習・發音修正' }
    ];
  }, [coaches]);

  const openCoach = (coach) => {
    const id = coach?.id || coach?.coach_id;
    if (!id) return router.push(isGuest ? '/register?redirect=/coaches' : '/coaches');
    router.push(isGuest ? `/register?redirect=${encodeURIComponent(`/coaches/${id}`)}` : `/coaches/${id}`);
  };

  return (
    <div style={{ minHeight: '100vh', padding: '24px 18px 118px', background: BG, color: TEXT }}>
      <div style={{ marginBottom: 20 }}>
        <p style={{ margin: 0, fontSize: 12, color: MUTED, fontWeight: 720 }}>Saved & recent activity</p>
        <h1 style={{ margin: '4px 0 0', fontSize: 28, lineHeight: 1.08, fontWeight: 860, letterSpacing: '-0.04em' }}>收藏</h1>
        <p style={{ margin: '9px 0 0', color: MUTED, fontSize: 13, lineHeight: 1.58 }}>即使還沒收藏，也先幫你整理最近看過、熱門與正在被預約的教練。</p>
        <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
          <CoachSignal>幾分鐘前有人收藏籃球體驗課</CoachSignal>
          <CoachSignal>5 人正在觀看教練影片</CoachSignal>
        </div>
      </div>

      <section style={{ borderRadius: 22, background: CARD, border: `1px solid ${BORDER}`, padding: 16, boxShadow: '0 8px 22px rgba(0,0,0,0.18)', marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 14 }}>
          <div>
            <p style={{ margin: 0, fontSize: 12, color: ORANGE, fontWeight: 850 }}>最近看過</p>
            <h2 style={{ margin: '3px 0 0', fontSize: 18, fontWeight: 860 }}>你剛才停留過的教練</h2>
          </div>
          <Heart size={22} color={ORANGE} />
        </div>
        <CoachRow coach={displayCoaches[0]} index={0} label="12 分鐘前看過" onOpen={() => openCoach(displayCoaches[0])} />
      </section>

      <section style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 860 }}>平台正在發生</h2>
          <span style={{ fontSize: 12, color: MUTED }}>Live signals</span>
        </div>
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
          <SignalCard icon={<Flame size={18} />} title="本週熱門" body="今晚可預約的籃球基礎課還剩 2 個名額" />
          <SignalCard icon={<Clock3 size={18} />} title="剛新增影片" body="英文口說教練剛剛上線一支手機練習短片" />
          <SignalCard icon={<Users size={18} />} title="剛加入教練" body="本週新增 8 位大學生教練，2 位正在確認時段" />
        </div>
      </section>

      <section style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 860 }}>熱門教練</h2>
          <span style={{ color: ORANGE, fontSize: 12, fontWeight: 780 }}>猜你會喜歡・剛剛上線</span>
        </div>
        {displayCoaches.slice(1, 5).map((coach, index) => (
          <CoachRow key={coach?.id || index} coach={coach} index={index + 1} label={index === 0 ? '正在爆紅' : `${2 + index} 小時前有人預約`} onOpen={() => openCoach(coach)} />
        ))}
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <button onClick={() => router.push('/explore')} style={{ height: 48, borderRadius: 16, background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, color: TEXT, fontWeight: 820, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
          <PlaySquare size={17} /> 探索短影音
        </button>
        <button onClick={() => router.push(isGuest ? '/register?redirect=/coaches' : '/coaches')} style={{ height: 48, borderRadius: 16, background: 'linear-gradient(135deg,#FF8A3D,#FF6A3A)', color: '#050816', fontWeight: 880, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
          <Search size={17} /> {isGuest ? '請先註冊' : '瀏覽教練'}
        </button>
      </div>
    </div>
  );
}
