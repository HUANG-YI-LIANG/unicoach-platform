import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';

// ============================================================
// URL 解析引擎：支援 YouTube 與 Vimeo
// ============================================================
function parseVideoUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const sanitizedUrl = url.trim();
  
  if (sanitizedUrl.length > 500) return null;
  if (!/^https?:\/\//i.test(sanitizedUrl)) return null;

  // 1. YouTube 解析
  const youtubePatterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
  ];

  for (const pattern of youtubePatterns) {
    const match = sanitizedUrl.match(pattern);
    if (match) {
      const videoId = match[1];
      return {
        platform: 'youtube',
        videoId: videoId,
        originalUrl: sanitizedUrl,
        embedUrl: `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        fallbackThumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      };
    }
  }

  // 2. Vimeo 解析
  const vimeoPatterns = [
    /(?:vimeo\.com\/)(\d+)/,
    /(?:vimeo\.com\/video\/)(\d+)/,
    /(?:player\.vimeo\.com\/video\/)(\d+)/
  ];

  for (const pattern of vimeoPatterns) {
    const match = sanitizedUrl.match(pattern);
    if (match) {
      const videoId = match[1];
      return {
        platform: 'vimeo',
        videoId: videoId,
        originalUrl: sanitizedUrl,
        embedUrl: `https://player.vimeo.com/video/${videoId}?badge=0&autopause=0`,
        thumbnailUrl: null // 需要動態獲取
      };
    }
  }

  return null;
}

// ============================================================
// Vimeo OEmbed 縮圖與元數據提取
// ============================================================
async function fetchVimeoMetadata(videoId) {
  try {
    const response = await fetch(
      `https://vimeo.com/api/oembed.json?url=https://vimeo.com/${videoId}&width=640`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!response.ok) {
      if (response.status === 403) return { isPrivate: true };
      throw new Error(`Vimeo API Error: ${response.status}`);
    }
    const data = await response.json();
    
    const duration = data.duration || null;
    let durationFormatted = null;
    if (duration) {
      const mins = Math.floor(duration / 60);
      const secs = duration % 60;
      durationFormatted = `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    return {
      isPrivate: false,
      title: data.title,
      thumbnailUrl: data.thumbnail_url?.replace(/_\d+x\d+/, '_640'),
      duration,
      durationFormatted
    };
  } catch (error) {
    console.error('[VIMEO FETCH ERROR]', error);
    return { isPrivate: false, fetchError: true };
  }
}

// ============================================================
// POST：新增影片連結
// ============================================================
export async function POST(request) {
  try {
    const auth = await requireAuth(['coach', 'admin']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const { url, category = 'teaching', title: userInputTitle, isFeatured = false } = await request.json();

    const parsed = parseVideoUrl(url);
    if (!parsed) {
      return NextResponse.json({ error: '不支援的影片連結格式。支援 YouTube 與 Vimeo。' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();

    // 1. 檢查數量限制 (DB 也會有觸發器防護)
    const { count: videoCount } = await adminSupabase
      .from('user_videos')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', auth.user.id)
      .eq('is_active', true);

    if (videoCount >= 10) {
      return NextResponse.json({ error: '影片數量已達上限（最多 10 支）' }, { status: 400 });
    }

    // 2. 獲取平台特定元數據
    let finalThumbnail = parsed.thumbnailUrl;
    let finalTitle = userInputTitle || null;
    let duration = null;
    let durationFormatted = null;
    let isPrivate = false;

    if (parsed.platform === 'vimeo') {
      const vimeoData = await fetchVimeoMetadata(parsed.videoId);
      if (vimeoData.isPrivate) {
        isPrivate = true;
        finalThumbnail = null; // 展示時使用 Fallback
      } else {
        finalThumbnail = vimeoData.thumbnailUrl;
        if (!finalTitle) finalTitle = vimeoData.title;
        duration = vimeoData.duration;
        durationFormatted = vimeoData.durationFormatted;
      }
    }

    // 3. 寫入資料庫
    const { data: newVideo, error: insertError } = await adminSupabase
      .from('user_videos')
      .insert([{
        user_id: auth.user.id,
        platform: parsed.platform,
        video_id: parsed.videoId,
        original_url: parsed.originalUrl,
        embed_url: parsed.embedUrl,
        thumbnail_url: finalThumbnail,
        title: finalTitle,
        duration,
        duration_formatted: durationFormatted,
        category,
        is_featured: isFeatured,
        is_private: isPrivate
      }])
      .select('*')
      .single();

    if (insertError) {
      if (insertError.code === '23505') return NextResponse.json({ error: '此影片已存在於您的列表中' }, { status: 409 });
      throw insertError;
    }

    // 4. 記錄審計日誌
    await adminSupabase.from('audit_logs').insert([{
      action: 'ADD_VIDEO',
      actor_id: auth.user.id,
      actor_role: auth.user.role,
      details: JSON.stringify({ platform: parsed.platform, video_id: parsed.videoId })
    }]);

    return NextResponse.json({ success: true, video: newVideo });
  } catch (err) {
    console.error('[VIDEO API ERROR]', err);
    return NextResponse.json({ error: '發生錯誤，請稍後再試' }, { status: 500 });
  }
}

// ============================================================
// GET：取得影片列表
// ============================================================
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: '缺少 userId' }, { status: 400 });

    const adminSupabase = getAdminSupabase();
    const { data: videos, error } = await adminSupabase
      .from('user_videos')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('is_featured', { ascending: false })
      .order('display_order', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ videos });
  } catch (err) {
    return NextResponse.json({ error: '獲取影片列表失敗' }, { status: 500 });
  }
}

// ============================================================
// DELETE：刪除影片 (軟刪除)
// ============================================================
export async function DELETE(request) {
  try {
    const auth = await requireAuth(['coach', 'admin']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: '缺少影片 ID' }, { status: 400 });

    const adminSupabase = getAdminSupabase();
    
    // 權限檢查
    const { data: video } = await adminSupabase.from('user_videos').select('user_id').eq('id', id).single();
    if (!video) return NextResponse.json({ error: '影片不存在' }, { status: 404 });
    if (video.user_id !== auth.user.id && auth.user.role !== 'admin') {
      return NextResponse.json({ error: '無權限操作' }, { status: 403 });
    }

    const { error: deleteError } = await adminSupabase
      .from('user_videos')
      .update({ is_active: false })
      .eq('id', id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: '刪除失敗' }, { status: 500 });
  }
}
