export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireApprovedCoach } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';
import { getCoachMediaLimits } from '@/lib/coachPerformance';
import { v4 as uuidv4 } from 'uuid';

const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];

function isUnsupportedQuickTimeVideoUrl(value = '') {
  return /\.(mov|qt)(\?|#|$)/i.test(String(value)) || /quicktime/i.test(String(value));
}

export async function POST(request) {
  try {
    const auth = await requireApprovedCoach();
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const body = await request.json();
    const { filename, contentType } = body;

    if (!filename || !contentType) {
      return NextResponse.json({ error: 'Missing filename or contentType' }, { status: 400 });
    }

    if (contentType === 'video/quicktime' || isUnsupportedQuickTimeVideoUrl(filename)) {
      return NextResponse.json({ error: '不支援 MOV / QuickTime，請先轉成 MP4 後再上傳。支援格式：mp4、webm' }, { status: 400 });
    }

    if (!ALLOWED_VIDEO_TYPES.includes(contentType)) {
      return NextResponse.json({ error: '不支援的影片格式，請使用 mp4 或 webm。MOV / QuickTime 請先轉成 MP4 後再上傳。' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();
    const coachId = auth.user.id;

    // Check video limit using dynamic tiers
    const limits = await getCoachMediaLimits(coachId, adminSupabase);
    const maxVideos = limits.max_videos;

    const { count, error: countError } = await adminSupabase
      .from('coach_videos')
      .select('*', { count: 'exact', head: true })
      .eq('coach_id', coachId);

    if (countError) throw countError;
    if (count >= maxVideos) {
      return NextResponse.json({ error: `影片數量已達上限 (${maxVideos} 支)。提升教練等級或聯繫客服擴充容量。` }, { status: 400 });
    }

    const fileExt = filename.split('.').pop();
    const uniqueName = `${uuidv4()}.${fileExt}`;
    const filePath = `${coachId}/${uniqueName}`;

    // Create a presigned URL valid for 15 minutes
    const { data, error } = await adminSupabase.storage
      .from('coach-videos')
      .createSignedUploadUrl(filePath);

    if (error) {
      console.error('[PRESIGNED URL ERROR]', error);
      return NextResponse.json({ error: '無法產生上傳憑證' }, { status: 500 });
    }

    // Also get the final public URL so the client knows what the URL will be
    const { data: { publicUrl } } = adminSupabase.storage
      .from('coach-videos')
      .getPublicUrl(filePath);

    return NextResponse.json({
      signedUrl: data.signedUrl,
      path: filePath,
      token: data.token,
      publicUrl: publicUrl
    });

  } catch (err) {
    console.error('[PRESIGNED URL EXCEPTION]', err);
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
