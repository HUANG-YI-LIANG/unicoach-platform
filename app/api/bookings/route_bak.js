export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { calcBaseDiscount } from '@/lib/discountRules';
import { addWeeks } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { getCoachSaleability, pickFormalPlanForBooking } from '@/lib/salableCoachRules';
import {
  assertFutureBookingTime,
  calculateBookingPrice,
  getServerCouponDiscount,
  isBookingTimeAllowed,
  clampPercent,
  roundMoney,
} from '@/lib/bookingSecurity';

const ACTIVE_BOOKING_STATUSES = ['pending_payment', 'scheduled', 'in_progress', 'pending_completion', 'completed'];
const GET_BOOKING_FIELDS = [
  'id',
  'user_id',
  'coach_id',
  'expected_time',
  'status',
  'created_at',
  'updated_at',
  'base_price',
  'discount_amount',
  'final_price',
  'deposit_paid',
  'price_adjustment',
  'grade',
  'gender',
  'attendees_count',
  'learning_status',
  'coupon_discount',
  'series_id',
  'recurrence_pattern',
  'session_number',
  'duration_minutes',
  'payment_expires_at',
  'payment_status',
  'paid_at',
  'payment_reference',
  'plan_id',
  'plan_title',
  'cancel_reason',
  'cancel_fault_party',
  'cancelled_at',
  'completed_at',
  'platform_fee',
  'coach_payout',
];

function isExpiredPendingPayment(booking) {
  if (booking?.status !== 'pending_payment' || !booking.payment_expires_at) return false;
  return Date.now() > new Date(booking.payment_expires_at).getTime();
}

