export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';

export async function GET(request) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const adminSupabase = getAdminSupabase();

    // Fetch system messages that represent manual grants or deductions
    const { data: messages, error } = await adminSupabase
      .from('support_messages')
      .select('id, user_id, admin_id, message, created_at, users!user_id(full_name, phone_number), admin:admin_id(full_name)')
      .eq('is_system', true)
      .eq('is_from_admin', true)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[FETCH LEDGER ERROR]', error);
      throw error;
    }

    // Filter only those related to topups and deductions
    const ledger = messages
      .filter(m => m.message && (m.message.includes('加值') || m.message.includes('扣除')))
      .map(m => {
        let type = 'unknown';
        let amount = 0;
        
        // Extract amount from message, e.g. "系統提示：已為您成功加值 1000 點！"
        const match = m.message.match(/(\d+)\s*點/);
        if (match) {
          amount = parseInt(match[1], 10);
        }

        if (m.message.includes('加值')) {
          type = 'top_up';
        } else if (m.message.includes('扣除')) {
          type = 'deduction';
        }

        return {
          id: m.id,
          user_name: m.users?.full_name || '未知學員',
          phone_number: m.users?.phone_number || '',
          admin_name: m.admin?.full_name || '管理員',
          type,
          amount,
          message: m.message,
          created_at: m.created_at
        };
      });

    return NextResponse.json({ success: true, ledger });
  } catch (error) {
    console.error('Ledger API error:', error);
    return NextResponse.json({ error: '內部伺服器錯誤' }, { status: 500 });
  }
}
