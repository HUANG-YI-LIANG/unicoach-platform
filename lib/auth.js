import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { getAdminSupabase } from '@/lib/supabase';
import { evaluateFreshAuthorization, SAFE_USER_PROFILE_FIELDS } from '@/lib/securityRules';

// ✅ 安全強化：優先使用環境變數中的金鑰
// 在生產環境中，請務必設定 JWT_SECRET 環境變數
const secretKey = process.env.JWT_SECRET || 'fallback_secret_for_dev_only_change_in_vercel_immediately';
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
