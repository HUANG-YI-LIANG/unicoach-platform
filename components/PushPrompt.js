'use client';
import { useState, useEffect } from 'react';
import { BellRing, X } from 'lucide-react';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushPrompt() {
  const [permission, setPermission] = useState('default');
  const [subscribed, setSubscribed] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
      
      // Check if already subscribed
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(reg => {
          reg.pushManager.getSubscription().then(sub => {
            if (sub) setSubscribed(true);
          });
        });
      }
    }
  }, []);

  if (permission === 'denied' || subscribed || dismissed) return null;

  const handleSubscribe = async () => {
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return;

      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        console.error('VAPID public key not found');
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });

      if (res.ok) {
        setSubscribed(true);
      }
    } catch (err) {
      console.error('Failed to subscribe to push notifications', err);
    }
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.1), rgba(249, 115, 22, 0.05))',
      border: '1px solid var(--color-accent)',
      borderRadius: 16,
      padding: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      position: 'relative'
    }}>
      <button 
        onClick={() => setDismissed(true)}
        style={{ position: 'absolute', top: 8, right: 8, background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
      >
        <X size={16} />
      </button>
      
      <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'white' }}>
        <BellRing size={22} />
      </div>
      
      <div style={{ flex: 1 }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800, color: 'var(--color-text)' }}>開啟即時通知</h3>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.4 }}>不錯過任何教練的回覆與重要預約提醒！</p>
      </div>
      
      <button 
        onClick={handleSubscribe}
        style={{
          background: 'var(--color-text)',
          color: 'var(--color-surface)',
          border: 'none',
          padding: '8px 16px',
          borderRadius: 100,
          fontSize: 13,
          fontWeight: 800,
          cursor: 'pointer'
        }}
      >
        開啟
      </button>
    </div>
  );
}
