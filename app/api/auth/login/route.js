export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabase, getAdminSupabase } from '@/lib/supabase';
import { encrypt } from '@/lib/auth';
import { maskEmail, safeErrorDetails } from '@/lib/safeLogging';
import { strictLimiter, getClientIp } from '@/lib/rateLimit';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

const USER_SESSION_SELECT = 'id, email, name, role, level, is_frozen, force_password_reset';

export async function POST(request) {
  try {
    const ip = getClientIp(request);
    const rateLimit = await strictLimiter.limit(ip);
    if (!rateLimit.success) {
      return NextResponse.json({ error: '請求過於頻繁，請稍後再試。' }, { status: 429 });
    }

    const { username, password, rememberMe } = await request.json();
    if (!username || !password) return NextResponse.json({ error: '請輸入帳號和密碼' }, { status: 400 });

    // 將帳號轉換為虛擬 Email 格式供 Supabase 使用
    const email = `${username.toLowerCase().replace(/[^a-z0-9]/g, '')}@unicoach.app`;

    // 1. 驗證 Supabase Auth (核心驗證)
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password
    });
    
    if (authError || !authData.user) {
      return NextResponse.json({ error: '帳號或密碼錯誤' }, { status: 401 });
    }

    const adminSupabase = getAdminSupabase();
    
    // 2. 獲取對應的 Profile (users 表)
    let { data: user, error: userError } = await adminSupabase
      .from('users')
      .select(USER_SESSION_SELECT)
      .eq('id', authData.user.id)
      .single();
    
    // ✅ 關鍵修復：如果 Profile 缺失，則建立它 (確保符合 NOT NULL password 與 age 等欄位)
    if (!user) {
      console.log(`[LOGIN SYNC] 偵測到 Profile 缺失，正在為 ${maskEmail(email)} 進行自動同步...`);
      
      const hashedPassword = await bcrypt.hash(password, 10);
      const { data: newUser, error: insertError } = await adminSupabase
        .from('users')
        .insert([{
          id: authData.user.id,
          email: email.toLowerCase(),
          password: hashedPassword, // ✅ 補齊密碼
          name: authData.user.user_metadata?.name || email.split('@')[0],
          role: 'user',
          level: 1,
          is_frozen: false,
          created_at: new Date().toISOString()
        }]).select(USER_SESSION_SELECT).single();
      
      if (insertError) {
        console.error('[LOGIN SYNC ERROR]', safeErrorDetails(insertError));
        return NextResponse.json({ error: '同步用戶資料失敗' }, { status: 500 });
      }
      user = newUser;
    }

    // 3. 安全檢查：驗證帳號是否被凍結
    if (user.is_frozen) {
      console.warn(`[SECURITY WARNING] 凍結帳號嘗試登入: ${maskEmail(email)}`);
      return NextResponse.json({ error: '您的帳號已被凍結，請聯絡系統端處理' }, { status: 403 });
    }

    // 4. 簽發 Session Cookie
    const sessionData = { 
      id: user.id, 
      email: user.email, 
      name: user.name, 
      role: user.role, 
      level: user.level,
      force_password_reset: user.force_password_reset || false
    };
    const sessionToken = await encrypt(sessionData);
    
    const cookieOptions = { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production', 
      sameSite: 'lax',
      path: '/'
    };
    if (rememberMe) {
      cookieOptions.maxAge = 60 * 60 * 24 * 30; // 30天
    }

    const cookieStore = await cookies();
    cookieStore.set('session', sessionToken, cookieOptions);

    return NextResponse.json({ user: sessionData });
  } catch (err) {
    console.error('[LOGIN FATAL ERROR]', safeErrorDetails(err));
    return NextResponse.json({ error: '伺服器內部錯誤' }, { status: 500 });
  }
}
