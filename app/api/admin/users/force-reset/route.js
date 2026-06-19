export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';
import { safeErrorDetails } from '@/lib/safeLogging';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const { targetUsername, tempPassword } = await request.json();

    if (!targetUsername || !tempPassword) {
      return NextResponse.json({ error: '請提供目標帳號與臨時密碼' }, { status: 400 });
    }

    if (tempPassword.length < 6) {
      return NextResponse.json({ error: '臨時密碼長度必須至少為 6 碼' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();

    // 1. 尋找目標使用者 (根據 username 也就是 email 前綴)
    const targetEmail = `${targetUsername.toLowerCase().replace(/[^a-z0-9]/g, '')}@unicoach.app`;
    
    const { data: user, error: findError } = await adminSupabase
      .from('users')
      .select('id, email, name')
      .eq('email', targetEmail)
      .single();

    if (findError || !user) {
      return NextResponse.json({ error: '找不到該帳號' }, { status: 404 });
    }

    // 2. 更新 Supabase Auth 密碼
    const { error: authError } = await adminSupabase.auth.admin.updateUserById(user.id, {
      password: tempPassword
    });

    if (authError) {
      console.error('[ADMIN FORCE RESET] Auth Update Error:', authError);
      return NextResponse.json({ error: '更新 Auth 密碼失敗' }, { status: 500 });
    }

    // 3. 更新 users 表中的 password，並標記 force_password_reset
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    const { error: dbError } = await adminSupabase
      .from('users')
      .update({
        password: hashedPassword,
        force_password_reset: true
      })
      .eq('id', user.id);

    if (dbError) {
      console.error('[ADMIN FORCE RESET] DB Update Error:', dbError);
      return NextResponse.json({ error: '更新資料庫狀態失敗' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: `已成功將 ${user.name} (${targetUsername}) 的密碼重設，並標記為必須修改。` });

  } catch (error) {
    console.error('[ADMIN FORCE RESET FATAL ERROR]', safeErrorDetails(error));
    return NextResponse.json({ error: '伺服器內部錯誤' }, { status: 500 });
  }
}
