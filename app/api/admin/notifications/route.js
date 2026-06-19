export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';
import { sendPushNotification } from '@/lib/pushManager';

export async function POST(request) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const body = await request.json();
    const { 
      title, 
      content, 
      discount_code, 
      discount_percent, 
      target_audience, // 'all', 'level', 'role'
      target_value, 
      grant_points, 
      send_push, 
      url, 
      type 
    } = body;

    const normalizedTitle = title?.trim();
    const normalizedContent = content?.trim();
    const normalizedCode = discount_code ? String(discount_code).trim().toUpperCase() : null;
    const normalizedPercent =
      discount_percent === null || discount_percent === undefined || discount_percent === ''
        ? null
        : Number(discount_percent);
    const normalizedPoints = grant_points ? Number(grant_points) : 0;

    if (!normalizedTitle || !normalizedContent) {
      return NextResponse.json({ error: '請填寫通知標題與內容' }, { status: 400 });
    }

    if (normalizedPercent !== null && (!Number.isInteger(normalizedPercent) || normalizedPercent < 1 || normalizedPercent > 100)) {
      return NextResponse.json({ error: '折扣百分比必須介於 1 到 100 之間' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();
    let targetUserIds = [];

    // If we need to target specific users OR grant points, we MUST fetch users
    if (target_audience !== 'all' || normalizedPoints > 0 || send_push) {
      let query = adminSupabase.from('users').select('id');
      
      if (target_audience === 'level' && target_value) {
        query = query.gte('level', Number(target_value));
      } else if (target_audience === 'role' && target_value) {
        query = query.eq('role', target_value);
      }

      const { data: users, error: usersError } = await query;
      if (usersError) throw usersError;
      targetUserIds = users.map(u => u.id);
    }

    // 1. Insert Notifications
    if (targetUserIds.length === 0 && target_audience === 'all' && normalizedPoints === 0 && !send_push) {
      // Fast path: global notification, no points, no push
      const { error } = await adminSupabase
        .from('user_notifications')
        .insert([{
          title: normalizedTitle,
          content: normalizedContent,
          discount_code: normalizedCode,
          discount_percent: normalizedPercent,
          user_id: null,
        }]);
      if (error) throw error;
    } else if (targetUserIds.length > 0) {
      // Insert individual notifications
      const notificationsToInsert = targetUserIds.map(userId => ({
        title: normalizedTitle,
        content: normalizedContent,
        discount_code: normalizedCode,
        discount_percent: normalizedPercent,
        user_id: userId,
      }));
      
      // Batch insert notifications (max 1000 per request is safe for Supabase, but let's do it in one go assuming < 1000 users)
      if (notificationsToInsert.length > 0) {
        const { error } = await adminSupabase.from('user_notifications').insert(notificationsToInsert);
        if (error) throw error;
      }
    } else {
        // Condition where specific audience was selected but no users matched
        return NextResponse.json({ success: true, message: '沒有符合條件的會員' });
    }

    // 2. Grant Points
    if (normalizedPoints > 0 && targetUserIds.length > 0) {
      const transactions = targetUserIds.map(userId => ({
        user_id: userId,
        amount: normalizedPoints,
        transaction_type: 'deposit',
        description: `系統發送福利：${normalizedTitle}`,
      }));

      if (transactions.length > 0) {
        const { error: txError } = await adminSupabase.from('wallet_transactions').insert(transactions);
        if (txError) throw txError;
      }
    }

    // 3. Send Push Notifications
    if (send_push && targetUserIds.length > 0) {
      const rawUrl = typeof url === 'string' && url.trim() !== '' ? url.trim() : '/notifications';
      const safeUrl = rawUrl.startsWith('/') && !rawUrl.startsWith('//') ? rawUrl : '/notifications';
      
      // Fire and forget push notifications
      Promise.all(targetUserIds.map(userId => 
        sendPushNotification(userId, {
          title: normalizedTitle,
          body: normalizedContent,
          url: safeUrl,
          type: type || 'admin_broadcast',
        }).catch(err => console.warn(`[PUSH WARNING] Failed for ${userId}`, err))
      ));
    }

    // 4. Audit Log
    try {
      await adminSupabase.from('audit_logs').insert([{
        action: 'SEND_NOTIFICATION_ADVANCED',
        actor_id: auth.user.id,
        actor_role: 'admin',
        details: JSON.stringify({
          title: normalizedTitle,
          target_audience,
          target_value,
          granted_points: normalizedPoints,
          discount_code: normalizedCode,
          user_count: targetUserIds.length,
          sent_push: send_push
        }),
      }]);
    } catch (auditError) {
      console.warn('[SEND NOTIFICATION AUDIT WARNING]', auditError);
    }

    return NextResponse.json({ success: true, count: targetUserIds.length });
  } catch (err) {
    console.error('[SEND NOTIFICATION ERROR]', err);
    return NextResponse.json({ error: '發送通知失敗' }, { status: 500 });
  }
}
