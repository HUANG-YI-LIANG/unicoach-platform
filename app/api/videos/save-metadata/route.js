export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireApprovedCoach } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';

function isUnsupportedQuickTimeVideoUrl(value = '') {
  return /\.(mov|qt)(\?|#|$)/i.test(String(value)) || /quicktime/i.test(String(value));
}

function isBrowserPlayableVideoUrl(value = '') {
  return /\.(mp4|webm)(\?|#|$)/i.test(String(value));
}

export async function POST(request) {
  try {
    const auth = await requireApprovedCoach();
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const body = await request.json();
    const { title, category, publicUrl } = body;

    if (!title || !category || !publicUrl) {
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
    }

    if (isUnsupportedQuickTimeVideoUrl(publicUrl) || !isBrowserPlayableVideoUrl(publicUrl)) {
      return NextResponse.json({ error: '不支援的影片網址。MOV / QuickTime 請先轉成 MP4 後再上傳，支援格式為 mp4 或 webm。' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();
    const coachId = auth.user.id;

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
      .select()
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
      console.warn('[VIDEO METADATA AUDIT LOG ERROR]', auditError);
    }

    return NextResponse.json({ success: true, video: videoRecord });

  } catch (err) {
    console.error('[SAVE METADATA ERROR]', err);
    return NextResponse.json({ error: '資料庫寫入失敗' }, { status: 500 });
  }
}
