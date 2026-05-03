const SENSITIVE_PROFILE_FIELDS = new Set([
  'password',
  'password_hash',
  'hashed_password',
  'token',
  'access_token',
  'refresh_token',
  'reset_token',
  'session_token',
]);

export const SAFE_USER_PROFILE_FIELDS = [
  'id',
  'email',
  'name',
  'phone',
  'role',
  'level',
  'is_frozen',
  'address',
  'gender',
  'grade',
  'language',
  'learning_goals',
  'avatar_url',
  'promotion_code',
  'referred_by',
  'wallet_balance',
  'age',
  'is_minor',
  'is_email_verified',
  'frequent_addresses',
  'created_at',
];

export function normalizeRegistrationRole(inputRole) {
  return inputRole === 'coach' ? 'coach' : 'user';
}

export function sanitizeUserProfile(user) {
  if (!user || typeof user !== 'object') return null;

  return Object.entries(user).reduce((safe, [key, value]) => {
    if (!SENSITIVE_PROFILE_FIELDS.has(key)) {
      safe[key] = value;
    }
    return safe;
  }, {});
}

export function evaluateFreshAuthorization({
  dbUser,
  coach = null,
  allowedRoles = [],
  requireApprovedCoach = false,
}) {
  if (!dbUser) {
    return { ok: false, error: '請先登入', status: 401 };
  }

  if (dbUser.is_frozen) {
    return { ok: false, error: '帳號已停權，無法存取此資源', status: 403 };
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(dbUser.role)) {
    return { ok: false, error: '權限不足，無法存取此資源', status: 403 };
  }

  if (requireApprovedCoach && dbUser.role === 'coach') {
    if (!coach || coach.approval_status !== 'approved') {
      return { ok: false, error: '教練審核通過後才能使用此功能', status: 403 };
    }
  }

  return { ok: true, user: sanitizeUserProfile(dbUser), coach };
}
