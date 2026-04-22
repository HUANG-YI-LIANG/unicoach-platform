import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

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
    const { data: video, error: videoError } = await adminSupabase
      .from('coach_videos')
      .select('id, view_count, like_count, share_count')
      .eq('id', videoId)
      .single();

    if (videoError || !video) {
      return NextResponse.json({ error: '找不到影片' }, { status: 404 });
    }

    if (action === 'view') {
      const viewCount = normalizeCount(video.view_count) + 1;
      await adminSupabase
        .from('coach_videos')
        .update({ view_count: viewCount })
        .eq('id', videoId);

      return NextResponse.json({ success: true, view_count: viewCount });
    }

    if (action === 'share') {
      const shareCount = normalizeCount(video.share_count) + 1;
      await adminSupabase
        .from('coach_videos')
        .update({ share_count: shareCount })
        .eq('id', videoId);

      return NextResponse.json({ success: true, share_count: shareCount });
    }

    const auth = await requireAuth();
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const { data: existingLike } = await adminSupabase
      .from('video_likes')
      .select('id')
      .eq('video_id', videoId)
      .eq('user_id', auth.user.id)
      .maybeSingle();

    let liked = false;
    let likeCount = normalizeCount(video.like_count);

    if (existingLike) {
      const { error: deleteError } = await adminSupabase
        .from('video_likes')
        .delete()
        .eq('id', existingLike.id);

      if (deleteError) throw deleteError;
      likeCount = Math.max(0, likeCount - 1);
    } else {
      const { error: insertError } = await adminSupabase
        .from('video_likes')
        .insert([{ video_id: videoId, user_id: auth.user.id }]);

      if (insertError) throw insertError;
      liked = true;
      likeCount += 1;
    }

    await adminSupabase
      .from('coach_videos')
      .update({ like_count: likeCount })
      .eq('id', videoId);

    return NextResponse.json({ success: true, liked, like_count: likeCount });
  } catch (error) {
    console.error('Video interaction error:', error);
    return NextResponse.json({ error: '影片互動失敗' }, { status: 500 });
  }
}
