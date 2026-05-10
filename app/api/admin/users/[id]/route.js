export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';
import { safeErrorDetails } from '@/lib/safeLogging';

const ADMIN_USER_UPDATE_FIELDS = new Set(['level', 'custom_discount']);

function normalizeCustomDiscountForUpdate(value) {
  if (value === '' || value === null) return null;

  const discount = Number(value);
  if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
    return undefined;
  }

  return discount;
}

export async function PATCH(request, { params }) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const { id: targetUserId } = await params;
    const body = await request.json();
    const adminSupabase = getAdminSupabase();

    const requestedFields = Object.keys(body || {});
    const unsupportedFields = requestedFields.filter((field) => !ADMIN_USER_UPDATE_FIELDS.has(field));
    if (unsupportedFields.length > 0) {
      return NextResponse.json({ error: '包含不允許更新的欄位' }, { status: 400 });
    }

    // 1. Update users table (level)
    if (body.level !== undefined) {
      const levelNum = Number(body.level);
      if (!Number.isFinite(levelNum) || levelNum < 1) {
        return NextResponse.json({ error: '無效的會員等級' }, { status: 400 });
      }

      const { data: updatedUser, error: userError } = await adminSupabase
        .from('users')
        .update({ level: levelNum })
        .eq('id', targetUserId)
        .select('id, level')
        .maybeSingle();

      if (userError) throw userError;
      if (!updatedUser) {
        return NextResponse.json({ error: '找不到該使用者' }, { status: 404 });
      }
    }

    // 2. Update narrowly scoped user metadata (custom_discount)
    if (body.custom_discount !== undefined) {
      const normalizedDiscount = normalizeCustomDiscountForUpdate(body.custom_discount);
      if (normalizedDiscount === undefined) {
        return NextResponse.json({ error: '無效的客製化折扣比例' }, { status: 400 });
      }

      const { error: authUpdateError } = await adminSupabase.auth.admin.updateUserById(targetUserId, {
        user_metadata: { custom_discount: normalizedDiscount },
      });

      if (authUpdateError) throw authUpdateError;
    }

    return NextResponse.json({ success: true, message: '使用者設定已更新' });
  } catch (error) {
    console.error('[ADMIN USERS UPDATE ERROR]', safeErrorDetails(error));
    return NextResponse.json({ error: '更新失敗' }, { status: 500 });
  }
}
