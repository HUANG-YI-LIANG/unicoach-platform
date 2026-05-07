'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Circle, ChevronRight, User, ShieldCheck, Clock, ListPlus, PartyPopper } from 'lucide-react';

const ORANGE = 'var(--color-accent)';
const MUTED = 'var(--color-text-muted)';
const TEXT_LIGHT = 'var(--color-text)';

export default function CoachOnboardingTasks({ profile, coachDetail }) {
  const router = useRouter();
  const [tasks, setTasks] = useState([
    { id: 'profile', title: '完善個人資料', desc: '填寫教學經驗與服務項目', icon: User, path: '/coach/profile/edit', completed: false },
    { id: 'verification', title: '專業身分驗證', desc: '上傳學生證或相關專業證明', icon: ShieldCheck, path: '/coach/profile/edit', completed: false },
    { id: 'schedule', title: '設定可預約時間', desc: '開放學生預約您的時段', icon: Clock, path: '/coach/schedule', completed: false },
    { id: 'plans', title: '建立課程方案', desc: '設定您的專屬課程與價格', icon: ListPlus, path: '/coach/plans', completed: false }
  ]);
  const [loading, setLoading] = useState(true);
  const [allCompleted, setAllCompleted] = useState(false);

  useEffect(() => {
    if (!profile || !coachDetail) return;

    let isMounted = true;

    // Evaluate basic tasks
    const hasProfile = Boolean(coachDetail.experience && coachDetail.philosophy && coachDetail.service_areas);
    const hasVerification = coachDetail.approval_status === 'approved' || coachDetail.approval_status === 'pending';

    Promise.all([
      fetch('/api/coach/plans'),
      fetch('/api/coach/availability')
    ]).then(async ([plansRes, availRes]) => {
      const plansData = plansRes.ok ? await plansRes.json() : { plans: [], using_defaults: true };
      const availData = availRes.ok ? await availRes.json() : { rules: [] };

      if (!isMounted) return;

      const hasPlans = !plansData.using_defaults && plansData.plans && plansData.plans.length > 0;
      const hasSchedule = availData.rules && availData.rules.length > 0;

      const updatedTasks = [
        { ...tasks[0], completed: hasProfile },
        { ...tasks[1], completed: hasVerification },
        { ...tasks[2], completed: hasSchedule },
        { ...tasks[3], completed: hasPlans }
      ];

      setTasks(updatedTasks);
      setAllCompleted(updatedTasks.every(t => t.completed));
      setLoading(false);
    }).catch(err => {
      console.error('Failed to load onboarding status:', err);
      if (isMounted) setLoading(false);
    });

    return () => { isMounted = false; };
  }, [profile, coachDetail]);

  if (loading) return null;

  if (allCompleted) {
    return (
      <div style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)', borderRadius: 16, padding: '24px 20px', border: '1px solid rgba(16, 185, 129, 0.2)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ background: 'rgba(16, 185, 129, 0.2)', width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <PartyPopper size={24} color="#10B981" />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#10B981' }}>新手任務全數完成！</h3>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: MUTED, lineHeight: 1.5 }}>太棒了！您的教練檔案已經準備就緒，現在可以開始接單，迎接您的第一位學生了！</p>
        </div>
      </div>
    );
  }

  const completedCount = tasks.filter(t => t.completed).length;
  const progress = (completedCount / tasks.length) * 100;

  return (
    <div style={{ background: 'var(--color-surface)', borderRadius: 16, padding: '24px 20px', border: '1px solid rgba(249, 115, 22, 0.2)', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, height: 4, background: 'rgba(255,255,255,0.05)', width: '100%' }}>
        <div style={{ width: `${progress}%`, height: '100%', background: ORANGE, transition: 'width 0.5s ease-out' }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: TEXT_LIGHT }}>教練新手啟程清單</h3>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: MUTED }}>完成以下步驟，讓您的檔案更具吸引力</p>
        </div>
        <div style={{ background: 'rgba(249, 115, 22, 0.1)', color: ORANGE, padding: '4px 12px', borderRadius: 100, fontSize: 13, fontWeight: 800 }}>
          {completedCount} / {tasks.length}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {tasks.map(task => (
          <button
            key={task.id}
            onClick={() => router.push(task.path)}
            style={{ 
              display: 'flex', alignItems: 'center', gap: 16, padding: 16, 
              background: 'var(--bg-input)', border: `1px solid ${task.completed ? 'rgba(16, 185, 129, 0.3)' : 'transparent'}`, 
              borderRadius: 12, cursor: 'pointer', textAlign: 'left', transition: 'transform 0.1s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.01)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div style={{ color: task.completed ? '#10B981' : MUTED }}>
              {task.completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: task.completed ? '#10B981' : TEXT_LIGHT }}>{task.title}</div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{task.desc}</div>
            </div>
            <ChevronRight size={18} color={MUTED} />
          </button>
        ))}
      </div>
    </div>
  );
}
