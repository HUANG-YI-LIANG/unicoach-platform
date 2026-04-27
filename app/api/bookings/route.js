import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { calcBaseDiscount } from '@/lib/discountRules';
import { addWeeks } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { pickDefaultPlanById, normalizePlan } from '@/lib/coachPlans';

const OPTIONAL_BOOKING_COLUMNS = new Set([
  'grade',
  'gender',
  'attendees_count',
  'learning_status',
  'coupon_id',
  'coupon_discount',
  'series_id',
  'recurrence_pattern',
  'session_number',
  'duration_minutes',
  'payment_expires_at',
  'plan_id',
  'plan_title',
  'plan_snapshot',
]);

function getMissingColumnName(error) {
  const text = [error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(' ');

  return (
    text.match(/'([^']+)' column/)?.[1] ||
    text.match(/column "([^"]+)"/)?.[1] ||
    null
  );
}

async function fetchExistingBookings(adminSupabase, coachId, nowIso) {
  const optionalFields = ['payment_expires_at', 'duration_minutes'];
  let fields = ['id', 'expected_time', 'status', ...optionalFields];

  for (let attempt = 0; attempt <= optionalFields.length; attempt += 1) {
    const { data, error } = await adminSupabase
      .from('bookings')
      .select(fields.join(', '))
      .eq('coach_id', coachId)
      .gte('expected_time', nowIso)
      .in('status', ['pending_payment', 'scheduled', 'in_progress', 'pending_completion', 'completed']);

    if (!error) return data || [];

    const missingColumn = getMissingColumnName(error);
    if (!missingColumn || !fields.includes(missingColumn)) {
      throw error;
    }

    console.warn(`[BOOKING] Missing optional select column "${missingColumn}", retrying without it.`);
    fields = fields.filter((field) => field !== missingColumn);
  }

  return [];
}

async function insertBookingsWithSchemaFallback(adminSupabase, rows) {
  let currentRows = rows.map((row) => ({ ...row }));
  const removedColumns = [];

  for (let attempt = 0; attempt <= OPTIONAL_BOOKING_COLUMNS.size; attempt += 1) {
    const { data, error } = await adminSupabase
      .from('bookings')
      .insert(currentRows)
      .select('id');

    if (!error) {
      return { data, removedColumns };
    }

    const missingColumn = getMissingColumnName(error);
    if (!missingColumn || !OPTIONAL_BOOKING_COLUMNS.has(missingColumn)) {
      throw error;
    }

    removedColumns.push(missingColumn);
    console.warn(`[BOOKING] Missing optional insert column "${missingColumn}", retrying without it.`);
    currentRows = currentRows.map((row) => {
      const next = { ...row };
      delete next[missingColumn];
      return next;
    });
  }

  throw new Error('預約建立失敗，資料庫欄位缺失過多');
}

