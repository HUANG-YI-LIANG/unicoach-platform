import { NextResponse } from 'next/server';
import { supabase, getAdminSupabase } from '@/lib/supabase';
import { encrypt } from '@/lib/auth';
import { normalizeRegistrationRole } from '@/lib/securityRules';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    const { 
      email, 
      password, 
      name, 
      role: requestedRole = 'user',
      // ✅ 法律合規性欄位
      acceptedTerms,
      acceptedPrivacy,
      acceptedDisclaimer,
      isMinor = false,
      guardianConsent = false,
      age,
      referralCode = null
    } = await request.json();

    const role = normalizeRegistrationRole(requestedRole);

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

    const normalizedEmail = email.toLowerCase();
    const adminSupabase = getAdminSupabase();

    // 3. 先檢查 public.users 是否有殘留 ghost user
    const { data: existingProfile, error: existingProfileError } = await adminSupabase
      .from('users')
      .select('id, email')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingProfileError) throw existingProfileError;

    let recoveredProfileId = null;

    if (existingProfile) {
      const { data: authLookup, error: authLookupError } = await adminSupabase.auth.admin.getUserById(existingProfile.id);

      if (authLookup?.user) {
        return NextResponse.json({ error: '此 Email 已被註冊，請直接登入。' }, { status: 409 });
      }

      const authLookupMessage = String(authLookupError?.message || '').toLowerCase();
      const looksLikeGhostUser =
        authLookupError &&
        (authLookupError.status === 404 ||
          authLookupMessage.includes('not found') ||
          authLookupMessage.includes('user not found'));

      if (!looksLikeGhostUser) {
        throw authLookupError || new Error('無法確認既有帳號狀態');
      }

      console.warn(`[REGISTER] Found ghost profile for ${normalizedEmail}, will recover auth account with existing user id ${existingProfile.id}`);
      recoveredProfileId = existingProfile.id;
    }

    // 4. 建立 Supabase Auth 帳戶
    const authPayload = {
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { name, role }
    };

    if (recoveredProfileId) {
      authPayload.id = recoveredProfileId;
    }

    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser(authPayload);

    if (authError) {
      if (authError.code === 'email_exists' || authError.message.toLowerCase().includes('already registered')) {
        return NextResponse.json({ error: '此 Email 已被註冊，請直接登入。' }, { status: 409 });
      }
      throw authError;
    }

    // 🛡️ 密碼雜湊 (符合 users 表格 NOT NULL 限制)
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5. 處理推廣碼 (Referral Logic)
    let referredById = null;
    if (referralCode) {
      const { data: referrer } = await adminSupabase
        .from('users')
        .select('id')
        .eq('promotion_code', referralCode.toUpperCase())
        .maybeSingle();
      if (referrer) {
        referredById = referrer.id;
      }
    }

    // 生成隨機推廣碼 (6碼英數)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let newPromotionCode = '';
    for (let i = 0; i < 6; i++) {
      newPromotionCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // 6. 建立用戶 Profile (users 表)
    const userData = {
      email: normalizedEmail,
      password: hashedPassword,
      name: name.trim(),
      role: role,
      age: age ? parseInt(age) : null,
      is_minor: isMinor,
      is_email_verified: false,
      is_frozen: false,
      level: 1,
      promotion_code: newPromotionCode,
      referred_by: referredById,
      created_at: new Date().toISOString()
    };

    const profileQuery = recoveredProfileId
      ? adminSupabase
          .from('users')
          .update(userData)
          .eq('id', recoveredProfileId)
      : adminSupabase
          .from('users')
          .insert([{ id: authData.user.id, ...userData }]);

    const { data: userProfile, error: profileError } = await profileQuery
      .select('*')
      .single();

    if (profileError) {
      console.error('[PROFILE CREATE ERROR]', profileError);
      await adminSupabase.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    // 6. 核心記錄：法律同意存檔 (terms_consents)
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

    // 7. 教練專屬初始化
    if (role === 'coach') {
      const { data: existingCoach } = await adminSupabase
        .from('coaches')
        .select('user_id')
        .eq('user_id', authData.user.id)
        .maybeSingle();

      const coachPayload = {
        user_id: authData.user.id,
        approval_status: 'pending',
        commission_rate: 45,
        base_price: 1000
      };

      const coachMutation = existingCoach
        ? adminSupabase.from('coaches').update(coachPayload).eq('user_id', authData.user.id)
        : adminSupabase.from('coaches').insert([coachPayload]);

      const { error: coachError } = await coachMutation;
      if (coachError) console.error('[COACH INIT ERROR]', coachError);
    }

    // 8. 簽發 Session Token
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

    // 9. 審計日誌 (Audit Logs)
    try {
      await adminSupabase.from('audit_logs').insert([{
        action: 'USER_REGISTERED',
        actor_id: authData.user.id,
        actor_role: role,
        details: JSON.stringify({ email: normalizedEmail, is_minor: isMinor })
      }]);
    } catch (auditError) {
      console.warn('[REGISTER AUDIT LOG ERROR]', auditError);
    }

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
