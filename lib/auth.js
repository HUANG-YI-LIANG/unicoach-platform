import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { getAdminSupabase } from '@/lib/supabase';
import { evaluateFreshAuthorization, SAFE_USER_PROFILE_FIELDS } from '@/lib/securityRules';

const DEV_JWT_SECRET = 'fallback_secret_for_local_development_only_change_in_vercel_immediately';
const MIN_JWT_SECRET_LENGTH = 32;

function resolveJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (process.env.NODE_ENV === 'production') {
    if (!secret) {
      throw new Error('JWT_SECRET is required in production');
    }
    if (secret.length < MIN_JWT_SECRET_LENGTH) {
      throw new Error('JWT_SECRET must be at least 32 characters in production');
    }
    return secret;
  }

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV !== 'production') {
    return DEV_JWT_SECRET;
  }
}

const secretKey = resolveJwtSecret();
const key = new TextEncoder().encode(secretKey);

export async function encrypt(payload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1 day from now')
    .sign(key);
}

export async function decrypt(input) {
  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ['HS256'],
    });
    return payload;
  } catch (error) {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  if (!session) return null;
  return await decrypt(session);
}

/**
 * 核心權限守衛
 * @param {string[]} allowedRoles - 允許的角色清單 (admin, coach, user)
 * @param {{ requireApprovedCoach?: boolean }} options - 額外權限檢查
 */
export async function requireAuth(allowedRoles = [], options = {}) {
  const session = await getSession();

  if (!session?.id) {
    return { error: '請先登入', status: 401 };
  }

  const adminSupabase = getAdminSupabase();
  const { data: dbUser, error: userError } = await adminSupabase
    .from('users')
    .select(SAFE_USER_PROFILE_FIELDS.join(', '))
    .eq('id', session.id)
    .maybeSingle();

  if (userError) {
    console.error('[AUTH USER LOOKUP ERROR]', userError);
    return { error: '無法驗證登入狀態', status: 500 };
  }

  let coach = null;
  if (dbUser?.role === 'coach' && (allowedRoles.includes('coach') || options.requireApprovedCoach)) {
    const { data: coachData, error: coachError } = await adminSupabase
      .from('coaches')
      .select('user_id, approval_status')
      .eq('user_id', dbUser.id)
      .maybeSingle();

    if (coachError) {
      console.error('[AUTH COACH LOOKUP ERROR]', coachError);
      return { error: '無法驗證教練狀態', status: 500 };
    }
    coach = coachData;
  }

  const result = evaluateFreshAuthorization({
    dbUser,
    coach,
    allowedRoles,
    requireApprovedCoach: Boolean(options.requireApprovedCoach),
  });

  if (!result.ok) {
    return { error: result.error, status: result.status };
  }

  return {
    user: {
      ...session,
      ...result.user,
      role: result.user.role,
    },
    coach: result.coach,
  };
}

export async function requireApprovedCoach() {
  return requireAuth(['coach'], { requireApprovedCoach: true });
}
