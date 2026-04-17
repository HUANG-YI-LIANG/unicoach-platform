import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { calcBaseDiscount } from '@/lib/discountRules';

export async function POST(request) {
  try {
    const auth = await requireAuth(['user']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });
    
    const adminSupabase = getAdminSupabase();
    const userId = auth.user.id;
    const { 
      coachId, 
      expectedTime, 
      grade, 
      gender, 
      attendeesCount, 
      learningStatus,
      couponId = null,
      couponDiscount = 0 // 從前端傳入本次使用的優惠券折扣 %
    } = await request.json();

    // 1. 獲取教練當前價格、抽成比例與審核狀態
    const { data: coach, error: coachErr } = await adminSupabase
      .from('coaches')
      .select('base_price, commission_rate, approval_status')
      .eq('user_id', coachId)
      .single();

    if (coachErr || !coach) return NextResponse.json({ error: '找不到該教練資料' }, { status: 404 });

    // ✅ 安全門檻：只有 'approved' 狀態的教練才能接受預約
    if (coach.approval_status !== 'approved') {
      return NextResponse.json({ 
        error: '該教練目前不接受預約（尚未審核通過或已被暫停）',
        status: coach.approval_status 
      }, { status: 403 });
    }

    const basePrice = coach.base_price || 1000;

    // 2. 計算基礎折扣率 (基於用戶等級與預約歷史)
    const { count: userBookingsCount } = await adminSupabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    
    const { data: userData, error: userDataErr } = await adminSupabase
      .from('users')
      .select('level')
      .eq('id', userId)
      .maybeSingle();

    if (userDataErr) throw userDataErr;
    
    const isFirst = (userBookingsCount || 0) === 0;
    const baseDiscountPercent = calcBaseDiscount(userData?.level || 1, isFirst);

    // 3. 累加折扣 (基礎 + 優惠券)
    const totalDiscountPercent = baseDiscountPercent + parseInt(couponDiscount);
    const discountAmount = Math.min(Math.round(basePrice * (totalDiscountPercent / 100)), 300); // 折扣總額上限 300

    // 4. 計算金額拆分
    const finalPrice = basePrice - discountAmount;
    const depositPaid = Math.round(finalPrice * 0.3); // 訂金 3 成
    const platformFee = Math.round(basePrice * ((coach.commission_rate || 45) / 100)); // 平台服務費
    const coachPayout = basePrice - platformFee; // 教練實拿

    // 5. 建立預約紀錄
    const { data: booking, error: insertErr } = await adminSupabase.from('bookings').insert([{
      user_id: userId,
      coach_id: coachId,
      expected_time: expectedTime,
      base_price: basePrice,
      discount_amount: discountAmount,
      final_price: finalPrice,
      deposit_paid: depositPaid,
      platform_fee: platformFee,
      coach_payout: coachPayout,
      grade: grade,
      gender: gender,
      attendees_count: attendeesCount,
      learning_status: learningStatus,
      coupon_id: couponId,
      coupon_discount: couponDiscount,
      status: 'scheduled'
    }]).select('id');

    if (insertErr || !booking || booking.length === 0) {
      throw insertErr || new Error('預約建立失敗，無回傳資料');
    }

    const bookingId = booking[0].id;

    // 5. 自動建立或連結聊天室 (Auto-Chat Feature)
    try {
      // 檢查是否已有現存聊天室
      const { data: existingRoom } = await adminSupabase
        .from('chat_rooms')
        .select('id')
        .eq('user_id', userId)
        .eq('coach_id', coachId)
        .maybeSingle();

      if (existingRoom) {
        // 已有聊天室，更新關聯的 booking_id
        await adminSupabase
          .from('chat_rooms')
          .update({ booking_id: bookingId })
          .eq('id', existingRoom.id);
        console.log(`[AUTO-CHAT] Linked booking ${bookingId} to existing room ${existingRoom.id}`);
      } else {
        // 建立新聊天室
        const { data: newRoom, error: roomErr } = await adminSupabase
          .from('chat_rooms')
          .insert([{ 
            user_id: userId, 
            coach_id: coachId,
            booking_id: bookingId 
          }])
          .select('id')
          .single();
        
        if (!roomErr) {
          console.log(`[AUTO-CHAT] Created new room ${newRoom.id} for booking ${bookingId}`);
        }
      }
    } catch (chatErr) {
      console.error('[AUTO-CHAT ERROR] Failed to sync chat room:', chatErr);
      // 不要因為聊天室建立失敗而導致預約失敗，僅記錄錯誤
    }

    return NextResponse.json({ 
      success: true, 
      bookingId: booking[0].id, 
      finalPrice, 
      depositPaid 
    });
  } catch (error) {
    console.error('Booking creation error:', error);
    return NextResponse.json({ error: '預約失敗，伺服器內部錯誤' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const adminSupabase = getAdminSupabase();
    let query = adminSupabase
      .from('bookings')
      .select(`
        *, 
        users!bookings_user_id_fkey(name), 
        coaches:users!bookings_coach_id_fkey(name), 
        reviews(id)
      `)
      .order('created_at', { ascending: false });

    if (auth.user.role === 'admin') {
      // 管理員讀取全部
    } else if (auth.user.role === 'coach') {
      query = query.eq('coach_id', auth.user.id);
    } else {
      query = query.eq('user_id', auth.user.id);
    }

    const { data: bookings, error } = await query;
    if (error) throw error;

    // 5. 格式化回傳資料（確保安全取值）
    const formatted = (bookings || []).map(b => ({
      ...b,
      user_name: b.users?.name || '未知使用者',
      coach_name: b.coaches?.name || '未知教練',
      review_id: b.reviews && b.reviews.length > 0 ? b.reviews[0].id : null
    }));

    return NextResponse.json({ bookings: formatted });
  } catch (err) {
    console.error('Booking list error:', err);
    return NextResponse.json({ error: '無法取得預約資料' }, { status: 500 });
  }
}
