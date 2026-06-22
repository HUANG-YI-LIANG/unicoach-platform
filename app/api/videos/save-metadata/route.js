export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireApprovedCoach } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';
import { safeErrorDetails } from '@/lib/safeLogging';
import { getCoachMediaLimits } from '@/lib/coachPerformance';

const VALID_VIDEO_CATEGORIES = new Set(['teaching', 'intro', 'highlight']);

function isUnsupportedQuickTimeVideoUrl(value = '') {
  return /\.(mov|qt)(\?|#|$)/i.test(String(value)) || /quicktime/i.test(String(value));
}

function isBrowserPlayableVideoUrl(value = '') {
  return /\.(mp4|webm)(\?|#|$)/i.test(String(value));
}

function normalizeStoragePath(value = '') {
  return String(value || '').trim().replace(/^\/+/, '');
}

function getStorageParentPath(filePath) {
  const lastSlash = filePath.lastIndexOf('/');
  return lastSlash >= 0 ? filePath.slice(0, lastSlash) : '';
}

function getStorageFileName(filePath) {
  const lastSlash = filePath.lastIndexOf('/');
  return lastSlash >= 0 ? filePath.slice(lastSlash + 1) : filePath;
}

export async function POST(request) {
  try {
    const auth = await requireApprovedCoach();
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const body = await request.json();
    const { title, category, path } = body;

    if (!title || !category || !path) {
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
    }

    if (!VALID_VIDEO_CATEGORIES.has(category)) {
      return NextResponse.json({ error: '無效的分類' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();
    const coachId = auth.user.id;
    const filePath = normalizeStoragePath(path);

    if (!filePath || !filePath.startsWith(`${coachId}/`) || filePath.includes('..')) {
      return NextResponse.json({ error: '影片路徑無效' }, { status: 400 });
    }

    if (isUnsupportedQuickTimeVideoUrl(filePath) || !isBrowserPlayableVideoUrl(filePath)) {
      return NextResponse.json({ error: '不支援的影片網址。MOV / QuickTime 請先轉成 MP4 後再上傳，支援格式為 mp4 或 webm。' }, { status: 400 });
    }

    const parentPath = getStorageParentPath(filePath);
    const fileName = getStorageFileName(filePath);
    const { data: storedObjects, error: storageError } = await adminSupabase.storage
      .from('coach-videos')
      .list(parentPath, { search: fileName, limit: 1 });

    if (storageError) throw storageError;

    const objectExists = (storedObjects || []).some((object) => object.name === fileName);
    if (!objectExists) {
      return NextResponse.json({ error: '找不到已上傳的影片檔案' }, { status: 400 });
    }

    const limits = await getCoachMediaLimits(coachId, adminSupabase);
    const maxVideos = limits.max_videos;

    const { count, error: countError } = await adminSupabase
      .from('coach_videos')
      .select('id', { count: 'exact', head: true })
      .eq('coach_id', coachId);

    if (countError) throw countError;
    if ((count || 0) >= maxVideos) {
      return NextResponse.json({ error: `影片數量已達上限 (${maxVideos} 支)。提升教練等級或聯繫客服擴充容量。` }, { status: 400 });
    }

    const { data: { publicUrl } } = adminSupabase.storage
      .from('coach-videos')
      .getPublicUrl(filePath);

    // Save video record
    const { data: videoRecord, error: dbError } = await adminSupabase
      .from('coach_videos')
      .insert([{
        coach_id: coachId,
        video_url: publicUrl,
        title: title.trim(),
        category: category,
        view_count: 0,
        like_count: 0,
        share_count: 0,
        created_at: new Date().toISOString()
      }])
      .select('id, coach_id, video_url, title, category, view_count, like_count, share_count, created_at')
      .single();

    if (dbError) throw dbError;

    // Audit log should never turn a successful upload into a 500.
    try {
      await adminSupabase.from('audit_logs').insert([{
        action: 'VIDEO_UPLOAD_DIRECT',
        actor_id: coachId,
        actor_role: 'coach',
        details: JSON.stringify({ video_id: videoRecord.id, category: category })
      }]);
    } catch (auditError) {
      console.warn('[VIDEO METADATA AUDIT LOG ERROR]', safeErrorDetails(auditError));
    }

    return NextResponse.json({ success: true, video: videoRecord });

  } catch (err) {
    console.error('[SAVE METADATA ERROR]', safeErrorDetails(err));
    return NextResponse.json({ error: '資料庫寫入失敗' }, { status: 500 });
  }
}
