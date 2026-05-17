import 'server-only';

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

function sanitizeNotificationUrl(value) {
  if (typeof value !== 'string') return '/notifications';

  const trimmed = value.trim();

  if (!trimmed.startsWith('/')) return '/notifications';
  if (trimmed.startsWith('//')) return '/notifications';
  if (trimmed.includes('\\')) return '/notifications';
  if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed)) return '/notifications';

  return trimmed;
}

function redactEndpoint(endpoint) {
  if (!endpoint || typeof endpoint !== 'string') return null;
  if (endpoint.length <= 40) return '[redacted]';
  return `${endpoint.slice(0, 32)}...[redacted]`;
}

function normalizePushError(err) {
  const raw = err?.body || err?.message || 'unknown';
  return String(raw).slice(0, 500);
}

async function recordDeliveryLog(adminSupabase, row) {
  const { error } = await adminSupabase
    .from('notification_delivery_logs')
    .insert([row]);

  if (error) {
    console.warn('[PUSH DELIVERY LOG WARNING]', error);
  }
}

async function incrementFailureCount(adminSupabase, subscription) {
  const currentFailureCount = Number.isInteger(subscription.failure_count)
    ? subscription.failure_count
    : 0;

  const { error } = await adminSupabase
    .from('push_subscriptions')
    .update({
      failure_count: currentFailureCount + 1,
      last_error_at: new Date().toISOString(),
    })
    .eq('id', subscription.id);

  if (error) {
    console.warn('[PUSH FAILURE COUNT WARNING]', error);
  }
}

/**
 * Sends a push notification to a specific user.
 *
 * @param {string} userId - The UUID of the user.
 * @param {object} payload - The push payload.
 * @param {string} payload.title - Notification title
 * @param {string} payload.body - Notification body
 * @param {string} payload.url - URL to open when clicked
 * @param {string} payload.type - Notification type
 * @param {string} payload.notificationId - Related in-app notification id
 */
export async function sendPushNotification(userId, payload) {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('Skipping push notification: VAPID keys not configured.');
    return;
  }

  const safeUrl = sanitizeNotificationUrl(payload?.url);
  const payloadType = payload?.type || 'general';
  const notificationId = payload?.notificationId || null;
  const adminSupabase = getAdminSupabase();

  const { data: subscriptions, error } = await adminSupabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .is('revoked_at', null);

  if (error) {
    console.warn('[PUSH SUBSCRIPTIONS QUERY WARNING]', error);
    return;
  }

  if (!subscriptions || subscriptions.length === 0) {
    return;
  }

  const pushPayload = JSON.stringify({
    title: payload?.title || 'UniCoach 通知',
    body: payload?.body || '',
    url: safeUrl,
    type: payloadType,
    notificationId,
    icon: '/icon.png',
    badge: '/icon.png',
  });

  const promises = subscriptions.map(async (sub) => {
    const redactedEndpoint = redactEndpoint(sub.endpoint);

    try {
      await webpush.sendNotification({
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      }, pushPayload);

      const { error: updateError } = await adminSupabase
        .from('push_subscriptions')
        .update({
          last_sent_at: new Date().toISOString(),
          last_error: null,
          last_error_at: null,
        })
        .eq('id', sub.id);

      if (updateError) {
        console.warn('[PUSH SUBSCRIPTION SENT UPDATE WARNING]', updateError);
      }

      await recordDeliveryLog(adminSupabase, {
        notification_id: notificationId,
        user_id: userId,
        subscription_id: sub.id,
        channel: 'web_push',
        status: 'sent',
        endpoint: redactedEndpoint,
        payload_type: payloadType,
        payload_url: safeUrl,
        sent_at: new Date().toISOString(),
      });
    } catch (err) {
      const errorMessage = normalizePushError(err);
      const isExpired = err?.statusCode === 410 || err?.statusCode === 404;
      const status = isExpired ? 'expired' : 'failed';

      await incrementFailureCount(adminSupabase, sub);

      const updatePayload = {
        last_error: errorMessage,
        last_error_at: new Date().toISOString(),
      };

      if (isExpired) {
        updatePayload.revoked_at = new Date().toISOString();
      }

      const { error: updateError } = await adminSupabase
        .from('push_subscriptions')
        .update(updatePayload)
        .eq('id', sub.id);

      if (updateError) {
        console.warn('[PUSH SUBSCRIPTION ERROR UPDATE WARNING]', updateError);
      }

      await recordDeliveryLog(adminSupabase, {
        notification_id: notificationId,
        user_id: userId,
        subscription_id: sub.id,
        channel: 'web_push',
        status,
        endpoint: redactedEndpoint,
        error_code: String(err?.statusCode || 'unknown').slice(0, 64),
        error_message: errorMessage,
        payload_type: payloadType,
        payload_url: safeUrl,
      });
    }
  });

  await Promise.allSettled(promises);
}
