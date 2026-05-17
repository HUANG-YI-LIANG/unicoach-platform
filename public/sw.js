function sanitizeNotificationUrl(value) {
  if (typeof value !== 'string') return '/notifications';

  const trimmed = value.trim();

  if (!trimmed.startsWith('/')) return '/notifications';
  if (trimmed.startsWith('//')) return '/notifications';
  if (trimmed.includes('\\')) return '/notifications';
  if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed)) return '/notifications';

  return trimmed;
}

self.addEventListener('push', (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    data = {
      title: 'UniCoach 通知',
      body: event.data ? event.data.text() : '',
    };
  }

  const title = data.title || 'UniCoach 通知';
  const safeUrl = sanitizeNotificationUrl(data.url);

  const options = {
    body: data.body || data.content || '',
    icon: data.icon || '/icon.png',
    badge: data.badge || '/icon.png',
    tag: data.tag || data.type || 'unicoach-notification',
    renotify: false,
    data: {
      url: safeUrl,
      notificationId: data.notificationId || null,
      type: data.type || null,
    },
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = sanitizeNotificationUrl(event.notification?.data?.url);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client && client.url.startsWith(self.location.origin)) {
          client.focus();
          if ('navigate' in client) {
            return client.navigate(url);
          }
          return;
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
