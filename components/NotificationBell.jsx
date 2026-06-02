'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

export default function NotificationBell() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const popoverRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (res.ok && data.notifications) {
        setNotifications(data.notifications);
        setUnreadCount(Number(data.unreadCount ?? data.notifications.filter(n => !n.is_read).length));
      }
    } catch (_) {
      // Keep the bell silent when the lightweight polling request fails.
    }
  };

  const handleNotificationClick = async (notification) => {
    setIsOpen(false);
    
    // Mark as read
    if (!notification.is_read) {
      try {
        await fetch(`/api/notifications/${notification.id}/read`, { method: 'PATCH' });
        setNotifications(prev => 
          prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (_) {
        // Keep navigation usable even if read-state update fails.
      }
    }

    const linkUrl = typeof notification.link_url === 'string' ? notification.link_url.trim() : '';
    if (linkUrl.startsWith('/') && !linkUrl.startsWith('//')) {
      router.push(linkUrl);
    }
  };

  if (!user) return null;

  return (
    <div className="notification-bell-wrapper" ref={popoverRef} style={{ position: 'relative' }}>
      <style>{`
        .notif-popover {
          position: absolute;
          top: calc(100% + 8px);
          right: -10px;
          width: min(320px, calc(100vw - 24px));
          max-height: 400px;
          background: #0F172A;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.4);
          overflow-y: auto;
          box-sizing: border-box;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          opacity: 0;
          transform: translateY(-10px);
          transition: opacity 0.2s ease-out, transform 0.2s ease-out;
          pointer-events: none;
        }
        .notif-popover.open {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }
        @media (max-width: 768px) {
          .notif-popover {
            position: fixed;
            top: auto;
            bottom: 0;
            left: 0;
            right: 0;
            width: 100%;
            max-height: min(75dvh, 620px);
            padding-bottom: env(safe-area-inset-bottom);
            border-radius: 28px 28px 0 0;
            overscroll-behavior: contain;
            transform: translateY(100%);
          }
          .notif-popover.open {
            transform: translateY(0);
          }
          .notif-backdrop {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.6);
            backdrop-filter: blur(4px);
            z-index: 999;
            opacity: 0;
            transition: opacity 0.2s ease-out;
            pointer-events: none;
          }
          .notif-backdrop.open {
            opacity: 1;
            pointer-events: auto;
          }
          .notif-drag-handle {
            width: 40px;
            height: 4px;
            background: rgba(255,255,255,0.2);
            border-radius: 2px;
            margin: 14px auto 8px;
            display: block;
          }
        }
        @media (min-width: 769px) {
          .notif-drag-handle { display: none; }
          .notif-backdrop { display: none; }
        }
      `}</style>
      
      <div 
        className={`notif-backdrop ${isOpen ? 'open' : ''}`} 
        onClick={() => setIsOpen(false)}
      />

      <button 
        type="button"
        aria-label="開啟通知中心"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          padding: '8px',
          borderRadius: '50%',
          color: 'white',
          cursor: 'pointer',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: '0.2s'
        }}
        onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
        onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            background: '#FF8A3D',
            color: '#050816',
            fontSize: '10px',
            fontWeight: '900',
            minWidth: '18px',
            height: '18px',
            borderRadius: '9px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
            border: '2px solid #050816'
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <div className={`notif-popover ${isOpen ? 'open' : ''}`}>
        <div className="notif-drag-handle" />
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          fontWeight: 900,
          fontSize: '16px',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          通知中心
        </div>
        
        {notifications.length === 0 ? (
          <div style={{ padding: '40px 16px', textAlign: 'center', color: '#94A3B8', fontSize: '14px', fontWeight: 600 }}>
            目前沒有任何通知喔！
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {notifications.slice(0, 20).map(n => (
              <div 
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  background: n.is_read ? 'transparent' : 'rgba(255, 138, 61, 0.05)',
                  cursor: 'pointer',
                  transition: '0.2s',
                  position: 'relative'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                onMouseOut={e => e.currentTarget.style.background = n.is_read ? 'transparent' : 'rgba(255, 138, 61, 0.05)'}
              >
                {!n.is_read && (
                  <div style={{ position: 'absolute', left: '10px', top: '24px', width: '6px', height: '6px', borderRadius: '50%', background: '#FF8A3D' }} />
                )}
                <div style={{ marginLeft: !n.is_read ? '12px' : '0' }}>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: 'white', marginBottom: '4px' }}>
                    {n.title}
                  </div>
                  <div style={{ fontSize: '13px', color: '#94A3B8', lineHeight: 1.5 }}>
                    {n.message}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '8px', fontWeight: 600 }}>
                    {new Date(n.created_at).toLocaleString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
