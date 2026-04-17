import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

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
 */
export async function requireAuth(allowedRoles = []) {
  const session = await getSession();
  if (!session) {
    return { error: '請先登入', status: 401 };
  }
  
  // 角色檢查邏輯
  if (allowedRoles.length > 0 && !allowedRoles.includes(session.role)) {
    return { error: '權限不足，無法存取此資源', status: 403 };
  }
  
  return { user: session };
}
