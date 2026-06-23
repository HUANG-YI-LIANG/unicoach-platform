export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { maskIdentifier, safeErrorDetails } from '@/lib/safeLogging';
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
import {
  buildChatRoomInsert,
  buildChatRoomUpsertOptions,
  isDuplicateChatRoomError,
} from '@/lib/chatRules';

const ACTIVE_BOOKING_STATUSES = ['pending_payment', 'scheduled', 'in_progress', 'pending_completion', 'completed'];
const BOOKING_PLAN_SELECT = 'id, coach_id, title, description, duration_minutes, price, is_active, is_default';
const SERVICE_SELECT = `
  id,
  coach_profile_id,
  title,
  intro,
  price,
  trial_price,
  is_active,
  coach_profiles!inner(
    id,
    user_id,
    verification_status,
    users!inner(id)
  )
`;
const GET_BOOKING_FIELDS = [
  'id',
  'user_id',
  'coach_id',
  'coach_service_id',
  'service_title',
  'service_price_type',
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
  'rebook_from_booking_id',
  'rebook_context',
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

  if (/23P01|booking_time_conflict|時段衝突|conflict|bookings_no_active_time_overlap/i.test(text)) {
    return { status: 409, error: '時段衝突：該時段已被預約，請重新選擇其他時間' };
  }

  if (/booking_user_mismatch|coupon_id_mismatch|invalid_booking_time_or_duration|missing_booking_rows|service_id_mismatch|rebook_source_not_found|rebook_source_coach_mismatch|rebook_source_service_mismatch|rebook_source_not_completed/i.test(text)) {
    return { status: 400, error: '預約資料不合法，請重新送出' };
  }

  if (/rebook_source_user_mismatch|42501/i.test(text)) {
    return { status: 403, error: '續課來源不屬於目前使用者' };
  }

  return null;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value) {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function normalizeOptionalText(value) {
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  return text ? text : undefined;
}

async function loadRebookSource(adminSupabase, { rebookFromBookingId, userId }) {
  if (!rebookFromBookingId) return { ok: true, source: null };

  if (!isUuid(rebookFromBookingId)) {
    return { ok: false, status: 400, error: '續課來源預約 ID 格式錯誤' };
  }

  const { data: source, error } = await adminSupabase
    .from('bookings')
    .select('id, user_id, coach_id, coach_service_id, service_price_type, grade, gender, attendees_count, learning_status, duration_minutes, plan_id, status, expected_time')
    .eq('id', rebookFromBookingId)
    .maybeSingle();

  if (error) throw error;
  if (!source) return { ok: false, status: 404, error: '找不到續課來源預約' };
  if (String(source.user_id) !== String(userId)) {
    return { ok: false, status: 403, error: '續課來源不屬於目前使用者' };
  }
  if (!['completed', 'pending_completion'].includes(source.status)) {
    return { ok: false, status: 400, error: '只有已完成課程可以作為續課來源' };
  }
  if (!source.coach_service_id) {
    return { ok: false, status: 400, error: '續課來源缺少服務 ID，請改從服務詳情頁重新預約' };
  }

  return { ok: true, source };
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
  'coach_service_id',
];

const REQUIRED_WALLET_BOOKING_SAFETY_FIELDS = REQUIRED_BOOKING_SAFETY_FIELDS
  .filter((field) => field !== 'payment_expires_at');

function validateRequiredBookingSafetyFields(bookingsToInsert, requiredFields = REQUIRED_BOOKING_SAFETY_FIELDS) {
  for (const [index, booking] of bookingsToInsert.entries()) {
    for (const field of requiredFields) {
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

async function createWalletBookingsSafely(adminSupabase, { bookingsToInsert, userId, couponId, totalPoints, maxBonusAllowed = 0 }) {
  validateRequiredBookingSafetyFields(bookingsToInsert, REQUIRED_WALLET_BOOKING_SAFETY_FIELDS);

  const { data, error } = await adminSupabase.rpc('create_wallet_booking_safe', {
    p_user_id: userId,
    p_total_points: totalPoints,
    p_coupon_id: couponId || null,
    p_bookings: bookingsToInsert,
    p_max_bonus_allowed: maxBonusAllowed
  });

  if (error) {
    const text = [error?.code, error?.message, error?.details, error?.hint]
      .filter(Boolean)
      .join(' ');

    if (/create_wallet_booking_safe|Could not find the function|PGRST202/i.test(text)) {
      return { ok: false, status: 500, error: '請先執行錢包補強 SQL migration 後再建立點數預約' };
    }

    if (/insufficient_funds/i.test(text)) {
      return { ok: false, status: 400, error: '錢包餘額不足' };
    }

    const mapped = getBookingCreationErrorResponse(error);
    if (mapped) return { ok: false, ...mapped };
    throw error;
  }

  const bookingPayload = data?.bookings || data;
  const bookings = Array.isArray(bookingPayload?.bookings) ? bookingPayload.bookings : [];
  const bookingIds = Array.isArray(bookingPayload?.booking_ids) ? bookingPayload.booking_ids : [];
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

function normalizeServicePriceType(body) {
  if (body?.servicePriceType === 'trial' || body?.priceType === 'trial' || body?.isTrialBooking === true) {
    return 'trial';
  }
  return 'regular';
}

function snapshotService(service, servicePriceType, durationMinutes) {
  return JSON.stringify({
    id: service.id,
    title: service.title,
    price: service.price,
    trial_price: service.trial_price,
    service_price_type: servicePriceType,
    duration_minutes: durationMinutes,
    coach_profile_id: service.coach_profile_id,
    coach_user_id: service.coach_profiles?.user_id,
  });
}

async function loadServiceForBooking(adminSupabase, { serviceId, coachId }) {
  if (!serviceId) {
    return { ok: false, status: 400, error: '缺少服務 ID，請從服務詳情頁重新預約' };
  }

  const { data: service, error } = await adminSupabase
    .from('coach_services')
    .select(SERVICE_SELECT)
    .eq('id', serviceId)
    .maybeSingle();

  if (error) throw error;
  if (!service) return { ok: false, status: 404, error: '找不到該服務' };

  const serviceCoachUserId = service.coach_profiles?.user_id || service.coach_profiles?.users?.id;
  if (!serviceCoachUserId) {
    return { ok: false, status: 400, error: '服務尚未綁定可預約的教練帳號' };
  }

  if (coachId && String(coachId) !== String(serviceCoachUserId)) {
    return { ok: false, status: 400, error: '預約教練與服務所屬教練不一致，請重新整理後再試' };
  }

  if (!service.is_active || service.coach_profiles?.verification_status !== 'approved') {
    return { ok: false, status: 403, error: '該服務目前未開放預約' };
  }

  return { ok: true, service, coachId: serviceCoachUserId };
}

function getServiceBasePrice(service, servicePriceType) {
  const regularPrice = Number(service?.price);
  const trialPrice = Number(service?.trial_price);
  if (servicePriceType === 'trial' && Number.isFinite(trialPrice) && trialPrice > 0) {
    return roundMoney(trialPrice);
  }
  return roundMoney(regularPrice);
}

async function syncBookingChatRoom(adminSupabase, { userId, coachId, bookingId }) {
  try {
    const { data: existingRoom, error: existingError } = await adminSupabase
      .from('chat_rooms')
      .select('id')
      .eq('user_id', userId)
      .eq('coach_id', coachId)
      .maybeSingle();

    if (existingError) throw existingError;

    let roomId;
    if (existingRoom) {
      roomId = existingRoom.id;
      await adminSupabase
        .from('chat_rooms')
        .update({ booking_id: bookingId })
        .eq('id', roomId);
    } else {
      const { data: newRoom, error: insertError } = await adminSupabase
        .from('chat_rooms')
        .insert({ user_id: userId, coach_id: coachId, booking_id: bookingId })
        .select('id')
        .single();

      if (insertError) {
        if (isDuplicateChatRoomError(insertError)) {
          const { data: fallbackRoom } = await adminSupabase
            .from('chat_rooms')
            .select('id')
            .eq('user_id', userId)
            .eq('coach_id', coachId)
            .single();
          if (fallbackRoom) {
            roomId = fallbackRoom.id;
            await adminSupabase
              .from('chat_rooms')
              .update({ booking_id: bookingId })
              .eq('id', roomId);
          }
        } else {
          throw insertError;
        }
      } else {
        roomId = newRoom?.id;
      }
    }

    if (roomId) {
      console.info(`[AUTO-CHAT] Synced room ${maskIdentifier(roomId)} for booking ${maskIdentifier(bookingId)}`);
    }
  } catch (chatErr) {
    console.error('[AUTO-CHAT ERROR] Failed to sync chat room:', safeErrorDetails(chatErr));
  }
}

function baseBookingDto(b) {
  return {
    id: b.id,
    user_id: b.user_id,
    coach_id: b.coach_id,
    coach_service_id: b.coach_service_id,
    service_title: b.service_title,
    service_price_type: b.service_price_type,
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
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.warn('[BOOKING JSON WARNING]', safeErrorDetails(parseError));
      return NextResponse.json({ error: '請求格式錯誤' }, { status: 400 });
    }
    const {
      coachId: requestedCoachId,
      serviceId,
      coachServiceId,
      expectedTime,
      grade,
      age,
      gender,
      attendeesCount,
      learningStatus,
      couponId = null,
      isRecurring = false,
      recurringWeeks = 1,
      planId,
      durationMinutes: requestedDurationMinutes,
      rebookFromBookingId: camelRebookFromBookingId,
      rebook_from_booking_id: snakeRebookFromBookingId,
    } = body;

    const rebookFromBookingId = camelRebookFromBookingId || snakeRebookFromBookingId || null;
    const rebookSourceLoad = await loadRebookSource(adminSupabase, {
      rebookFromBookingId,
      userId,
    });
    if (!rebookSourceLoad.ok) {
      return NextResponse.json({ error: rebookSourceLoad.error }, { status: rebookSourceLoad.status });
    }

    const rebookSource = rebookSourceLoad.source;
    const effectiveServiceId = serviceId || coachServiceId || rebookSource?.coach_service_id;
    const effectiveCoachId = requestedCoachId || rebookSource?.coach_id;
    const finalGrade = normalizeOptionalText(age || grade) || rebookSource?.grade || null;
    const finalGender = normalizeOptionalText(gender) || rebookSource?.gender || null;
    const finalLearningStatus = normalizeOptionalText(learningStatus) || rebookSource?.learning_status || null;
    const finalAttendeesCount = attendeesCount ?? rebookSource?.attendees_count;
    const finalRequestedDurationMinutes = requestedDurationMinutes ?? rebookSource?.duration_minutes;
    const finalPlanId = planId || rebookSource?.plan_id || null;
    const servicePriceType = normalizeServicePriceType({ ...body, servicePriceType: body?.servicePriceType || rebookSource?.service_price_type });
    const serviceLoad = await loadServiceForBooking(adminSupabase, {
      serviceId: effectiveServiceId,
      coachId: effectiveCoachId,
    });
    if (!serviceLoad.ok) {
      return NextResponse.json({ error: serviceLoad.error }, { status: serviceLoad.status });
    }

    const { service, coachId } = serviceLoad;

    const normalizedExpectedTime = new Date(expectedTime);
    if (Number.isNaN(normalizedExpectedTime.getTime())) {
      return NextResponse.json({ error: 'Invalid booking time' }, { status: 400 });
    }

    const futureTimeCheck = assertFutureBookingTime(normalizedExpectedTime);
    if (!futureTimeCheck.ok) {
      return NextResponse.json({ error: futureTimeCheck.error }, { status: futureTimeCheck.status });
    }

    const { data: coach, error: coachErr } = await adminSupabase
      .from('coaches')
      .select('base_price, commission_rate, approval_status, available_times')
      .eq('user_id', coachId)
      .single();

    if (coachErr || !coach) return NextResponse.json({ error: '找不到該教練資料' }, { status: 404 });
    if (coach.approval_status !== 'approved') {
      return NextResponse.json({
        error: '該教練目前不接受預約（尚未審核通過或已被暫停）',
        status: coach.approval_status,
      }, { status: 403 });
    }

    const { data: coachPlans, error: coachPlansError } = await adminSupabase
      .from('coach_plans')
      .select(BOOKING_PLAN_SELECT)
      .eq('coach_id', coachId)
      .eq('is_active', true);

    if (coachPlansError) throw coachPlansError;

    let selectedPlan = null;
    if (finalPlanId || !finalRequestedDurationMinutes) {
      const planPick = pickFormalPlanForBooking({
        requestedPlanId: finalPlanId,
        plans: coachPlans || [],
      });
      if (planPick.ok) selectedPlan = planPick.plan;
      else if (!finalRequestedDurationMinutes) {
        return NextResponse.json({ error: planPick.error }, { status: planPick.status });
      }
    }

    const durationMinutes = Number.isFinite(Number(finalRequestedDurationMinutes)) && Number(finalRequestedDurationMinutes) > 0
      ? Math.round(Number(finalRequestedDurationMinutes))
      : selectedPlan?.duration_minutes || 60;

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
        error: '該教練尚未完成固定可預約時段設定，暫不開放預約',
        reasons: saleability.reasons,
      }, { status: 400 });
    }

    const totalSessions = isRecurring ? Math.max(1, Math.min(12, parseInt(recurringWeeks, 10) || 1)) : 1;
    const seriesId = isRecurring ? uuidv4() : null;
    const recurrencePattern = isRecurring ? 'weekly' : null;

    for (let i = 0; i < totalSessions; i++) {
      const sessionTime = isRecurring ? addWeeks(normalizedExpectedTime, i) : normalizedExpectedTime;
      const availabilityCheck = isBookingTimeAllowed({
        expectedTime: sessionTime,
        durationMinutes,
        rules: availabilityRules || [],
        exceptions: availabilityExceptions || [],
        legacyAvailableTimes: coach.available_times || null,
      });
      if (!availabilityCheck.ok) {
        return NextResponse.json({ error: `第 ${i + 1} 堂課無法預約：${availabilityCheck.error}` }, { status: 400 });
      }
    }

    const basePrice = getServiceBasePrice(service, servicePriceType);
    if (!Number.isFinite(basePrice) || basePrice <= 0) {
      return NextResponse.json({ error: '服務價格不合法，請聯絡客服或重新選擇服務' }, { status: 400 });
    }

    const { count: userBookingsCount } = await adminSupabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('status', ACTIVE_BOOKING_STATUSES);

    const { data: userData, error: userDataErr } = await adminSupabase
      .from('users')
      .select('level, wallet_balance')
      .eq('id', userId)
      .maybeSingle();

    if (userDataErr) throw userDataErr;

    let couponResult;
    const { data: authUser, error: authUserError } = await adminSupabase.auth.admin.getUserById(userId);
    if (authUserError) {
      console.error('Coupon auth lookup error:', safeErrorDetails(authUserError));
      return NextResponse.json({ error: '優惠券驗證失敗' }, { status: 400 });
    }

    const metadata = authUser?.user?.user_metadata || {};
    try {
      couponResult = getServerCouponDiscount({
        requestedCouponId: couponId,
        claimedCoupons: metadata.coupons || [],
      });
    } catch (couponError) {
      return NextResponse.json({ error: couponError.message || '優惠券驗證失敗' }, { status: 400 });
    }

    const isFirst = (userBookingsCount || 0) === 0;
    const baseDiscountPercent = calcBaseDiscount(userData?.level || 1, isFirst);

    const { data: platformSettings, error: settingsError } = await adminSupabase
      .from('platform_settings')
      .select('key, value')
      .in('key', ['commission_rate', 'user_tier_discounts']);

    if (settingsError) throw settingsError;

    const commissionSetting = platformSettings.find(s => s.key === 'commission_rate')?.value;
    const tierSettings = platformSettings.find(s => s.key === 'user_tier_discounts')?.value || [];

    const parsedGlobalCommission = Number(commissionSetting);
    const globalCommission = Number.isFinite(parsedGlobalCommission)
      ? clampPercent(parsedGlobalCommission, 20)
      : 20;

    const coachCommission = coach.commission_rate !== null && coach.commission_rate !== undefined
      ? coach.commission_rate
      : globalCommission;

    let maxBonusPercent = 0;
    if (userData?.level) {
      const userTier = tierSettings.find(t => t.level === userData.level);
      if (userTier && userTier.monthly_bonus_max_percent) {
        maxBonusPercent = Number(userTier.monthly_bonus_max_percent);
      }
    }

    const couponDiscountPercent = couponResult.percent;
    const pricing = calculateBookingPrice({
      basePrice,
      baseDiscountPercent,
      couponDiscountPercent,
      coachCommission,
    });
    const currentBalance = userData.wallet_balance || 0;
    const totalPointsToPay = roundMoney(pricing.finalPrice * totalSessions);
    if (currentBalance < totalPointsToPay) {
      return NextResponse.json({ error: '錢包餘額不足' }, { status: 400 });
    }

    const bookingsToInsert = [];
    const serviceSnapshot = snapshotService(service, servicePriceType, durationMinutes);

    for (let i = 0; i < totalSessions; i++) {
      const sessionTime = isRecurring ? addWeeks(normalizedExpectedTime, i) : normalizedExpectedTime;
      bookingsToInsert.push({
        id: uuidv4(),
        user_id: userId,
        coach_id: coachId,
        coach_service_id: service.id,
        service_title: service.title,
        service_price_type: servicePriceType,
        service_snapshot: serviceSnapshot,
        expected_time: sessionTime.toISOString(),
        base_price: basePrice,
        discount_amount: pricing.discountAmount,
        final_price: pricing.finalPrice,
        deposit_paid: pricing.depositPaid,
        platform_fee: pricing.platformFee,
        coach_payout: pricing.coachPayout,
        grade: finalGrade,
        gender: finalGender,
        attendees_count: Math.max(1, Math.round(Number(finalAttendeesCount) || 1)),
        learning_status: finalLearningStatus,
        coupon_id: couponResult.couponId,
        coupon_discount: couponDiscountPercent,
        status: 'scheduled', // direct to scheduled since it's paid
        payment_status: 'paid',
        paid_at: null,
        series_id: seriesId,
        recurrence_pattern: recurrencePattern,
        session_number: i + 1,
        duration_minutes: durationMinutes,
        payment_expires_at: null,
        plan_id: selectedPlan?.id || finalPlanId || null,
        plan_title: selectedPlan?.title || service.title,
        plan_snapshot: JSON.stringify({
          id: selectedPlan?.id || finalPlanId || null,
          title: selectedPlan?.title || service.title,
          description: selectedPlan?.description || service.intro || '',
          duration_minutes: durationMinutes,
          price: basePrice,
          is_default: selectedPlan?.is_default || false,
          source: selectedPlan ? 'coach_plans' : 'coach_services',
        }),
        rebook_from_booking_id: rebookSource?.id || null,
        rebook_context: rebookSource ? {
          source_booking_id: rebookSource.id,
          source_expected_time: rebookSource.expected_time,
          carried_fields: ['coach_id', 'coach_service_id', 'grade', 'gender', 'attendees_count', 'learning_status', 'duration_minutes', 'plan_id'],
        } : null,
      });
    }

    const maxBonusAllowed = Math.floor(totalPointsToPay * (maxBonusPercent / 100));

    const bookingCreation = await createWalletBookingsSafely(adminSupabase, {
      bookingsToInsert,
      userId,
      couponId: couponResult.couponId,
      totalPoints: totalPointsToPay,
      maxBonusAllowed
    });

    if (!bookingCreation.ok) {
      return NextResponse.json({ error: bookingCreation.error }, { status: bookingCreation.status });
    }

    const bookings = bookingCreation.bookings;
    if (!bookings || bookings.length === 0) {
      throw new Error('預約建立失敗，無回傳資料');
    }

    const bookingId = bookings[0].id;
    await syncBookingChatRoom(adminSupabase, { userId, coachId, bookingId });

    return NextResponse.json({
      success: true,
      bookingId,
      seriesId,
      coachServiceId: service.id,
      serviceTitle: service.title,
      servicePriceType,
      rebookFromBookingId: rebookSource?.id || null,
      perSessionFinalPrice: pricing.finalPrice,
      totalFinalPrice: roundMoney(pricing.finalPrice * totalSessions),
      finalPrice: roundMoney(pricing.finalPrice * totalSessions),
      perSessionDepositPaid: pricing.depositPaid,
      totalDepositPaid: roundMoney(pricing.depositPaid * totalSessions),
      depositPaid: roundMoney(pricing.depositPaid * totalSessions),
      totalSessions,
    });
  } catch (error) {
    console.error('Booking creation error:', safeErrorDetails(error));
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

    const formatted = (bookings || [])
      .filter((b) => !isExpiredPendingPayment(b))
      .map((b) => formatBookingForRole(b, auth.user.role));

    return NextResponse.json({ bookings: formatted });
  } catch (err) {
    console.error('Booking list error:', safeErrorDetails(err));
    return NextResponse.json({ error: '無法取得預約資料' }, { status: 500 });
  }
}
