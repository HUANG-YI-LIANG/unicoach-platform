export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireApprovedCoach } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';

export async function DELETE(request) {
  try {
    const auth = await requireApprovedCoach();
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: '請提供要刪除的照片 ID' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();
    const coachId = auth.user.id;

    // 取得目前照片
    const { data: coachData, error: fetchError } = await adminSupabase
      .from('coaches')
      .select('photos')
      .eq('user_id', coachId)
      .single();

    if (fetchError) throw fetchError;

    const currentPhotos = coachData.photos || [];
    const photoToDelete = currentPhotos.find(p => p.id === id);

    if (!photoToDelete) {
      return NextResponse.json({ error: '找不到該照片' }, { status: 404 });
    }

    // 刪除 Storage 中的檔案 (可選，但為了節省空間我們執行刪除)
    if (photoToDelete.url) {
      try {
        const urlParts = photoToDelete.url.split('/');
        // URL roughly ends with avatars/coach-photos/coachId/fileName
        // We find the path after "avatars/"
        const bucketIndex = urlParts.indexOf('avatars');
        if (bucketIndex !== -1) {
          const pathToDelete = urlParts.slice(bucketIndex + 1).join('/');
          await adminSupabase.storage.from('avatars').remove([pathToDelete]);
        }
      } catch (e) {
        console.error('[PHOTO DELETE STORAGE ERROR]', e);
        // Ignore storage delete errors to ensure DB is updated
      }
    }

    // 更新資料庫
    const updatedPhotos = currentPhotos.filter(p => p.id !== id);

    const { error: dbError } = await adminSupabase
      .from('coaches')
      .update({ photos: updatedPhotos })
      .eq('user_id', coachId);

    if (dbError) throw dbError;

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (err) {
    console.error('[PHOTO DELETE FATAL ERROR]', err);
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
