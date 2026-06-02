export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';
import { encrypt } from '@/lib/auth';
import { strictLimiter, getClientIp } from '@/lib/rateLimit';
import { safeErrorDetails, maskIdentifier } from '@/lib/safeLogging';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

const PROMOTION_CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const PROMOTION_CODE_PREFIX = 'AMB-';
const MAX_PROMOTION_CODE_ATTEMPTS = 8;

function normalizeInviteCode(value) {
  return String(value || '').trim().toUpperCase();
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeRequiredText(value) {
  return String(value || '').trim();
}

function generatePromotionCode() {
  let code = PROMOTION_CODE_PREFIX;
  for (let i = 0; i < 6; i += 1) {
    code += PROMOTION_CODE_ALPHABET.charAt(Math.floor(Math.random() * PROMOTION_CODE_ALPHABET.length));
  }
  return code;
}

function isDuplicateKeyError(error) {
  return error?.code === '23505' || String(error?.message || '').toLowerCase().includes('duplicate');
}

function isEmailAlreadyRegistered(error) {
  const message = String(error?.message || '').toLowerCase();
  return error?.code === 'email_exists' || message.includes('already registered') || message.includes('already exists');
}

function mapInviteClaimError(error) {
  const message = String(error?.message || '').toLowerCase();

  if (message.includes('inactive')) return '此邀請碼已被停用';
  if (message.includes('expired')) return '此邀請碼已過期';
  if (message.includes('exhausted')) return '此邀請碼已超過使用次數上限';
  if (message.includes('conflict')) return '此邀請碼正在被使用，請稍後再試';
  return '無效的邀請碼';
}

async function releaseClaimedInvite(adminSupabase, claimToken) {
  if (!claimToken) return false;

  const { data, error } = await adminSupabase.rpc('release_ambassador_invite_claim', {
    p_claim_token: claimToken,
  });

  if (error) {
    console.error('[AMBASSADOR INVITE RELEASE ERROR]', safeErrorDetails(error));
    return false;
  }

  return Boolean(data);
}

async function consumeClaimedInvite(adminSupabase, claimToken, userId) {
  if (!claimToken || !userId) return false;

  const { data, error } = await adminSupabase.rpc('consume_ambassador_invite_claim', {
    p_claim_token: claimToken,
    p_user_id: userId,
  });

  if (error) {
    console.error('[AMBASSADOR INVITE CONSUME ERROR]', safeErrorDetails(error));
    return false;
  }

  return Boolean(data);
}

async function cleanupPartialRegistration(adminSupabase, { authUserId, claimToken, publicUserCreated }) {
  const cleanupResults = {
    termsDeleted: false,
    ambassadorDeleted: false,
    publicUserDeleted: false,
    authUserDeleted: false,
    inviteReleased: false,
    inviteReleaseSkipped: false,
  };

  if (authUserId && publicUserCreated) {
    const { error: termsDeleteError } = await adminSupabase
      .from('terms_consents')
      .delete()
      .eq('user_id', authUserId);

    cleanupResults.termsDeleted = !termsDeleteError;
    if (termsDeleteError) {
      console.error('[AMBASSADOR CLEANUP TERMS ERROR]', safeErrorDetails(termsDeleteError));
    }

    const { error: ambassadorDeleteError } = await adminSupabase
      .from('ambassadors')
      .delete()
      .eq('user_id', authUserId);

    cleanupResults.ambassadorDeleted = !ambassadorDeleteError;
    if (ambassadorDeleteError) {
      console.error('[AMBASSADOR CLEANUP PROFILE ERROR]', safeErrorDetails(ambassadorDeleteError));
    }

    const { error: publicUserDeleteError } = await adminSupabase
      .from('users')
      .delete()
      .eq('id', authUserId);

    cleanupResults.publicUserDeleted = !publicUserDeleteError;
    if (publicUserDeleteError) {
      console.error('[AMBASSADOR CLEANUP USER ERROR]', safeErrorDetails(publicUserDeleteError));
    }
  }

  if (authUserId) {
    const { error: authDeleteError } = await adminSupabase.auth.admin.deleteUser(authUserId);
    cleanupResults.authUserDeleted = !authDeleteError;
    if (authDeleteError) {
      console.error('[AMBASSADOR CLEANUP AUTH ERROR]', safeErrorDetails(authDeleteError));
    }
  }

  if (!authUserId || cleanupResults.authUserDeleted) {
    cleanupResults.inviteReleased = await releaseClaimedInvite(adminSupabase, claimToken);
  } else {
    cleanupResults.inviteReleaseSkipped = true;
  }

  return cleanupResults;
}

async function createUserProfileWithUniquePromotionCode(adminSupabase, baseUserData) {
  let lastError = null;

  for (let attempt = 0; attempt < MAX_PROMOTION_CODE_ATTEMPTS; attempt += 1) {
    const promotionCode = generatePromotionCode();

    const { data: existingPromotion, error: promotionCheckError } = await adminSupabase
      .from('users')
      .select('id')
      .eq('promotion_code', promotionCode)
      .maybeSingle();

    if (promotionCheckError) throw promotionCheckError;
    if (existingPromotion) continue;

    const { data: existingAmbassadorCode, error: ambassadorCodeCheckError } = await adminSupabase
      .from('ambassadors')
      .select('user_id')
      .eq('code', promotionCode)
      .maybeSingle();

    if (ambassadorCodeCheckError) throw ambassadorCodeCheckError;
    if (existingAmbassadorCode) continue;

    const { data: userProfile, error: profileError } = await adminSupabase
      .from('users')
      .insert([{ ...baseUserData, promotion_code: promotionCode }])
      .select('id, email, name, role, level, promotion_code')
      .single();

    if (!profileError) {
      return { userProfile, promotionCode };
    }

    lastError = profileError;
    if (!isDuplicateKeyError(profileError)) throw profileError;
  }

  throw lastError || new Error('promotion_code_generation_failed');
}

export async function POST(request) {
  let adminSupabase = null;
  let claimedInviteId = null;
  let inviteClaimToken = null;
  let authUserId = null;
  let publicUserCreated = false;
  let registrationCommitted = false;

  try {
    const ip = getClientIp(request);
    const rateLimit = await strictLimiter.limit(ip);
    if (!rateLimit.success) {
      return NextResponse.json({ error: '請求過於頻繁，請稍後再試。' }, { status: 429 });
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.warn('[AMBASSADOR REGISTRATION INVALID JSON]', safeErrorDetails(parseError));
      return NextResponse.json({ error: '請提供有效的註冊資料' }, { status: 400 });
    }

    const normalizedEmail = normalizeEmail(body.email);
    const name = normalizeRequiredText(body.name);
    const phone = normalizeRequiredText(body.phone);
    const inviteCode = normalizeInviteCode(body.inviteCode);
    const password = String(body.password || '');
    const socialAccount = normalizeRequiredText(body.socialAccount);
    const experience = normalizeRequiredText(body.experience);
    const acceptedTerms = Boolean(body.acceptedTerms);
    const acceptedPrivacy = Boolean(body.acceptedPrivacy);
    const acceptedDisclaimer = Boolean(body.acceptedDisclaimer);

    if (!normalizedEmail || !password || !name || !phone || !inviteCode) {
      return NextResponse.json({ error: '請填寫必要欄位並提供邀請碼' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: '密碼長度至少需 8 個字元' }, { status: 400 });
    }

    if (!acceptedTerms || !acceptedPrivacy) {
      return NextResponse.json({ error: '您必須同意所有使用條款與細則才能註冊。' }, { status: 400 });
    }

    adminSupabase = getAdminSupabase();

    // Prevent consuming invite usage for obvious duplicate public profiles.
    const { data: existingPublicUser, error: existingPublicUserError } = await adminSupabase
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingPublicUserError) throw existingPublicUserError;
    if (existingPublicUser) {
      return NextResponse.json({ error: '此 Email 已被註冊，請直接登入。' }, { status: 409 });
    }

    // Atomic DB-side invite claim. This replaces unsafe select-then-update used_count increments.
    const { data: claimData, error: claimError } = await adminSupabase.rpc('claim_ambassador_invite_code', {
      p_code: inviteCode,
    });

    if (claimError) {
      console.warn('[AMBASSADOR INVITE CLAIM REJECTED]', safeErrorDetails(claimError));
      return NextResponse.json({ error: mapInviteClaimError(claimError) }, { status: 403 });
    }

    claimedInviteId = claimData?.invite_id || claimData?.inviteId || null;
    inviteClaimToken = claimData?.claim_token || claimData?.claimToken || null;
    if (!claimedInviteId || !inviteClaimToken) {
      throw new Error('ambassador_invite_claim_missing_id');
    }

    const authPayload = {
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { name, role: 'ambassador' },
    };

    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser(authPayload);

    if (authError) {
      const released = await releaseClaimedInvite(adminSupabase, inviteClaimToken);
      if (released) {
        claimedInviteId = null;
        inviteClaimToken = null;
      }

      if (isEmailAlreadyRegistered(authError) && released) {
        return NextResponse.json({ error: '此 Email 已被註冊，請直接登入。' }, { status: 409 });
      }
      throw authError;
    }

    authUserId = authData?.user?.id;
    if (!authUserId) {
      throw new Error('ambassador_auth_user_missing_id');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const nowIso = new Date().toISOString();

    const { userProfile, promotionCode } = await createUserProfileWithUniquePromotionCode(adminSupabase, {
      id: authUserId,
      email: normalizedEmail,
      password: hashedPassword,
      name,
      phone,
      role: 'ambassador',
      is_email_verified: false,
      is_frozen: false,
      level: 1,
      created_at: nowIso,
    });

    publicUserCreated = true;

    const { data: bronzeLevel, error: bronzeLevelError } = await adminSupabase
      .from('ambassador_levels')
      .select('id')
      .eq('name', 'Bronze')
      .maybeSingle();

    if (bronzeLevelError) throw bronzeLevelError;

    const { error: ambassadorError } = await adminSupabase
      .from('ambassadors')
      .insert([{
        user_id: authUserId,
        code: promotionCode,
        level_id: bronzeLevel?.id || null,
        status: 'active',
        social_account: socialAccount || null,
        experience: experience || null,
      }]);

    if (ambassadorError) throw ambassadorError;

    const { error: consentError } = await adminSupabase
      .from('terms_consents')
      .insert([{
        user_id: authUserId,
        consent_type: 'ambassador_registration',
        terms_version: 'v1.0.2024.Apr',
        privacy_version: 'v1.0.2024.Apr',
        disclaimer_version: 'v1.0.2024.Apr',
        accepted_terms: true,
        accepted_privacy: true,
        accepted_disclaimer: acceptedDisclaimer,
        consent_timestamp: nowIso,
        user_agent: request.headers.get('user-agent') || 'unknown',
        ip_address: ip || request.headers.get('x-forwarded-for') || '127.0.0.1',
      }]);

    if (consentError) throw consentError;

    const inviteConsumed = await consumeClaimedInvite(adminSupabase, inviteClaimToken, authUserId);
    if (!inviteConsumed) {
      throw new Error('ambassador_invite_consume_failed');
    }
    inviteClaimToken = null;
    claimedInviteId = null;
    registrationCommitted = true;

    const sessionData = {
      id: userProfile.id,
      email: userProfile.email,
      name: userProfile.name,
      role: 'ambassador',
      level: userProfile.level || 1,
    };
    const sessionToken = await encrypt(sessionData);

    const cookieStore = await cookies();
    cookieStore.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24,
    });

    return NextResponse.json({
      success: true,
      user: sessionData,
      ambassador: {
        code: promotionCode,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('[AMBASSADOR REGISTRATION ERROR]', {
      ...safeErrorDetails(error),
      authUserId: maskIdentifier(authUserId),
    });

    if (!registrationCommitted && adminSupabase && (authUserId || inviteClaimToken)) {
      const cleanup = await cleanupPartialRegistration(adminSupabase, {
        authUserId,
        claimToken: inviteClaimToken,
        publicUserCreated,
      });
      console.warn('[AMBASSADOR REGISTRATION CLEANUP]', cleanup);
    }

    if (isDuplicateKeyError(error)) {
      return NextResponse.json({ error: '註冊資料已存在，請重新整理後再試。' }, { status: 409 });
    }

    return NextResponse.json({ error: '推廣大使註冊失敗' }, { status: 500 });
  }
}
