import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';

export async function DELETE(_request, { params }) {
  try {
    const auth = await requireAuth(['coach']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const { id } = await params;
    const adminSupabase = getAdminSupabase();
    const { error } = await adminSupabase
      .from('coach_availability_exceptions')
      .delete()
      .eq('id', id)
      .eq('coach_id', auth.user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Availability exception delete error:', error);
    return NextResponse.json({ error: '例外時段刪除失敗' }, { status: 500 });
  }
}
