import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { ImageProcessor } from '@/lib/imageProcessor';
import { getAdminSupabase } from '@/lib/supabase';

export async function POST(request) {
  try {
    // 1. 權限檢查：允許一般使用者、教練與管理員上傳頭像與文件
    const auth = await requireAuth(['user', 'coach', 'admin']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const formData = await request.formData();
    const file = formData.get('file');
    const fileType = formData.get('fileType');

    // 2. 基本驗證
    if (!file || !fileType) {
      return NextResponse.json({ error: '請提供檔案與檔案類型 (fileType)' }, { status: 400 });
    }

    // 限制檔案大小 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: '檔案過大，限制為 5MB' }, { status: 400 });
    }

    // 3. 圖片處理 (Sharp)
    console.log(`[FILE UPLOAD] 開始處理檔案: ${file.name}, 類型: ${fileType}`);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let processed;
    try {
      processed = await ImageProcessor.processUpload(buffer, file.name);
    } catch (err) {
      return NextResponse.json({ error: `圖片處理失敗: ${err.message}` }, { status: 400 });
    }

    // 4. 上傳至 Supabase Storage (根據類型分 Bucket)
    let adminSupabase;
    try {
      adminSupabase = getAdminSupabase();
    } catch (envErr) {
      console.error('[UPLOAD ENV ERROR] Missing or invalid SUPABASE_SERVICE_ROLE_KEY', envErr.message);
      return NextResponse.json({ 
        error: '伺服器配置錯誤 (Missing API Key)', 
        details: '請檢查 Vercel 環境變數是否包含 SUPABASE_SERVICE_ROLE_KEY' 
      }, { status: 500 });
    }

    const bucketName =
      fileType === 'avatar'
        ? 'avatars'
        : fileType === 'payment_receipt'
          ? 'payment_receipts'
          : 'verifications';

    // 併行上傳所有尺寸
    try {
      const uploadTasks = Object.entries(processed.images).map(async ([sizeName, imageData]) => {
        const { error: uploadError } = await adminSupabase.storage
          .from(bucketName)
          .upload(imageData.filename, imageData.buffer, {
            contentType: 'image/webp',
            cacheControl: '3600',
            upsert: true
          });
        
        if (uploadError) {
          console.error(`[STORAGE UPLOAD ERROR] Size: ${sizeName}`, uploadError);
          throw uploadError;
        }
      });

      await Promise.all(uploadTasks);
    } catch (storageErr) {
      console.error('[STORAGE BUCKET ERROR] Deployment failed to write to bucket:', bucketName, storageErr);
      return NextResponse.json({ 
        error: '儲存服務連線失敗', 
        details: `請確認 Supabase 中存在 "${bucketName}" Bucket 且設定為 Public` 
      }, { status: 500 });
    }

    // 取得公開 URL (使用 medium 尺寸作為主路徑)
    const { data: { publicUrl } } = adminSupabase.storage
      .from(bucketName)
      .getPublicUrl(processed.images.medium.filename);

    const { data: { publicUrl: thumbnailLink } } = adminSupabase.storage
      .from(bucketName)
      .getPublicUrl(processed.images.thumbnail.filename);

    // 5. 如果是頭像，直接更新 users 表並返回
    if (fileType === 'avatar') {
      const { error: userUpdateError } = await adminSupabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', auth.user.id);

      if (userUpdateError) throw userUpdateError;

      // 審計日誌
      try {
        await adminSupabase.from('audit_logs').insert([{
          action: 'AVATAR_UPLOAD',
          actor_id: auth.user.id,
          actor_role: auth.user.role,
          target_id: auth.user.id,
          details: JSON.stringify({ filename: file.name, url: publicUrl })
        }]);
      } catch (auditErr) {
        console.warn('[AVATAR AUDIT LOG FAIL]', auditErr.message);
      }

      return NextResponse.json({ 
        success: true, 
        avatar_url: publicUrl 
      }, { status: 200 });
    }

    if (fileType === 'payment_receipt') {
      try {
        await adminSupabase.from('audit_logs').insert([{
          action: 'PAYMENT_RECEIPT_UPLOAD',
          actor_id: auth.user.id,
          actor_role: auth.user.role,
          target_id: auth.user.id,
          details: JSON.stringify({ filename: file.name, url: publicUrl }),
        }]);
      } catch (auditErr) {
        console.warn('[PAYMENT RECEIPT AUDIT LOG FAIL]', auditErr.message);
      }

      return NextResponse.json({
        success: true,
        url: publicUrl,
        thumbnail: thumbnailLink,
      }, { status: 201 });
    }

    // 6. 審核文件流程：資料庫更新 (或新增)
    // 檢查是否已存在同類型的檔案 (覆蓋舊件)
    const { data: existing } = await adminSupabase
      .from('user_files')
      .select('id')
      .eq('user_id', auth.user.id)
      .eq('file_type', fileType)
      .single();

    const fileData = {
      user_id: auth.user.id,
      file_type: fileType,
      original_filename: file.name,
      stored_filename: processed.images.medium.filename,
      file_size: processed.images.medium.size,
      mime_type: 'image/webp',
      thumbnail_url: thumbnailLink,
      compressed_url: publicUrl,
      verification_status: 'pending',
      updated_at: new Date().toISOString()
    };

    let dbResult;
    if (existing) {
      dbResult = await adminSupabase.from('user_files').update(fileData).eq('id', existing.id).select().single();
    } else {
      dbResult = await adminSupabase.from('user_files').insert([fileData]).select().single();
    }

    if (dbResult.error) throw dbResult.error;

    // 審計日誌
    try {
      await adminSupabase.from('audit_logs').insert([{
        action: 'FILE_UPLOAD',
        actor_id: auth.user.id,
        actor_role: auth.user.role,
        target_id: auth.user.id,
        details: JSON.stringify({ file_type: fileType, filename: file.name, url: publicUrl })
      }]);
    } catch (auditErr) {
      console.warn('[UPLOAD AUDIT LOG FAIL]', auditErr.message);
    }

    return NextResponse.json({ 
      success: true, 
      status: 'pending',
      thumbnail: thumbnailLink
    }, { status: 201 });

  } catch (err) {
    console.error('[UPLOAD FATAL ERROR]', {
      message: err.message,
      stack: err.stack
    });
    return NextResponse.json({ error: '上傳過程發生錯誤，請稍後再試' }, { status: 500 });
  }
}
