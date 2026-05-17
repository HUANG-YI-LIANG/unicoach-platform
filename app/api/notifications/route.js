export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';

export async function GET(request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const adminSupabase = getAdminSupabase();

    const { data: notifications, error: notifError } = await adminSupabase
      .from('user_notifications')
      .select('*')
      .or(`user_id.eq.${auth.user.id},user_id.is.null`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (notifError) {
      if (notifError.code === '42P01') {
         return NextResponse.json({ notifications: [] });
      }
      throw notifError;
    }

    if (!notifications || notifications.length === 0) {
      return NextResponse.json({ notifications: [] });
    }

    const { data: reads, error: readsError } = await adminSupabase
      .from('notification_reads')
      .select('notification_id')
      .eq('user_id', auth.user.id);

    if (readsError && readsError.code !== '42P01') {
      throw readsError;
    }

    const readSet = new Set((reads || []).map(r => r.notification_id));

    const enriched = notifications.map(n => {
      if (n.user_id === null) {
        return { ...n, is_read: readSet.has(n.id) };
      }
      return n;
    });

    return NextResponse.json({ notifications: enriched });
  } catch (err) {
    console.error('[FETCH NOTIFICATIONS ERROR]', err);
    return NextResponse.json({ error: '無法獲取通知' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    const adminSupabase = getAdminSupabase();
    
    const { data: notification, error: getError } = await adminSupabase
      .from('user_notifications')
      .select('user_id')
      .eq('id', id)
      .single();

    if (getError) throw getError;

    if (notification.user_id === auth.user.id) {
      const { error } = await adminSupabase
        .from('user_notifications')
        .update({ is_read: true })
        .eq('id', id);
      if (error) throw error;
    } else if (notification.user_id === null) {
      const { error } = await adminSupabase
        .from('notification_reads')
        .upsert({ user_id: auth.user.id, notification_id: id }, { onConflict: 'notification_id,user_id' });
      if (error) throw error;
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[MARK READ ERROR]', err);
    return NextResponse.json({ error: '更新失敗' }, { status: 500 });
  }
}
