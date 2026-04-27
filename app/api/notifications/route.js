import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';

export async function GET(request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const adminSupabase = getAdminSupabase();

    const { data: notifications, error } = await adminSupabase
      .from('user_notifications')
      .select('*')
      .or(`user_id.eq.${auth.user.id},user_id.is.null`)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01') {
         // Table does not exist yet (migration not run)
         return NextResponse.json({ notifications: [] });
      }
      throw error;
    }

    return NextResponse.json({ notifications });
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
    
    // Check if it's a global notification (user_id is null)
    // If it's global, we can't easily mark it as read for just one user without a join table.
    // For now, we only mark user-specific ones as read. Global ones might just stay.
    // A simpler approach is to ignore read status for global, or implement a user_read_notifications table.
    
    const { error } = await adminSupabase
      .from('user_notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', auth.user.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[MARK READ ERROR]', err);
    return NextResponse.json({ error: '更新失敗' }, { status: 500 });
  }
}
