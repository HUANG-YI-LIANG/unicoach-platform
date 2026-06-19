export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';
import { safeErrorDetails } from '@/lib/safeLogging';

function generatePin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request) {
  try {
    const adminSupabase = getAdminSupabase();
    
    // 生成不重複的 PIN 碼
    let pinCode = generatePin();
    let isUnique = false;
    let attempts = 0;
    
    while (!isUnique && attempts < 10) {
      const { data } = await adminSupabase
        .from('anonymous_support_sessions')
        .select('id')
        .eq('pin_code', pinCode)
        .maybeSingle();
      
      if (!data) {
        isUnique = true;
      } else {
        pinCode = generatePin();
        attempts++;
      }
    }
    
    if (!isUnique) {
      throw new Error('無法生成唯一的 PIN 碼');
    }

    const { data: session, error } = await adminSupabase
      .from('anonymous_support_sessions')
      .insert([{ pin_code: pinCode }])
      .select()
      .single();

    if (error) throw error;

    // 自動發送一則系統歡迎訊息，引導使用者輸入帳號
    await adminSupabase.from('anonymous_support_messages').insert([{
      session_id: session.id,
      sender: 'admin',
      content: '您好！這裡是密碼救援中心。\n請留下您的「帳號名稱」，管理員核對後會在此為您核發一組臨時密碼。'
    }]);

    return NextResponse.json({ success: true, pin_code: pinCode, session_id: session.id }, { status: 201 });
  } catch (error) {
    console.error('[ANONYMOUS SUPPORT CREATE ERROR]', safeErrorDetails(error));
    return NextResponse.json({ error: '無法建立客服房間，請稍後再試。' }, { status: 500 });
  }
}
