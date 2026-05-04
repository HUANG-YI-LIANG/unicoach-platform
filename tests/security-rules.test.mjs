import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeRegistrationRole,
  sanitizeUserProfile,
  evaluateFreshAuthorization,
} from '../lib/securityRules.js';

test('normalizeRegistrationRole blocks admin self-registration', () => {
  assert.equal(normalizeRegistrationRole('admin'), 'user');
  assert.equal(normalizeRegistrationRole('superadmin'), 'user');
  assert.equal(normalizeRegistrationRole(undefined), 'user');
});

test('normalizeRegistrationRole still allows coach applications as pending coach role', () => {
  assert.equal(normalizeRegistrationRole('coach'), 'coach');
  assert.equal(normalizeRegistrationRole('user'), 'user');
});

test('sanitizeUserProfile removes password hashes and internal auth fields', () => {
  const sanitized = sanitizeUserProfile({
    id: 'user-1',
    email: 'u@example.com',
    name: 'User',
    role: 'user',
    password: 'hashed-password',
    password_hash: 'hash',
    token: 'secret-token',
    refresh_token: 'secret-refresh',
    level: 2,
  });

  assert.deepEqual(sanitized, {
    id: 'user-1',
    email: 'u@example.com',
    name: 'User',
    role: 'user',
    level: 2,
  });
});

test('evaluateFreshAuthorization rejects frozen users even when session role is allowed', () => {
  const result = evaluateFreshAuthorization({
    dbUser: { id: 'u1', role: 'admin', is_frozen: true },
    allowedRoles: ['admin'],
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 403);
});

test('evaluateFreshAuthorization rejects pending coaches for approved coach features', () => {
  const result = evaluateFreshAuthorization({
    dbUser: { id: 'c1', role: 'coach', is_frozen: false },
    coach: { approval_status: 'pending' },
    allowedRoles: ['coach'],
    requireApprovedCoach: true,
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 403);
});

test('evaluateFreshAuthorization accepts approved coaches for approved coach features', () => {
  const result = evaluateFreshAuthorization({
    dbUser: { id: 'c1', role: 'coach', is_frozen: false, email: 'c@example.com' },
    coach: { approval_status: 'approved' },
    allowedRoles: ['coach'],
    requireApprovedCoach: true,
  });

  assert.equal(result.ok, true);
  assert.equal(result.user.role, 'coach');
  assert.equal(result.user.email, 'c@example.com');
});
