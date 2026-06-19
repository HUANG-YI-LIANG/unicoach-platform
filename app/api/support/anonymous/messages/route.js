export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';
import { safeErrorDetails } from '@/lib/safeLogging';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const pin = searchParams.get('pin');

    if (!pin) {
      return NextResponse.json({ error: '請提供對話密碼 (PIN)' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();

    // 1. 驗證 PIN 碼是否存在
    const { data: session, error: sessionError } = await adminSupabase
      .from('anonymous_support_sessions')
      .select('id, status, created_at')
      .eq('pin_code', pin)
      .maybeSingle();

    if (sessionError || !session) {
      return NextResponse.json({ error: '無效的對話密碼，請確認後再試。' }, { status: 404 });
    }

    // 2. 獲取該 Session 的對話紀錄
    const { data: messages, error: messagesError } = await adminSupabase
      .from('anonymous_support_messages')
      .select('id, sender, content, created_at')
      .eq('session_id', session.id)
      .order('created_at', { ascending: true });

    if (messagesError) throw messagesError;

    return NextResponse.json({ session, messages }, { status: 200 });
  } catch (error) {
    console.error('[ANONYMOUS MESSAGES GET ERROR]', safeErrorDetails(error));
    return NextResponse.json({ error: '無法讀取訊息，請稍後再試。' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { pin, content } = await request.json();

    if (!pin || !content || !content.trim()) {
      return NextResponse.json({ error: '請提供對話密碼與訊息內容。' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();

    // 1. 驗證 PIN 碼是否存在
    const { data: session, error: sessionError } = await adminSupabase
      .from('anonymous_support_sessions')
      .select('id, status')
      .eq('pin_code', pin)
      .maybeSingle();

    if (sessionError || !session) {
      return NextResponse.json({ error: '無效的對話密碼。' }, { status: 404 });
    }

    if (session.status === 'resolved') {
      return NextResponse.json({ error: '此對話已結案，無法再發送訊息。' }, { status: 403 });
    }

    // 2. 寫入訊息
    const { data: message, error: insertError } = await adminSupabase
      .from('anonymous_support_messages')
      .insert([{
        session_id: session.id,
        sender: 'user',
        content: content.trim()
      }])
      .select('id, sender, content, created_at')
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ success: true, message }, { status: 201 });
  } catch (error) {
    console.error('[ANONYMOUS MESSAGES POST ERROR]', safeErrorDetails(error));
    return NextResponse.json({ error: '發送訊息失敗，請稍後再試。' }, { status: 500 });
  }
}
