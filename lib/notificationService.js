import { getAdminSupabase } from './supabase';
import { sendPushNotification } from './pushManager';

export async function notifyUser({
  userId,
  title,
  content,
  type = 'general',
  url = '/notifications',
  metadata = {},
  push = true,
}) {
  const adminSupabase = getAdminSupabase();

  const { data: notification, error } = await adminSupabase
    .from('user_notifications')
    .insert([{
      user_id: userId,
      title,
      content,
    }])
    .select('id')
    .single();

  if (error) throw error;

  if (push && userId) {
    try {
      await sendPushNotification(userId, {
        title,
        body: content,
        url,
        type,
        notificationId: notification?.id,
      });
    } catch (pushError) {
      console.warn('[NOTIFICATION PUSH WARNING]', pushError);
    }
  }

  return notification;
}
