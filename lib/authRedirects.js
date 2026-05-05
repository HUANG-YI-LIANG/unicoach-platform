const ROLE_DASHBOARD_PATHS = {
  admin: '/dashboard/admin',
  coach: '/dashboard/coach',
  user: '/dashboard/user',
};

export function getDashboardPathForRole(role) {
  switch (role) {
    case 'admin': return '/dashboard/admin';
    case 'coach': return '/dashboard/coach';
    case 'user': return '/dashboard/user';
    default: return '/login';
  }
}

export function getSafeRedirectPath(candidate, role) {
  const fallback = getDashboardPathForRole(role);

  if (!candidate || typeof candidate !== 'string') {
    return fallback;
  }

  if (!candidate.startsWith('/') || candidate.startsWith('//')) {
    return fallback;
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(candidate)) {
    return fallback;
  }

  const [pathOnly] = candidate.split(/[?#]/);
  if (Object.values(ROLE_DASHBOARD_PATHS).includes(pathOnly)) {
    return pathOnly === fallback ? candidate : fallback;
  }

  return candidate;
}
