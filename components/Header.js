'use client';
import { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { useTheme } from './ThemeProvider';
import Link from 'next/link';
import { Sun, Moon, X } from 'lucide-react';

export default function Header() {
  const { user, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showLevelRules, setShowLevelRules] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [rewardConfig, setRewardConfig] = useState(null);

  useEffect(() => {
    if (showLevelRules && user && tasks.length === 0) {
      setLoadingTasks(true);
      fetch('/api/user/tasks')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setTasks(data.tasks);
            if (data.rewardConfig) setRewardConfig(data.rewardConfig);
          }
          setLoadingTasks(false);
        })
        .catch(err => {
          console.error(err);
          setLoadingTasks(false);
        });
    }
  }, [showLevelRules, user, tasks.length]);

  return (
    <>
      <header className="global-header">
        <div className="header-left">
          <span className="brand-name">UniCoach</span>
        </div>
        <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? '切換為淺色模式' : '切換為深色模式'}
            title={theme === 'dark' ? '切換為淺色模式' : '切換為深色模式'}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--color-text)',
              padding: '6px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '999px',
              lineHeight: 0,
            }}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          {loading ? (
            <span className="status-badge" style={{ opacity: 0.5 }}>載入中...</span>
          ) : user ? (
            <>
              {user.role === 'user' && user.level && (
                <button 
                  onClick={() => setShowLevelRules(true)}
                  style={{ fontSize: '11px', background: 'var(--color-surface-soft)', color: 'var(--color-primary)', border: 'none', padding: '4px 10px', borderRadius: '100px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'background 0.2s' }}
                >
                  Lv.{user.level}
                </button>
              )}
              <span className="status-badge">已登入</span>
            </>
          ) : (
            <Link href="/login" style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-text)', background: 'var(--color-surface-soft)', padding: '6px 14px', borderRadius: '100px', textDecoration: 'none' }}>登入 / 註冊</Link>
          )}
        </div>
      </header>

      {/* Level Rules Modal */}
      {showLevelRules && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(2px)' }}>
          <div style={{ background: 'var(--color-surface)', width: '100%', maxWidth: 440, maxHeight: '90vh', borderRadius: 20, position: 'relative', boxShadow: '0 24px 48px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 24px 20px', borderBottom: '1px solid var(--color-border)' }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--color-text)' }}>等級與升級規則</h2>
              <button 
                onClick={() => setShowLevelRules(false)}
                style={{ background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 0 }}
              >
                <X size={24} strokeWidth={1.5} />
              </button>
            </div>
            
            {/* Content Body */}
            <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-primary)', marginBottom: 16 }}>
                任務
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {loadingTasks ? (
                  <div style={{ textAlign: 'center', padding: 20, color: 'var(--color-text-muted)', fontSize: 14 }}>載入任務進度中...</div>
                ) : tasks.length > 0 ? (
                  tasks.map((task) => (
                    <Link key={task.id} href={task.link} onClick={() => setShowLevelRules(false)} style={{ textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: 15, color: 'var(--color-text)', lineHeight: 1.5, padding: '8px 12px', margin: '-8px -12px', borderRadius: 8, transition: 'background 0.2s', cursor: 'pointer' }} className="task-link">
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flex: 1, paddingRight: 16 }}>
                        <span style={{ flexShrink: 0 }}>{task.id}.</span>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: 15, fontWeight: 700, color: task.progress === 100 ? 'var(--color-text-muted)' : 'var(--color-text)', textDecoration: task.progress === 100 ? 'line-through' : 'none' }}>
                            {task.title}
                          </span>
                          {task.subtitle && (
                            <span style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>
                              {task.subtitle}
                            </span>
                          )}
                        </div>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, marginTop: 4, flexShrink: 0 }}><polyline points="9 18 15 12 9 6"></polyline></svg>
                      </div>
                      <div style={{ fontWeight: 800, color: task.progress === 100 ? '#10B981' : 'var(--color-primary)', flexShrink: 0 }}>{task.progress}%</div>
                    </Link>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: 20, color: 'var(--color-text-muted)', fontSize: 14 }}>暫無任務資料</div>
                )}
              </div>

              {/* 滿級獎勵提示 */}
              {(!user?.level || user?.level < 4) && (
                <div style={{ marginTop: 24, padding: 16, background: 'rgba(16, 185, 129, 0.1)', borderRadius: 12, border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #10B981, #059669)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}>
                    <span style={{ fontSize: 24 }}>🎖️</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#10B981', marginBottom: 4 }}>完成全部任務解鎖大獎！</div>
                    <div style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                      {user?.level === 1 ? (
                        <>獲得「新手完成徽章」{rewardConfig?.lv2?.type === 'amount' ? `與 $${rewardConfig.lv2.value} 專屬優惠券` : rewardConfig?.lv2?.type === 'percent' ? `與 ${rewardConfig.lv2.value}折 專屬優惠券` : ''}，並自動晉升至 <strong>等級 2</strong>！</>
                      ) : user?.level === 2 ? (
                        <>{rewardConfig?.lv3?.type === 'amount' ? `獲得 $${rewardConfig.lv3.value} 專屬優惠券` : rewardConfig?.lv3?.type === 'percent' ? `獲得 ${rewardConfig.lv3.value}折 專屬優惠券` : '完成進階挑戰'}，並自動晉升至 <strong>等級 3</strong>！</>
                      ) : user?.level === 3 ? (
                        <>{rewardConfig?.lv4?.type === 'amount' ? `獲得 $${rewardConfig.lv4.value} 專屬優惠券` : rewardConfig?.lv4?.type === 'percent' ? `獲得 ${rewardConfig.lv4.value}折 專屬優惠券` : '恭喜即將破關'}！完成所有挑戰即可解鎖目前最高殿堂 <strong>等級 4</strong>！</>
                      ) : (
                        <>您已完成目前所有等級任務！</>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <style>{`
                .task-link:hover {
                  background: var(--color-surface-soft);
                }
              `}</style>
            </div>

            {/* Footer Button */}
            <div style={{ padding: '0 24px 24px' }}>
              <button
                onClick={() => setShowLevelRules(false)}
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: 100,
                  border: 'none',
                  background: '#6B9DF2', // Match the blue from the screenshot
                  color: '#FFFFFF',
                  fontSize: 16,
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(107, 157, 242, 0.3)'
                }}
              >
                我了解了
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
