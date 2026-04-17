import { NextResponse } from 'next/server';
import { supabase, getAdminSupabase } from '@/lib/supabase';
import { encrypt } from '@/lib/auth';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    const { 
      email, 
      password, 
      name, 
      role = 'user',
      // ✅ 法律合規性欄位
      acceptedTerms,
      acceptedPrivacy,
      acceptedDisclaimer,
      isMinor = false,
      guardianConsent = false,
      age
    } = await request.json();

    // 1. 基本驗證
    if (!email || !password || !name) {
      return NextResponse.json({ error: '請填寫必要欄位：Email、密碼、姓名' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: '密碼長度至少需 8 個字元' }, { status: 400 });
    }

    // 2. 法律合規性與未成年檢查
    if (!acceptedTerms || !acceptedPrivacy || !acceptedDisclaimer) {
      return NextResponse.json({ error: '您必須同意所有使用條款與細則才能註冊。' }, { status: 400 });
    }

    if (isMinor || (age && parseInt(age) < 18)) {
      if (!guardianConsent) {
        return NextResponse.json({ error: '未成年用戶註冊需監護人同意。' }, { status: 400 });
      }
    }

    if (role === 'coach' && (!age || parseInt(age) < 18)) {
      return NextResponse.json({ error: '教練必須年滿 18 歲。' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();

    // 3. 建立 Supabase Auth 帳戶
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { name, role }
    });

    if (authError) {
      if (authError.code === 'email_exists' || authError.message.toLowerCase().includes('already registered')) {
        return NextResponse.json({ error: '此 Email 已被註冊，請直接登入。' }, { status: 409 });
      }
      throw authError;
    }

    // 🛡️ 密碼雜湊 (符合 users 表格 NOT NULL 限制)
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. 建立用戶 Profile (users 表) - 100% 對齊模式
    const userData = {
      id: authData.user.id,
      email: email.toLowerCase(),
      password: hashedPassword,
      name: name.trim(),
      role: role,
      age: age ? parseInt(age) : null,
      is_minor: isMinor,
      is_email_verified: false,
      is_frozen: false,
      level: 1,
      created_at: new Date().toISOString()
    };

    const { data: userProfile, error: profileError } = await adminSupabase
      .from('users')
      .insert([userData])
      .select('*')
      .single();

    if (profileError) {
      console.error('[PROFILE CREATE ERROR]', profileError);
      await adminSupabase.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    // 5. 核心記錄：法律同意存檔 (terms_consents)
    const consentTimestamp = new Date().toISOString();
    const termsVersion = "v1.0.2024.Apr";
    
    const { error: consentError } = await adminSupabase
      .from('terms_consents')
      .insert([{
        user_id: authData.user.id,
        consent_type: 'registration',
        terms_version: termsVersion,
        privacy_version: termsVersion,
        disclaimer_version: termsVersion,
        accepted_terms: true,
        accepted_privacy: true,
        accepted_disclaimer: acceptedDisclaimer || false,
        is_minor: isMinor,
        guardian_consent: guardianConsent || false,
        consent_timestamp: consentTimestamp,
        user_agent: request.headers.get('user-agent') || 'unknown',
        ip_address: request.headers.get('x-forwarded-for') || '127.0.0.1'
      }]);

    if (consentError) {
      console.error('[CONSENT RECORD ERROR]', consentError);
    }

    // 6. 教練專屬初始化
    if (role === 'coach') {
      const { error: coachError } = await adminSupabase
        .from('coaches')
        .insert([{
          user_id: authData.user.id,
          verification_status: 'pending',
          commission_rate: 45,
          base_price: 1000
        }]);
      if (coachError) console.error('[COACH INIT ERROR]', coachError);
    }

    // 7. 簽發 Session Token
    const sessionData = { 
      id: userProfile.id, 
      email: userProfile.email, 
      name: userProfile.name, 
      role: userProfile.role, 
      level: userProfile.level 
    };
    const sessionToken = await encrypt(sessionData);
    
    const cookieStore = await cookies();
    cookieStore.set('session', sessionToken, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production', 
      path: '/',
      maxAge: 60 * 60 * 24
    });

    // 8. 審計日誌 (Audit Logs)
    await adminSupabase.from('audit_logs').insert([{
      action: 'USER_REGISTERED',
      actor_id: authData.user.id,
      actor_role: role,
      details: JSON.stringify({ email: email.toLowerCase(), is_minor: isMinor })
    }]);

    return NextResponse.json({ success: true, user: sessionData }, { status: 201 });
  } catch (error) {
    console.error('[REGISTRATION FATAL ERROR]', error);
    return NextResponse.json({ 
      error: '註冊階段發生致命錯誤', 
      details: error.message || error,
      code: error.code || 'UNKNOWN_ERROR'
    }, { status: 500 });
  }
}
