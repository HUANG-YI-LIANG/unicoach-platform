export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function getNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  return Notification.permission;
}

export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export async function registerServiceWorker() {
  if (!isPushSupported()) {
    throw new Error('此瀏覽器不支援推播通知');
  }

  return navigator.serviceWorker.register('/sw.js');
}

export async function getExistingSubscription() {
  if (!isPushSupported()) return null;

  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function enablePushNotifications() {
  if (!isPushSupported()) {
    return { ok: false, reason: 'unsupported', message: '此瀏覽器不支援推播通知' };
  }

  const permission = await Notification.requestPermission();

  if (permission !== 'granted') {
    return {
      ok: false,
      reason: permission === 'denied' ? 'denied' : 'default',
      message: '尚未取得通知權限',
    };
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  if (!publicKey) {
    return {
      ok: false,
      reason: 'missing_vapid_public_key',
      message: 'VAPID public key 尚未設定',
    };
  }

  const registration = await registerServiceWorker();

  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscription,
      userAgent: navigator.userAgent,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || '儲存推播訂閱失敗');
  }

  return { ok: true, subscription };
}

export async function disablePushNotifications() {
  if (!isPushSupported()) {
    return { ok: false, reason: 'unsupported' };
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    return { ok: true, message: '目前沒有推播訂閱' };
  }

  const endpoint = subscription.endpoint;

  await subscription.unsubscribe();

  const res = await fetch('/api/push/unsubscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || '取消推播訂閱失敗');
  }

  return { ok: true };
}
