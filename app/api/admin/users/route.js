import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const adminSupabase = getAdminSupabase();
    
    // Get all users from users table
    const { data: usersData, error: usersError } = await adminSupabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (usersError) throw usersError;

    // We also need user_metadata to get custom_discount
    // Since we need to get Auth users, we fetch them using admin API
    const { data: authUsers, error: authError } = await adminSupabase.auth.admin.listUsers({
      perPage: 1000 // Ensure we get enough users or handle pagination if scale grows
    });

    if (authError) throw authError;

    const authMap = {};
    authUsers.users.forEach(u => {
      authMap[u.id] = u.user_metadata || {};
    });

    const combinedUsers = usersData.map(user => ({
      ...user,
      custom_discount: authMap[user.id]?.custom_discount || null
    }));

    return NextResponse.json({ users: combinedUsers });
  } catch (err) {
    console.error('[ADMIN USERS GET ERROR]', err);
    return NextResponse.json({ error: '無法獲取使用者清單' }, { status: 500 });
  }
}
