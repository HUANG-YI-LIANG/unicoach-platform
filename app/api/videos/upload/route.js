import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export const config = {
  api: {
    bodyParser: false, // 讓 formidable 或其他解析器處理 multipart
  },
};

export async function POST(request) {
  try {
    // 1. 權限檢查：只有教練能上傳
    const auth = await requireAuth(['coach']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const formData = await request.formData();
    const file = formData.get('file');
    const title = formData.get('title');
    const category = formData.get('category'); // teaching, intro, highlight

    // 2. 基本驗證
    if (!file || !title || !category) {
      return NextResponse.json({ error: '請提供影片檔案、標題與分類' }, { status: 400 });
    }

    // 驗證分類
    const validCategories = ['teaching', 'intro', 'highlight'];
    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: '無效的分類' }, { status: 400 });
    }

    // 限制檔案大小 (50MB)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: '檔案過大，限制為 50MB' }, { status: 400 });
    }

    // 限制支援格式
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime']; // quicktime is .mov
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: '不支援的影片格式，請使用 mp4, webm 或 mov' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();
    const coachId = auth.user.id;

    // 3. 檢查影片數量限制 (最多 10 支)
    const { count, error: countError } = await adminSupabase
      .from('coach_videos')
      .select('*', { count: 'exact', head: true })
      .eq('coach_id', coachId);

    if (countError) throw countError;
    if (count >= 10) {
      return NextResponse.json({ error: '影片數量已達上限 (10 支)，請先刪除舊影片' }, { status: 400 });
    }

    // 4. 上傳至 Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `${coachId}/${fileName}`;

    const { data: storageData, error: storageError } = await adminSupabase.storage
      .from('coach-videos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (storageError) {
      console.error('[STORAGE ERROR]', storageError);
      return NextResponse.json({ error: 'Storage 上傳失敗' }, { status: 500 });
    }

    // 取得公開 URL
    const { data: { publicUrl } } = adminSupabase.storage
      .from('coach-videos')
      .getPublicUrl(filePath);

    // 5. 寫入資料庫
    const { data: videoRecord, error: dbError } = await adminSupabase
      .from('coach_videos')
      .insert([{
        coach_id: coachId,
        video_url: publicUrl,
        title: title.trim(),
        category: category,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (dbError) throw dbError;

    // 6. 審計日誌
    await adminSupabase.from('audit_logs').insert([{
      action: 'VIDEO_UPLOAD',
      actor_id: coachId,
      actor_role: 'coach',
      details: JSON.stringify({ video_id: videoRecord.id, category: category })
    }]);

    return NextResponse.json({ success: true, video: videoRecord }, { status: 201 });

  } catch (err) {
    console.error('[VIDEO UPLOAD FATAL ERROR]', err);
    return NextResponse.json({ error: '伺服器錯誤，請確認資料庫 Table 是否已建立' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const auth = await requireAuth(['coach']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const adminSupabase = getAdminSupabase();
    const { data: videos, error } = await adminSupabase
      .from('coach_videos')
      .select('*')
      .eq('coach_id', auth.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ videos });
  } catch (err) {
    console.error('[VIDEO FETCH ERROR]', err);
    return NextResponse.json({ error: '載入影片失敗' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const auth = await requireAuth(['coach']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('id');

    if (!videoId) return NextResponse.json({ error: 'Missing video ID' }, { status: 400 });

    const adminSupabase = getAdminSupabase();
    
    // 檢查擁有權
    const { data: video } = await adminSupabase
      .from('coach_videos')
      .select('*')
      .eq('id', videoId)
      .eq('coach_id', auth.user.id)
      .single();

    if (!video) return NextResponse.json({ error: '影片不存在或無權限刪除' }, { status: 404 });

    // 1. 刪除資料庫紀錄
    const { error: dbError } = await adminSupabase.from('coach_videos').delete().eq('id', videoId);
    if (dbError) throw dbError;

    // 2. 刪除 Storage 檔案
    // 從 URL 提取路徑：...coach-videos/{coachId}/{filename}
    const pathParts = video.video_url.split('coach-videos/');
    if (pathParts.length > 1) {
      const filePath = pathParts[1];
      await adminSupabase.storage.from('coach-videos').remove([filePath]);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[VIDEO DELETE ERROR]', err);
    return NextResponse.json({ error: '刪除失敗' }, { status: 500 });
  }
}