export async function POST(request) {
  try {
    const auth = await requireAuth(['user', 'admin']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });
    
    const adminSupabase = getAdminSupabase();
    const userId = auth.user.id;
    const { 
      coachId, 
      expectedTime, 
      grade, 
      age, // 新增：支援前端傳入的 age
      gender, 
      attendeesCount, 
      learningStatus,
      couponId = null,
      couponDiscount = 0,
      isRecurring = false,
      recurringWeeks = 1,
      planId
    } = await request.json();

    const finalGrade = age || grade; // 映射

    // 1. 獲取教練當前價格、抽成比例與審核狀態
    const { data: coach, error: coachErr } = await adminSupabase
      .from('coaches')
      .select('base_price, commission_rate, approval_status')
      .eq('user_id', coachId)
      .single();

    const normalizedExpectedTime = new Date(expectedTime);
    if (Number.isNaN(normalizedExpectedTime.getTime())) {
      return NextResponse.json({ error: 'Invalid booking time' }, { status: 400 });
    }

    if (coachErr || !coach) return NextResponse.json({ error: '找不到該教練資料' }, { status: 404 });

    // ✅ 安全門檻：只有 'approved' 狀態的教練才能接受預約
    if (coach.approval_status !== 'approved') {
      return NextResponse.json({ 
        error: '該教練目前不接受預約（尚未審核通過或已被暫停）',
        status: coach.approval_status 
      }, { status: 403 });
    }

    let selectedPlan = null;
    if (planId && !String(planId).startsWith('default-')) {
      const { data: plan, error: planError } = await adminSupabase
        .from('coach_plans')
        .select('*')
        .eq('id', planId)
        .eq('coach_id', coachId)
        .eq('is_active', true)
        .maybeSingle();

      if (planError) throw planError;
      selectedPlan = normalizePlan(plan);
      if (!selectedPlan) {
        return NextResponse.json({ error: '找不到可預約的教練方案' }, { status: 400 });
      }
    } else {
      selectedPlan = pickDefaultPlanById(coachId, coach.base_price, planId);
    }

    const durationMinutes = selectedPlan.duration_minutes;
    const planPrice = selectedPlan.price;

    const totalSessions = isRecurring ? parseInt(recurringWeeks) : 1;
    const seriesId = isRecurring ? uuidv4() : null;
    const recurrencePattern = isRecurring ? 'weekly' : null;

    // 獲取該教練未來的所有有效預約 (為了在記憶體中進行區間比對)
    const nowIso = new Date().toISOString();
    const existingBookings = await fetchExistingBookings(adminSupabase, coachId, nowIso);

    for (let i = 0; i < totalSessions; i++) {
      const sessionTime = isRecurring ? addWeeks(normalizedExpectedTime, i) : normalizedExpectedTime;
      const newStart = sessionTime.getTime();
      const newEnd = newStart + durationMinutes * 60 * 1000;

      // 嚴格比對時間區間重疊
      const hasOverlap = existingBookings?.some(booking => {
        // 若為 pending_payment 且已過期，則不視為衝突
        if (booking.status === 'pending_payment' && booking.payment_expires_at) {
          const expiresAt = new Date(booking.payment_expires_at).getTime();
          if (Date.now() > expiresAt) return false;
        }

        const existingStart = new Date(booking.expected_time).getTime();
        const existingDuration = booking.duration_minutes || 60; 
        const existingEnd = existingStart + existingDuration * 60 * 1000;
        
        // 區間重疊條件: (StartA < EndB) && (StartB < EndA)
        return (newStart < existingEnd) && (existingStart < newEnd);
      });

      if (hasOverlap) {
        return NextResponse.json({ error: `時段衝突：第 ${i + 1} 堂課的時段（包含課程長度）已與現有預約重疊。` }, { status: 409 });
      }
    }

    const basePrice = planPrice;

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

    // Fetch global commission setting from platform key/value store
    const { data: commissionSetting, error: commissionSettingError } = await adminSupabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'commission_rate')
      .maybeSingle();

    if (commissionSettingError) {
      throw commissionSettingError;
    }

    const parsedGlobalCommission = Number(commissionSetting?.value);
    const globalCommission = Number.isFinite(parsedGlobalCommission) && parsedGlobalCommission >= 0
      ? parsedGlobalCommission
      : 20;

    // 3. 累加折扣 (基礎 + 優惠券)
    const totalDiscountPercent = baseDiscountPercent + parseInt(couponDiscount);
    const discountAmount = Math.min(Math.round(basePrice * (totalDiscountPercent / 100)), 300); // 折扣總額上限 300

    // 4. 計算金額拆分
    const finalPrice = basePrice - discountAmount;
    const depositPaid = Math.round(finalPrice * 0.3); // 訂金 3 成
    
    // 檢查是否有教練特定抽成比例，否則使用全域設定
    const coachCommission = coach.commission_rate !== null && coach.commission_rate !== undefined 
      ? coach.commission_rate 
      : globalCommission;
      
    const platformFee = Math.round(basePrice * (coachCommission / 100)); // 平台服務費
    const coachPayout = basePrice - platformFee; // 教練實拿

    // 5. 建立預約紀錄
    const bookingsToInsert = [];
    const paymentExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    for (let i = 0; i < totalSessions; i++) {
      const sessionTime = isRecurring ? addWeeks(normalizedExpectedTime, i) : normalizedExpectedTime;
      bookingsToInsert.push({
        user_id: userId,
        coach_id: coachId,
        expected_time: sessionTime.toISOString(),
        base_price: basePrice,
        discount_amount: discountAmount,
        final_price: finalPrice,
        deposit_paid: depositPaid,
        platform_fee: platformFee,
        coach_payout: coachPayout,
        grade: finalGrade,
        gender: gender,
        attendees_count: attendeesCount,
        learning_status: learningStatus,
        coupon_id: couponId,
        coupon_discount: couponDiscount,
        status: 'pending_payment',
        series_id: seriesId,
        recurrence_pattern: recurrencePattern,
        session_number: i + 1,
        duration_minutes: durationMinutes,
        payment_expires_at: paymentExpiresAt,
        plan_id: selectedPlan.id,
        plan_title: selectedPlan.title,
        plan_snapshot: JSON.stringify({
          id: selectedPlan.id,
          title: selectedPlan.title,
          description: selectedPlan.description || '',
          duration_minutes: selectedPlan.duration_minutes,
          price: selectedPlan.price,
          is_default: selectedPlan.is_default,
        })
      });
    }

    const { data: bookings, removedColumns } = await insertBookingsWithSchemaFallback(adminSupabase, bookingsToInsert);

    if (removedColumns.length) {
      console.warn(`[BOOKING] Created booking with schema fallback. Missing columns: ${removedColumns.join(', ')}`);
    }

    if (!bookings || bookings.length === 0) {
      throw new Error('預約建立失敗，無回傳資料');
    }

    const bookingId = bookings[0].id;

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
      bookingId: bookings[0].id,
      seriesId: seriesId,
      perSessionFinalPrice: finalPrice,
      totalFinalPrice: finalPrice * totalSessions,
      finalPrice: finalPrice * totalSessions,
      perSessionDepositPaid: depositPaid,
      totalDepositPaid: depositPaid * totalSessions,
      depositPaid: depositPaid * totalSessions,
      totalSessions
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

    // 5. 格式化回傳資料（確保安全取值），並過濾掉已過期的待付款訂單
    const formatted = (bookings || [])
      .filter(b => {
        if (b.status === 'pending_payment' && b.payment_expires_at) {
          const expiresAt = new Date(b.payment_expires_at).getTime();
          if (Date.now() > expiresAt) {
            return false; // 過期的待付款訂單直接消失
          }
        }
        return true;
      })
      .map(b => ({
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
