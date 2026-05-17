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
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('Skipping push notification: VAPID keys not configured.');
    return;
  }

  const adminSupabase = getAdminSupabase();
  const { data: subscriptions, error } = await adminSupabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .is('revoked_at', null);

  if (error || !subscriptions || subscriptions.length === 0) {
    return;
  }

  const pushPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || '/',
    type: payload.type || 'general',
    notificationId: payload.notificationId || null,
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

      await adminSupabase.from('push_subscriptions').update({ last_sent_at: new Date().toISOString() }).eq('id', sub.id);

      await adminSupabase.from('notification_delivery_logs').insert([{
        notification_id: payload.notificationId || null,
        user_id: userId,
        subscription_id: sub.id,
        channel: 'web_push',
        status: 'sent',
        endpoint: sub.endpoint,
        payload_type: payload.type || 'general',
        payload_url: payload.url || '/',
        sent_at: new Date().toISOString()
      }]);
    } catch (err) {
      let isRevoked = false;
      let status = 'failed';

      if (err.statusCode === 410 || err.statusCode === 404) {
        isRevoked = true;
        status = 'expired';
        await adminSupabase.from('push_subscriptions').update({
          revoked_at: new Date().toISOString(),
          last_error: err.body || err.message,
          last_error_at: new Date().toISOString()
        }).eq('id', sub.id);
      } else {
        await adminSupabase.from('push_subscriptions').update({
          last_error: err.body || err.message,
          last_error_at: new Date().toISOString()
        }).eq('id', sub.id);
      }

      await adminSupabase.from('notification_delivery_logs').insert([{
        notification_id: payload.notificationId || null,
        user_id: userId,
        subscription_id: sub.id,
        channel: 'web_push',
        status: status,
        endpoint: sub.endpoint,
        error_code: String(err.statusCode || 'unknown'),
        error_message: err.body || err.message,
        payload_type: payload.type || 'general',
        payload_url: payload.url || '/'
      }]);
    }
  });

  await Promise.allSettled(promises);
}
