export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

export async function POST(request) {
  try {
    const auth = await requireAuth(['coach']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const body = await request.json();
    const studentId = body.studentId;
    if (!studentId) {
      return NextResponse.json({ error: '缺少學員 ID' }, { status: 400 });
    }

    const coachId = auth.user.id;
    const coachLevel = auth.user.level || 1;
    const adminSupabase = getAdminSupabase();

    // 1. 檢查是否已經建立過聊天室
    const { data: existing, error: existingError } = await adminSupabase
      .from('chat_rooms')
      .select('id')
      .eq('user_id', studentId)
      .eq('coach_id', coachId)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existing) {
      return NextResponse.json({ success: true, roomId: existing.id, coachId: coachId, already_purchased: true });
    }

    let deductPoints = 0;

    // 2. 教練等級 >= 2 才需要扣款
    if (coachLevel >= 2) {
      // 計算學生的 lead_price
      const { data: studentData, error: studentError } = await adminSupabase
        .from('users')
        .select('id, level')
        .eq('id', studentId)
        .eq('role', 'user')
        .single();

      if (studentError) {
        return NextResponse.json({ error: '找不到該學生' }, { status: 404 });
      }

      // 取得學生評價
      const { data: reviewsData } = await adminSupabase
        .from('reviews')
        .select('review_scores(score)')
        .eq('student_id', studentId);

      let avgScore = null;
      if (reviewsData && reviewsData.length > 0) {
        let totalScore = 0;
        let count = 0;
        reviewsData.forEach(r => {
          if (r.review_scores && r.review_scores.length > 0) {
            r.review_scores.forEach(rs => {
              totalScore += rs.score;
              count += 1;
            });
          }
        });
        if (count > 0) avgScore = totalScore / count;
      }

      // 計算開發費用 (同步 api/students 邏輯)
      let leadPrice = 30; // 基礎費用
      const studentLevel = studentData.level || 1;
      if (studentLevel > 1) {
        leadPrice += (studentLevel - 1) * 10;
      }
      if (avgScore && avgScore >= 4.5) {
        leadPrice += 20;
      }

      deductPoints = leadPrice;

      // 檢查錢包餘額並扣款
      const { data: walletData, error: walletError } = await adminSupabase
        .from('wallet_points')
        .select('id, amount')
        .eq('user_id', coachId)
        .eq('status', 'active')
        .eq('currency', 'points');

      if (walletError) throw walletError;

      const currentBalance = (walletData || []).reduce((sum, rec) => sum + rec.amount, 0);

      if (currentBalance < deductPoints) {
        return NextResponse.json({ error: '點數餘額不足，請前往儲值' }, { status: 402 });
      }

      // 執行扣款
      // 注意：簡化版扣款，直接用 RPC 扣除最舊的點數。我們可以用現成的 `deduct_wallet_points_from_support` 或者直接建立一個負向的 wallet 紀錄。
      // 由於這是一個新的扣款場景，最安全的做法是寫入一筆負向交易，或者呼叫 RPC。我們直接 Insert 負點數。
      const { error: deductError } = await adminSupabase.from('wallet_points').insert({
        user_id: coachId,
        amount: -deductPoints,
        currency: 'points',
        status: 'used',
        source: 'buy_student_lead',
        related_id: studentId,
        expires_at: new Date().toISOString()
      });

      if (deductError) throw deductError;
    }

    // 3. 建立聊天室
    const { data: newRoom, error: insertError } = await adminSupabase
      .from('chat_rooms')
      .insert({ user_id: studentId, coach_id: coachId })
      .select('id')
      .single();

    if (insertError) {
      // 避免唯一鍵衝突 (剛好同時建立)
      if (insertError.code === '23505') {
         const { data: fallbackRoom } = await adminSupabase
            .from('chat_rooms')
            .select('id')
            .eq('user_id', studentId)
            .eq('coach_id', coachId)
            .single();
         if (fallbackRoom) {
            return NextResponse.json({ success: true, roomId: fallbackRoom.id, coachId: coachId, already_purchased: true });
         }
      }
      throw insertError;
    }

    return NextResponse.json({ 
      success: true, 
      roomId: newRoom.id, 
      coachId: coachId, 
      deducted: deductPoints 
    });

  } catch (error) {
    console.error('[BUY LEAD ERROR]', error);
    return NextResponse.json({ error: '開發學生失敗，請稍後再試' }, { status: 500 });
  }
}
