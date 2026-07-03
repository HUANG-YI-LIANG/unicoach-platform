export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';

export async function POST(request) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const { userId, level, role, expiresAt } = await request.json();

    if (!userId || !level) {
      return NextResponse.json({ error: '缺少必要參數' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();

    if (role === 'coach') {
      // For coaches, we use user_metadata to grant temporary overrides
      const { data: authData } = await adminSupabase.auth.admin.getUserById(userId);
      const metadata = authData?.user?.user_metadata || {};
      
      const newMetadata = {
        ...metadata,
        granted_level: {
          level: parseInt(level, 10),
          expires_at: expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // default 30 days
        }
      };
      
      const { error: updateError } = await adminSupabase.auth.admin.updateUserById(userId, {
        user_metadata: newMetadata
      });
      if (updateError) throw updateError;
      
    } else {
      // For normal users, we update the `level` column directly
      const { error: updateError } = await adminSupabase
        .from('users')
        .update({ level: parseInt(level, 10) })
        .eq('id', userId);
        
      if (updateError) throw updateError;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[CHANGE LEVEL API ERROR]', err);
    return NextResponse.json({ error: '等級調整失敗' }, { status: 500 });
  }
}
