'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { Bell, ArrowLeft, CheckCircle2 } from 'lucide-react';
import PushPrompt from '@/components/PushPrompt';

const ORANGE = 'var(--color-accent)';
const BG = 'var(--color-bg)';
const CARD = 'var(--color-surface)';
const BORDER = 'var(--color-border)';
const MUTED = 'var(--color-text-muted)';
const TEXT_LIGHT = 'var(--color-text)';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '剛剛';
  if (minutes < 60) return `${minutes} 分鐘前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小時前`;
  return `${Math.floor(hours / 24)} 天前`;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }

    const fetchNotifications = async () => {
      try {
        const response = await fetch('/api/notifications', { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          setNotifications(data.notifications || []);
        }
      } catch (error) {
        console.error('[NOTIFICATIONS LOAD ERROR]', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [user, router]);

  const markAsRead = async (id) => {
    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: BG }}>
        <p style={{ color: ORANGE, fontSize: 15, fontWeight: 800 }}>載入通知中...</p>
      </div>
    );
  }

  return (
    <div style={{ background: BG, minHeight: '100vh', paddingBottom: 100, color: TEXT_LIGHT }}>
      <div style={{ padding: '20px 16px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ background: 'transparent', border: 'none', color: TEXT_LIGHT, cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}>
          <ArrowLeft size={24} />
        </button>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>通知中心</h1>
      </div>

      <div style={{ padding: '0 16px', marginBottom: 16 }}>
        <PushPrompt />
      </div>

      {notifications.length === 0 ? (
        <div style={{ padding: '32px 24px', textAlign: 'center', marginTop: 20 }}>
          <div style={{ display: 'inline-flex', padding: 24, background: 'var(--color-surface-soft)', borderRadius: '50%', marginBottom: 16 }}>
            <Bell size={40} color={MUTED} />
          </div>
          <p style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: TEXT_LIGHT }}>目前沒有新通知</p>
          <p style={{ margin: '0 0 24px', fontSize: 14, color: MUTED }}>
            當您有新預約或重要提醒時，會在這裡顯示。
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {notifications.map((n) => (
            <div 
              key={n.id} 
              onClick={() => { if (!n.is_read) markAsRead(n.id); }}
              style={{ 
                padding: '16px', 
                background: n.is_read ? 'transparent' : 'var(--color-surface-soft)',
                borderBottom: `1px solid ${BORDER}`,
                display: 'flex',
                gap: 12,
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
            >
              <div style={{ 
                width: 48, height: 48, borderRadius: '50%', flexShrink: 0, 
                background: n.is_read ? CARD : `linear-gradient(135deg, ${ORANGE}, #FDBA74)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: n.is_read ? MUTED : '#FFF',
                border: n.is_read ? `1px solid ${BORDER}` : 'none'
              }}>
                <Bell size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: n.is_read ? 700 : 900, color: TEXT_LIGHT }}>{n.title}</span>
                  <span style={{ fontSize: 11, color: MUTED, whiteSpace: 'nowrap', marginLeft: 8 }}>{timeAgo(n.created_at)}</span>
                </div>
                <p style={{ margin: 0, fontSize: 14, color: n.is_read ? MUTED : TEXT_LIGHT, lineHeight: 1.5 }}>{n.content}</p>
                {n.discount_code && (
                  <div style={{ marginTop: 8, padding: '6px 12px', background: 'rgba(249, 115, 22, 0.1)', color: ORANGE, borderRadius: 8, display: 'inline-block', fontSize: 13, fontWeight: 800 }}>
                    專屬折扣碼：{n.discount_code}
                  </div>
                )}
              </div>
              {!n.is_read && (
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', alignSelf: 'center', flexShrink: 0 }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
