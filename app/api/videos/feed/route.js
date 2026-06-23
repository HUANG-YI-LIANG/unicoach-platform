export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { safeErrorDetails } from '@/lib/safeLogging';

const PUBLIC_VIDEO_FEED_SELECT = 'id, coach_id, video_url, title, category, view_count, like_count, share_count, created_at';
const PUBLIC_VIDEO_COACH_SELECT = 'user_id, base_price, approval_status';
const PUBLIC_VIDEO_USER_SELECT = 'id, name, avatar_url, is_frozen';

export async function GET(request) {
  try {
    const adminSupabase = getAdminSupabase();
    const auth = await requireAuth();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = (page - 1) * limit;

    const { data: rawVideos, error } = await adminSupabase
      .from('coach_videos')
      .select(PUBLIC_VIDEO_FEED_SELECT)
      .order('like_count', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching video feed:', safeErrorDetails(error));
      return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 });
    }

    const videos = rawVideos || [];
    const coachIds = [...new Set(videos.map(v => v.coach_id).filter(Boolean))];

    let usersMap = {};
    let coachesMap = {};
    let publicCoachIds = new Set();
    if (coachIds.length > 0) {
      const [{ data: usersData, error: usersError }, { data: coachesData, error: coachesError }] = await Promise.all([
        adminSupabase.from('users').select(PUBLIC_VIDEO_USER_SELECT).in('id', coachIds),
        adminSupabase.from('coaches').select(PUBLIC_VIDEO_COACH_SELECT).in('user_id', coachIds).eq('approval_status', 'approved')
      ]);

      if (usersError) throw usersError;
      if (coachesError) throw coachesError;

      (usersData || []).forEach(u => {
        if (!u.is_frozen) usersMap[u.id] = u;
      });
      (coachesData || []).forEach(c => {
        if (c.approval_status === 'approved' && usersMap[c.user_id]) {
          coachesMap[c.user_id] = c;
          publicCoachIds.add(c.user_id);
        }
      });
    }

    const publicVideos = videos.filter((video) => publicCoachIds.has(video.coach_id));
    const videoIds = publicVideos.map((video) => video.id);
    let likedVideoIds = new Set();

    if (!auth.error && auth.user?.id && videoIds.length > 0) {
      const { data: likes } = await adminSupabase
        .from('video_likes')
        .select('video_id')
        .eq('user_id', auth.user.id)
        .in('video_id', videoIds);

      likedVideoIds = new Set((likes || []).map((like) => like.video_id));
    }

    const formattedVideos = publicVideos.map(v => ({
      id: v.id,
      video_url: v.video_url,
      title: v.title,
      category: v.category,
      coach_id: v.coach_id,
      coach_name: usersMap[v.coach_id]?.name || '教練',
      coach_avatar: usersMap[v.coach_id]?.avatar_url || null,
      base_price: coachesMap[v.coach_id]?.base_price ?? 1000,
      view_count: v.view_count || 0,
      like_count: v.like_count || 0,
      share_count: v.share_count || 0,
      liked: likedVideoIds.has(v.id)
    }));

    return NextResponse.json({ 
      videos: formattedVideos,
      hasMore: rawVideos.length === limit,
      page,
      limit
    });
  } catch (error) {
    console.error('Video feed error:', safeErrorDetails(error));
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
