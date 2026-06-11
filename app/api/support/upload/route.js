export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';
import { safeErrorDetails } from '@/lib/safeLogging';

const MAX_SUPPORT_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const EXT_BY_TYPE = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

export async function POST(request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    let formData;
    try {
      formData = await request.formData();
    } catch (parseError) {
      console.warn('[SUPPORT UPLOAD FORM WARNING]', safeErrorDetails(parseError));
      return NextResponse.json({ error: '請求格式錯誤' }, { status: 400 });
    }

    const file = formData.get('file');
    if (!file || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ error: '請選擇要上傳的截圖' }, { status: 400 });
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json({ error: '僅支援 PNG、JPG 或 WebP 圖片' }, { status: 400 });
    }

    if (file.size > MAX_SUPPORT_IMAGE_BYTES) {
      return NextResponse.json({ error: '截圖檔案不可超過 5MB' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const extension = EXT_BY_TYPE[file.type] || 'webp';
    const storagePath = `${auth.user.id}/support-${Date.now()}-${randomUUID()}.${extension}`;

    const adminSupabase = getAdminSupabase();
    const { error: uploadError } = await adminSupabase.storage
      .from('support_images')
      .upload(storagePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    return NextResponse.json({ imagePath: storagePath }, { status: 201 });
  } catch (error) {
    console.error('[SUPPORT UPLOAD ERROR]', safeErrorDetails(error));
    return NextResponse.json({ error: '客服截圖上傳失敗，請確認客服資料表與 support_images bucket 已建立' }, { status: 500 });
  }
}
