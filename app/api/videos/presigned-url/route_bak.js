import { NextResponse } from 'next/server';
import { requireApprovedCoach } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

export async function POST(request) {
  try {
    const auth = await requireApprovedCoach();
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const body = await request.json();
    const { filename, contentType } = body;

    if (!filename || !contentType) {
      return NextResponse.json({ error: 'Missing filename or contentType' }, { status: 400 });
    }

    if (!ALLOWED_VIDEO_TYPES.includes(contentType)) {
      return NextResponse.json({ error: '不支援的影片格式，請使用 mp4、webm 或 mov' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();
    const coachId = auth.user.id;

    // Check video limit (max 10)
    const { count, error: countError } = await adminSupabase
      .from('coach_videos')
      .select('*', { count: 'exact', head: true })
      .eq('coach_id', coachId);

    if (countError) throw countError;
    if (count >= 10) {
      return NextResponse.json({ error: '影片數量已達上限 (10 支)，請先刪除舊影片' }, { status: 400 });
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
