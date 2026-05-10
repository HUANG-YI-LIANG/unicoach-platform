export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminSupabase } from '@/lib/supabase';
import { safeErrorDetails } from '@/lib/safeLogging';

export async function POST(request) {
  try {
    let endpoint = null;
    try {
      const body = await request.json();
      endpoint = typeof body?.endpoint === 'string' ? body.endpoint.trim() : null;
    } catch {
      endpoint = null;
    }

    if (endpoint) {
      const adminSupabase = getAdminSupabase();
      const { error } = await adminSupabase
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', endpoint);

      if (error) {
        console.error('[LOGOUT PUSH CLEANUP ERROR]', safeErrorDetails(error));
      }
    }

    const cookieStore = await cookies();
    cookieStore.delete('session');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[LOGOUT ERROR]', safeErrorDetails(error));
    const cookieStore = await cookies();
    cookieStore.delete('session');
    return NextResponse.json({ success: true });
  }
}
