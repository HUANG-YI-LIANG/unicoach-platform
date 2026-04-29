import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function PATCH(request, { params }) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const { id: targetUserId } = await params;
    const body = await request.json();
    const adminSupabase = getAdminSupabase();

    // 1. Update users table (level)
    if (body.level !== undefined) {
      const levelNum = Number(body.level);
      if (isNaN(levelNum) || levelNum < 1) {
        return NextResponse.json({ error: '無效的會員等級' }, { status: 400 });
      }
      const { error: userError } = await adminSupabase
        .from('users')
        .update({ level: levelNum })
        .eq('id', targetUserId);
      if (userError) throw userError;
    }

    // 2. Update user_metadata (custom_discount)
    if (body.custom_discount !== undefined) {
      const { data: authUser, error: authGetError } = await adminSupabase.auth.admin.getUserById(targetUserId);
      if (authGetError) throw authGetError;

      const metadata = authUser?.user?.user_metadata || {};
      let updatedDiscount = body.custom_discount;

      if (updatedDiscount === '' || updatedDiscount === null) {
        // Remove custom discount
        delete metadata.custom_discount;
      } else {
        const discountNum = Number(updatedDiscount);
        if (isNaN(discountNum) || discountNum < 0 || discountNum > 100) {
          return NextResponse.json({ error: '無效的客製化折扣比例' }, { status: 400 });
        }
        metadata.custom_discount = discountNum;
      }

      const { error: authUpdateError } = await adminSupabase.auth.admin.updateUserById(targetUserId, {
        user_metadata: metadata
      });

      if (authUpdateError) throw authUpdateError;
    }

    return NextResponse.json({ success: true, message: '使用者設定已更新' });
  } catch (error) {
    console.error('[ADMIN USERS UPDATE ERROR]', error);
    return NextResponse.json({ error: '更新失敗' }, { status: 500 });
  }
}
