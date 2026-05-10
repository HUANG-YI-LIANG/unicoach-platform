export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';

const ADMIN_USER_LIST_FIELDS = [
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

function normalizeCustomDiscount(value) {
  if (value === undefined || value === null || value === '') return null;
  const discount = Number(value);
  if (!Number.isFinite(discount)) return null;
  return Math.min(100, Math.max(0, discount));
}

function toAdminUserListItem(user, customDiscountByUserId) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    role: user.role,
    level: user.level,
    is_frozen: user.is_frozen,
    address: user.address,
    gender: user.gender,
    grade: user.grade,
    language: user.language,
    learning_goals: user.learning_goals,
    avatar_url: user.avatar_url,
    promotion_code: user.promotion_code,
    referred_by: user.referred_by,
    wallet_balance: user.wallet_balance,
    age: user.age,
    is_minor: user.is_minor,
    is_email_verified: user.is_email_verified,
    frequent_addresses: user.frequent_addresses,
    created_at: user.created_at,
    custom_discount: normalizeCustomDiscount(customDiscountByUserId[user.id]),
  };
}

export async function GET(request) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const adminSupabase = getAdminSupabase();

    const { data: usersData, error: usersError } = await adminSupabase
      .from('users')
      .select(ADMIN_USER_LIST_FIELDS.join(', '))
      .order('created_at', { ascending: false });

    if (usersError) throw usersError;

    const { data: authUsers, error: authError } = await adminSupabase.auth.admin.listUsers({
      perPage: 1000,
    });

    if (authError) throw authError;

    const customDiscountByUserId = {};
    authUsers.users.forEach((authUser) => {
      customDiscountByUserId[authUser.id] = authUser.user_metadata?.custom_discount;
    });

    const users = usersData.map((user) => toAdminUserListItem(user, customDiscountByUserId));

    return NextResponse.json({ users });
  } catch (err) {
    console.error('[ADMIN USERS GET ERROR]', err);
    return NextResponse.json({ error: '無法獲取使用者清單' }, { status: 500 });
  }
}
