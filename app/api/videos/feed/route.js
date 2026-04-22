import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const adminSupabase = getAdminSupabase();
    const auth = await requireAuth();

    // Fetch videos and join with coach (to get base_price) and users (to get name, avatar)
    // Since we need information from users, and coach_videos links to users via coach_id,
    // we can do a nested join.
    const { data: videos, error } = await adminSupabase
      .from('coach_videos')
      .select(`
        *,
        coach:coaches!coach_videos_coach_id_fkey (
          base_price
        ),
        user:users!coach_videos_coach_id_fkey (
          name,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching video feed:', error);
      return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 });
    }

    const videoIds = (videos || []).map((video) => video.id);
    let likedVideoIds = new Set();

    if (!auth.error && auth.user?.id && videoIds.length > 0) {
      const { data: likes } = await adminSupabase
        .from('video_likes')
        .select('video_id')
        .eq('user_id', auth.user.id)
        .in('video_id', videoIds);

      likedVideoIds = new Set((likes || []).map((like) => like.video_id));
    }

    const formattedVideos = (videos || []).map(v => ({
      id: v.id,
      video_url: v.video_url,
      title: v.title,
      category: v.category,
      coach_id: v.coach_id,
      coach_name: v.user?.name || '教練',
      coach_avatar: v.user?.avatar_url || null,
      base_price: v.coach?.base_price || 1000,
      view_count: v.view_count || 0,
      like_count: v.like_count || 0,
      share_count: v.share_count || 0,
      liked: likedVideoIds.has(v.id)
    }));

    return NextResponse.json({ videos: formattedVideos });
  } catch (error) {
    console.error('Video feed error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
