export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase, supabase } from '@/lib/supabase';
import { safeErrorDetails } from '@/lib/safeLogging';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const { newPassword } = await request.json();
    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: '密碼長度必須至少為 6 碼' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();
    const userId = auth.user.id;
    const email = auth.user.email;

    // 1. 更新 Supabase Auth 密碼
    const { error: authError } = await adminSupabase.auth.admin.updateUserById(userId, {
      password: newPassword
    });

    if (authError) {
      console.error('[FORCE RESET] Auth Update Error:', authError);
      return NextResponse.json({ error: '更新密碼失敗 (Auth)' }, { status: 500 });
    }

    // 2. 更新 users 表中的 hashed_password / password 以及取消 force_password_reset
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const { error: dbError } = await adminSupabase
      .from('users')
      .update({
        password: hashedPassword,
        force_password_reset: false
      })
      .eq('id', userId);

    if (dbError) {
      console.error('[FORCE RESET] DB Update Error:', dbError);
      // Rollback is complex, but the user can still login with the new password next time
    }

    return NextResponse.json({ success: true, message: '密碼更新成功' });
  } catch (error) {
    console.error('[FORCE RESET FATAL ERROR]', safeErrorDetails(error));
    return NextResponse.json({ error: '伺服器內部錯誤' }, { status: 500 });
  }
}