function getBookingCreationErrorResponse(error) {
  const text = [error?.code, error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(' ');

  if (/23505|coupon_redemptions|unique/i.test(text)) {
    return { status: 409, error: '優惠券已使用，請重新選擇其他優惠券' };
  }

  if (/23P01|booking_time_conflict|時段衝突|conflict/i.test(text)) {
    return { status: 409, error: '時段衝突：該時段已被預約，請重新選擇其他時間' };
  }

  if (/booking_user_mismatch|coupon_id_mismatch|invalid_booking_time_or_duration|missing_booking_rows/i.test(text)) {
    return { status: 400, error: '預約資料不合法，請重新送出' };
  }

  return null;
}

const REQUIRED_BOOKING_SAFETY_FIELDS = [
  'expected_time',
  'duration_minutes',
  'payment_expires_at',
  'base_price',
  'final_price',
  'deposit_paid',
  'platform_fee',
  'coach_payout',
  'attendees_count',
  'plan_id',
];

function validateRequiredBookingSafetyFields(bookingsToInsert) {
  for (const [index, booking] of bookingsToInsert.entries()) {
    for (const field of REQUIRED_BOOKING_SAFETY_FIELDS) {
      const value = booking?.[field];
      if (value === null || value === undefined || value === '') {
        throw new Error(`missing_required_booking_safety_field:${field}:row:${index + 1}`);
      }
    }
  }
}

async function createBookingsSafely(adminSupabase, { bookingsToInsert, userId, couponId }) {
  validateRequiredBookingSafetyFields(bookingsToInsert);

  const { data, error } = await adminSupabase.rpc('create_booking_safe', {
    p_user_id: userId,
    p_coupon_id: couponId || null,
    p_bookings: bookingsToInsert,
  });

  if (error) {
    const mapped = getBookingCreationErrorResponse(error);
    if (mapped) return { ok: false, ...mapped };
    throw error;
  }

  const bookings = Array.isArray(data?.bookings) ? data.bookings : [];
  const bookingIds = Array.isArray(data?.booking_ids) ? data.booking_ids : [];
  const clientGeneratedBookings = bookingsToInsert
    .filter((booking) => Boolean(booking.id))
    .map((booking) => ({ id: booking.id }));
  const normalizedBookings = clientGeneratedBookings.length
    ? clientGeneratedBookings
    : bookings.length
      ? bookings
      : bookingIds.map((id) => ({ id }));

  return { ok: true, bookings: normalizedBookings, bookingIds };
}

function baseBookingDto(b) {
  return {
    id: b.id,
    user_id: b.user_id,
    coach_id: b.coach_id,
    expected_time: b.expected_time,
    status: b.status,
    created_at: b.created_at,
    base_price: b.base_price,
    discount_amount: b.discount_amount,
    final_price: b.final_price,
    deposit_paid: b.deposit_paid,
    price_adjustment: b.price_adjustment || 0,
    grade: b.grade,
    gender: b.gender,
    attendees_count: b.attendees_count,
    learning_status: b.learning_status,
    coupon_discount: b.coupon_discount,
    series_id: b.series_id,
    recurrence_pattern: b.recurrence_pattern,
    session_number: b.session_number,
    duration_minutes: b.duration_minutes,
    payment_expires_at: b.payment_expires_at,
    payment_status: b.payment_status,
    paid_at: b.paid_at,
    plan_id: b.plan_id,
    plan_title: b.plan_title,
    user_name: b.users?.name || '未知使用者',
    coach_name: b.coaches?.name || '未知教練',
    review_id: b.reviews && b.reviews.length > 0 ? b.reviews[0].id : null,
  };
}

function formatBookingForRole(b, role) {
  const dto = baseBookingDto(b);

  switch (role) {
    case 'admin':
      return {
        ...dto,
        updated_at: b.updated_at,
        payment_reference: b.payment_reference,
        cancel_reason: b.cancel_reason,
        cancel_fault_party: b.cancel_fault_party,
        cancelled_at: b.cancelled_at,
        completed_at: b.completed_at,
        platform_fee: b.platform_fee,
        coach_payout: b.coach_payout,
      };
    case 'coach':
      return {
        ...dto,
        cancel_reason: b.cancel_reason,
        cancel_fault_party: b.cancel_fault_party,
        cancelled_at: b.cancelled_at,
        completed_at: b.completed_at,
      };
    case 'student':
    case 'user':
    default:
      return {
        ...dto,
        payment_reference: b.payment_reference,
      };
  }
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
      isRecurring = false,
      recurringWeeks = 1,
      planId
    } = await request.json();

    const finalGrade = age || grade; // 映射

    // 1. 獲取教練當前價格、抽成比例與審核狀態
    const { data: coach, error: coachErr } = await adminSupabase
      .from('coaches')
      .select('base_price, commission_rate, approval_status, available_times')
      .eq('user_id', coachId)
      .single();

    const normalizedExpectedTime = new Date(expectedTime);
    if (Number.isNaN(normalizedExpectedTime.getTime())) {
      return NextResponse.json({ error: 'Invalid booking time' }, { status: 400 });
    }

    const futureTimeCheck = assertFutureBookingTime(normalizedExpectedTime);
    if (!futureTimeCheck.ok) {
      return NextResponse.json({ error: futureTimeCheck.error }, { status: futureTimeCheck.status });
    }

    if (coachErr || !coach) return NextResponse.json({ error: '找不到該教練資料' }, { status: 404 });

    // ✅ 安全門檻：只有 'approved' 狀態的教練才能接受預約
    if (coach.approval_status !== 'approved') {
      return NextResponse.json({ 
        error: '該教練目前不接受預約（尚未審核通過或已被暫停）',
        status: coach.approval_status 
      }, { status: 403 });
    }

    const { data: coachPlans, error: coachPlansError } = await adminSupabase
      .from('coach_plans')
      .select('*')
      .eq('coach_id', coachId)
      .eq('is_active', true);

    if (coachPlansError) throw coachPlansError;

    const planPick = pickFormalPlanForBooking({
      requestedPlanId: planId,
      plans: coachPlans || [],
    });
    if (!planPick.ok) {
      return NextResponse.json({ error: planPick.error }, { status: planPick.status });
    }

    const selectedPlan = planPick.plan;

    const [{ data: availabilityRules, error: availabilityRulesError }, { data: availabilityExceptions, error: availabilityExceptionsError }] = await Promise.all([
      adminSupabase
        .from('coach_availability_rules')
        .select('weekday, start_time, end_time, slot_minutes, is_active')
        .eq('coach_id', coachId),
      adminSupabase
        .from('coach_availability_exceptions')
        .select('exception_date, exception_type, start_time, end_time')
        .eq('coach_id', coachId),
    ]);

    if (availabilityRulesError) throw availabilityRulesError;
    if (availabilityExceptionsError) throw availabilityExceptionsError;

    const saleability = getCoachSaleability({
      coach,
      plans: coachPlans || [],
      availabilityRules: availabilityRules || [],
    });
    if (!saleability.canSell) {
      return NextResponse.json({
        error: '該教練尚未完成正式課程方案或固定可預約時段設定，暫不開放預約',
        reasons: saleability.reasons,
      }, { status: 400 });
    }

    const durationMinutes = selectedPlan.duration_minutes;
    const planPrice = selectedPlan.price;

    const totalSessions = isRecurring ? parseInt(recurringWeeks) : 1;
    const seriesId = isRecurring ? uuidv4() : null;
    const recurrencePattern = isRecurring ? 'weekly' : null;

    for (let i = 0; i < totalSessions; i++) {
      const sessionTime = isRecurring ? addWeeks(normalizedExpectedTime, i) : normalizedExpectedTime;
      const availabilityCheck = isBookingTimeAllowed({
        expectedTime: sessionTime,
        durationMinutes,
        rules: availabilityRules || [],
        exceptions: availabilityExceptions || [],
        legacyAvailableTimes: null,
      });
      if (!availabilityCheck.ok) {
        return NextResponse.json({ error: `第 ${i + 1} 堂課無法預約：${availabilityCheck.error}` }, { status: 400 });
      }
    }

    const basePrice = planPrice;

    // 2. 計算基礎折扣率 (基於用戶等級與預約歷史)
    const { count: userBookingsCount } = await adminSupabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('status', ACTIVE_BOOKING_STATUSES);
    
    const { data: userData, error: userDataErr } = await adminSupabase
      .from('users')
      .select('level')
      .eq('id', userId)
      .maybeSingle();

    if (userDataErr) throw userDataErr;

    let couponResult;
    try {
      const { data: authUser, error: authUserError } = await adminSupabase.auth.admin.getUserById(userId);
      if (authUserError) throw authUserError;
      const metadata = authUser?.user?.user_metadata || {};
      couponResult = getServerCouponDiscount({
        requestedCouponId: couponId,
        claimedCoupons: metadata.coupons || [],
      });
    } catch (couponError) {
      return NextResponse.json({ error: couponError.message || '優惠券驗證失敗' }, { status: 400 });
    }
    
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
    const globalCommission = Number.isFinite(parsedGlobalCommission)
      ? clampPercent(parsedGlobalCommission, 20)
      : 20;

    const coachCommission = coach.commission_rate !== null && coach.commission_rate !== undefined 
      ? coach.commission_rate 
      : globalCommission;

    // 3. 累加折扣 (基礎 + server 驗證後的優惠券)
    const couponDiscountPercent = couponResult.percent;
    const pricing = calculateBookingPrice({
      basePrice,
      baseDiscountPercent,
      couponDiscountPercent,
      coachCommission,
    });
    const discountAmount = pricing.discountAmount;

    // 4. 計算金額拆分
    const finalPrice = pricing.finalPrice;
    const depositPaid = pricing.depositPaid;
    const platformFee = pricing.platformFee;
    const coachPayout = pricing.coachPayout;

    // 5. 建立預約紀錄
    const bookingsToInsert = [];
    const paymentExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    for (let i = 0; i < totalSessions; i++) {
      const sessionTime = isRecurring ? addWeeks(normalizedExpectedTime, i) : normalizedExpectedTime;
      bookingsToInsert.push({
        id: uuidv4(),
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
        attendees_count: Math.max(1, Math.round(Number(attendeesCount) || 1)),
        learning_status: learningStatus,
        coupon_id: couponResult.couponId,
        coupon_discount: couponDiscountPercent,
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

    const bookingCreation = await createBookingsSafely(adminSupabase, {
      bookingsToInsert,
      userId,
      couponId: couponResult.couponId,
    });

    if (!bookingCreation.ok) {
      return NextResponse.json({ error: bookingCreation.error }, { status: bookingCreation.status });
    }

    const bookings = bookingCreation.bookings;
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
      totalFinalPrice: roundMoney(finalPrice * totalSessions),
      finalPrice: roundMoney(finalPrice * totalSessions),
      perSessionDepositPaid: depositPaid,
      totalDepositPaid: roundMoney(depositPaid * totalSessions),
      depositPaid: roundMoney(depositPaid * totalSessions),
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
        ${GET_BOOKING_FIELDS.join(', ')},
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
      .filter((b) => !isExpiredPendingPayment(b))
      .map((b) => formatBookingForRole(b, auth.user.role));

    return NextResponse.json({ bookings: formatted });
  } catch (err) {
    console.error('Booking list error:', err);
    return NextResponse.json({ error: '無法取得預約資料' }, { status: 500 });
  }
}
