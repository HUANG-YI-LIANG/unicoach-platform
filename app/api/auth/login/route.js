import { NextResponse } from 'next/server';
import { supabase, getAdminSupabase } from '@/lib/supabase';
import { encrypt } from '@/lib/auth';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) return NextResponse.json({ error: '請輸入帳號和密碼' }, { status: 400 });

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
      .select('*')
      .eq('id', authData.user.id)
      .single();
    
    // ✅ 關鍵修復：如果 Profile 缺失，則建立它 (確保符合 NOT NULL password 與 age 等欄位)
    if (!user) {
      console.log(`[LOGIN SYNC] 偵測到 Profile 缺失，正在為 ${email} 進行自動同步...`);
      
      const hashedPassword = await bcrypt.hash(password, 10);
      const { data: newUser, error: insertError } = await adminSupabase
        .from('users')
        .insert([{
          id: authData.user.id,
          email: email.toLowerCase(),
          password: hashedPassword, // ✅ 補齊密碼
          name: authData.user.user_metadata?.name || email.split('@')[0],
          role: authData.user.user_metadata?.role || 'user', 
          level: 1,
          is_frozen: false,
          created_at: new Date().toISOString()
        }]).select('*').single();
      
      if (insertError) {
        console.error('[LOGIN SYNC ERROR]', insertError);
        return NextResponse.json({ error: '同步用戶資料失敗', details: insertError.message }, { status: 500 });
      }
      user = newUser;
    }

    // 3. 安全檢查：驗證帳號是否被凍結
    if (user.is_frozen) {
      console.warn(`[SECURITY WARNING] 凍結帳號嘗試登入: ${email}`);
      return NextResponse.json({ error: '您的帳號已被凍結，請聯絡系統端處理' }, { status: 403 });
    }

    // 4. 簽發 Session Cookie
    const sessionData = { 
      id: user.id, 
      email: user.email, 
      name: user.name, 
      role: user.role, 
      level: user.level 
    };
    const sessionToken = await encrypt(sessionData);
    
    const cookieStore = await cookies();
    cookieStore.set('session', sessionToken, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production', 
      path: '/',
      maxAge: 60 * 60 * 24 // 1天
    });

    return NextResponse.json({ user: sessionData });
  } catch (err) {
    console.error('[LOGIN FATAL ERROR]', err);
    return NextResponse.json({ error: '伺服器內部錯誤', details: err.message }, { status: 500 });
  }
}
