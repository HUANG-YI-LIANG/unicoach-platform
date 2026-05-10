self.addEventListener('push', function (event) {
  if (event.data) {
    try {
      const data = event.data.json();
      const options = {
        body: data.body,
        icon: data.icon || '/icon.png',
        badge: data.badge || '/icon.png',
        vibrate: [100, 50, 100],
        data: {
          url: data.url || '/',
        },
      };
      
      event.waitUntil(self.registration.showNotification(data.title, options));
    } catch (e) {
      console.error('Error parsing push data', e);
    }
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});
