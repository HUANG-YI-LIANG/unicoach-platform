export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { safeErrorDetails } from '@/lib/safeLogging';

function normalizeCount(value) {
  return Math.max(0, Number(value || 0));
}

export async function POST(request) {
  try {
    const body = await request.json();
    const videoId = body.videoId;
    const action = body.action;

    if (!videoId || !['like', 'share', 'view'].includes(action)) {
      return NextResponse.json({ error: '互動參數不合法' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();

    if (action === 'view') {
      const viewCount = await adminSupabase.rpc('increment_video_stats', { p_video_id: videoId, p_field: 'view', p_increment: 1 })
        .then(({ data, error }) => {
          if (error) throw error;
          return data;
        });

      if (viewCount === null || viewCount === undefined) {
        return NextResponse.json({ error: '找不到影片' }, { status: 404 });
      }

      return NextResponse.json({ success: true, view_count: normalizeCount(viewCount) });
    }

    if (action === 'share') {
      const shareCount = await adminSupabase.rpc('increment_video_stats', { p_video_id: videoId, p_field: 'share', p_increment: 1 })
        .then(({ data, error }) => {
          if (error) throw error;
          return data;
        });

      if (shareCount === null || shareCount === undefined) {
        return NextResponse.json({ error: '找不到影片' }, { status: 404 });
      }

      return NextResponse.json({ success: true, share_count: normalizeCount(shareCount) });
    }

    const auth = await requireAuth();
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const { data: videoExists, error: videoExistsError } = await adminSupabase
      .from('coach_videos')
      .select('id')
      .eq('id', videoId)
      .maybeSingle();

    if (videoExistsError) throw videoExistsError;
    if (!videoExists) {
      return NextResponse.json({ error: '找不到影片' }, { status: 404 });
    }

    const { data: existingLike } = await adminSupabase
      .from('video_likes')
      .select('id')
      .eq('video_id', videoId)
      .eq('user_id', auth.user.id)
      .maybeSingle();

    let liked = false;

    if (existingLike) {
      const { error: deleteError } = await adminSupabase
        .from('video_likes')
        .delete()
        .eq('id', existingLike.id);

      if (deleteError) throw deleteError;
    } else {
      const { error: insertError } = await adminSupabase
        .from('video_likes')
        .insert([{ video_id: videoId, user_id: auth.user.id }]);

      if (insertError) throw insertError;
      liked = true;
    }

    const { data: likeCountRaw, error: likeCountError } = await adminSupabase.rpc('increment_video_stats', {
      p_video_id: videoId,
      p_field: 'like',
      p_increment: (liked ? 1 : -1),
    });

    if (likeCountError) throw likeCountError;

    const likeCount = likeCountRaw === null || likeCountRaw === undefined ? null : normalizeCount(likeCountRaw);

    if (likeCount === null) {
      return NextResponse.json({ error: '找不到影片' }, { status: 404 });
    }

    return NextResponse.json({ success: true, liked, like_count: likeCount });
  } catch (error) {
    console.error('Video interaction error:', safeErrorDetails(error));
    return NextResponse.json({ error: '影片互動失敗' }, { status: 500 });
  }
}
