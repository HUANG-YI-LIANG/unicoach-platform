import webpush from 'web-push';
import { getAdminSupabase } from './supabase';

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    'mailto:noreply@unicoach.com',
    vapidPublicKey,
    vapidPrivateKey
  );
} else {
  console.warn('VAPID keys not configured. Push notifications will not work.');
}

/**
 * Sends a push notification to a specific user.
 * 
 * @param {string} userId - The UUID of the user.
 * @param {object} payload - The push payload.
 * @param {string} payload.title - Notification title
 * @param {string} payload.body - Notification body
 * @param {string} payload.url - URL to open when clicked
 */
export async function sendPushNotification(userId, payload) {
  if (!vapidPublicKey || !vapidPrivateKey) return;

  const adminSupabase = getAdminSupabase();
  const { data: subscriptions, error } = await adminSupabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId);

  if (error || !subscriptions || subscriptions.length === 0) {
    return;
  }

  const pushPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || '/',
    icon: '/icon.png',
    badge: '/icon.png'
  });

  const promises = subscriptions.map(async (sub) => {
    try {
      await webpush.sendNotification({
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      }, pushPayload);
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        // Subscription expired or removed
        await adminSupabase.from('push_subscriptions').delete().eq('id', sub.id);
      } else {
        console.error('[PUSH SEND ERROR]', err);
      }
    }
  });

  await Promise.allSettled(promises);
}
