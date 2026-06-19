export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';
import { safeErrorDetails } from '@/lib/safeLogging';

export async function POST(request) {
  try {
    const { session_id, content } = await request.json();

    if (!session_id || !content || !content.trim()) {
      return NextResponse.json({ error: '請提供對話 ID 與訊息內容' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();

    const { data: message, error: insertError } = await adminSupabase
      .from('anonymous_support_messages')
      .insert([{
        session_id,
        sender: 'admin',
        content: content.trim()
      }])
      .select('id, sender, content, created_at')
      .single();

    if (insertError) throw insertError;

    // 如果管理員回覆了，可以選擇將狀態保持 open 或如果內容包含「結案」可以關閉
    // 在這裡我們先保持 open，或者提供一個獨立的 API 來結案。

    return NextResponse.json({ success: true, message }, { status: 201 });
  } catch (error) {
    console.error('[ADMIN ANONYMOUS SEND POST ERROR]', safeErrorDetails(error));
    return NextResponse.json({ error: '發送訊息失敗' }, { status: 500 });
  }
}
