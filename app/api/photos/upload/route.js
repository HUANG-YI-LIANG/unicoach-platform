export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireApprovedCoach } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';
import { getCoachMediaLimits } from '@/lib/coachPerformance';
import { v4 as uuidv4 } from 'uuid';

const PHOTO_UPLOAD_MAX_MB = 10;
const PHOTO_UPLOAD_MAX_BYTES = PHOTO_UPLOAD_MAX_MB * 1024 * 1024;

export async function POST(request) {
  try {
    const auth = await requireApprovedCoach();
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: '請提供照片檔案' }, { status: 400 });
    }

    if (file.size > PHOTO_UPLOAD_MAX_BYTES) {
      return NextResponse.json({ error: `檔案過大，限制為 ${PHOTO_UPLOAD_MAX_MB}MB` }, { status: 400 });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: '不支援的照片格式，請使用 JPG, PNG 或 WEBP。' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();
    const coachId = auth.user.id;

    const limits = await getCoachMediaLimits(coachId, adminSupabase);
    const maxPhotos = limits.max_photos;

    // Get current photos from coaches table
    const { data: coachData, error: fetchError } = await adminSupabase
      .from('coaches')
      .select('photos')
      .eq('user_id', coachId)
      .single();

    if (fetchError) throw fetchError;

    const currentPhotos = coachData.photos || [];

    if (currentPhotos.length >= maxPhotos) {
      return NextResponse.json({ error: `照片數量已達上限 (${maxPhotos} 張)。提升教練等級或聯繫客服擴充容量。` }, { status: 400 });
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `coach-photos/${coachId}/${fileName}`;

    // Note: We upload directly to the avatars bucket
    const { data: storageData, error: storageError } = await adminSupabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (storageError) {
      console.error('[PHOTO STORAGE ERROR]', storageError);
      return NextResponse.json({ error: 'Storage 上傳失敗' }, { status: 500 });
    }

    const { data: { publicUrl } } = adminSupabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const newPhoto = {
      id: uuidv4(),
      url: publicUrl,
      created_at: new Date().toISOString()
    };

    const updatedPhotos = [newPhoto, ...currentPhotos];

    const { error: dbError } = await adminSupabase
      .from('coaches')
      .update({ photos: updatedPhotos })
      .eq('user_id', coachId);

    if (dbError) throw dbError;

    return NextResponse.json({ success: true, photo: newPhoto }, { status: 201 });

  } catch (err) {
    console.error('[PHOTO UPLOAD FATAL ERROR]', err);
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const auth = await requireApprovedCoach();
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const adminSupabase = getAdminSupabase();
    const limits = await getCoachMediaLimits(auth.user.id, adminSupabase);

    const { data: coachData, error } = await adminSupabase
      .from('coaches')
      .select('photos')
      .eq('user_id', auth.user.id)
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      photos: coachData.photos || [],
      limits
    });
  } catch (err) {
    console.error('[PHOTO FETCH ERROR]', err);
    return NextResponse.json({ error: '載入照片失敗' }, { status: 500 });
  }
}
