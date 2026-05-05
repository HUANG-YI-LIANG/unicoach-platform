import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';

export async function POST(request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const adminSupabase = getAdminSupabase();
    const { coachId } = await request.json();

    if (!coachId) {
      return NextResponse.json({ error: 'Missing coachId' }, { status: 400 });
    }

    // 檢查是否已收藏
    const { data: existing } = await adminSupabase
      .from('favorite_coaches')
      .select('id')
      .eq('user_id', auth.user.id)
      .eq('coach_id', coachId)
      .single();

    if (existing) {
      // 取消收藏
      await adminSupabase.from('favorite_coaches').delete().eq('id', existing.id);
      return NextResponse.json({ success: true, is_favorite: false });
    } else {
      // 新增收藏
      await adminSupabase.from('favorite_coaches').insert([{ user_id: auth.user.id, coach_id: coachId }]);
      return NextResponse.json({ success: true, is_favorite: true });
    }

  } catch (error) {
    console.error('[FAVORITE ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
