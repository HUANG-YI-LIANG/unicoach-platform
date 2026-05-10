export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';
import {
  buildBookedSlotSet,
  addDays,
  doesCoachMatchSlot,
  generateSlotsForCoach,
  getNextAvailableSlot,
  getTodayDateString,
} from '@/lib/coachAvailability';
import {
  getCoachSaleability,
  getFormalActiveAvailabilityRules,
  getFormalActivePlans,
} from '@/lib/salableCoachRules';
import { safeErrorDetails } from '@/lib/safeLogging';

const LEVEL_META = {
  1: { key: 'beginner', label: '初階教練', rank: 1 },
  2: { key: 'advanced', label: '進階教練', rank: 2 },
  3: { key: 'professional', label: '專業教練', rank: 3 },
};

const PUBLIC_COACH_LIST_SELECT = `
  user_id,
  university,
  location,
  service_areas,
  philosophy,
  experience,
  base_price,
  commission_rate,
  approval_status,
  available_times,
  referral_code,
  users!inner(id, name, avatar_url, level)
`;
const PUBLIC_COACH_PLAN_SELECT = 'id, coach_id, title, description, duration_minutes, price, is_active, is_default';
const PUBLIC_AVAILABILITY_RULE_SELECT = 'coach_id, weekday, start_time, end_time, slot_minutes, is_active';
const PUBLIC_AVAILABILITY_EXCEPTION_SELECT = 'coach_id, exception_date, exception_type, start_time, end_time';

function normalizeLevel(levelValue) {
  const numeric = Number(levelValue);
  return LEVEL_META[numeric] ? numeric : 1;
}

function matchesRegion(coach, region) {
  if (!region) {
    return true;
  }

  const text = [
    coach.location,
    coach.university,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return text.includes(region.toLowerCase());
}

function matchesSport(coach, sport) {
  if (!sport) {
    return true;
  }

  const text = [
    coach.service_areas,
    coach.philosophy,
    coach.experience
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return text.includes(sport.toLowerCase());
}

function matchesCategory(coach, categoryFilter) {
  if (!categoryFilter) return true;
  
  const text = coach.service_areas || '';
  // 學科才藝的關鍵字清單
  const TUTOR_KEYWORDS = ['數', '英', '國文', '語', '文', '理化', '自然', '科學', '伴讀', '程式', '碼', '畫', '美術', '琴', '樂', '會考', '學測'];
  
  const hasTutor = TUTOR_KEYWORDS.some(k => text.includes(k));
  
  if (categoryFilter === 'tutors') return hasTutor;
  if (categoryFilter === 'sports') return !hasTutor;
  return true;
}

function matchesPriceRange(coach, minPrice, maxPrice) {
  const price = Number(coach.min_price || coach.base_price || 0);
  if (Number.isFinite(minPrice) && price < minPrice) {
    return false;
  }

  if (Number.isFinite(maxPrice) && maxPrice > 0 && price > maxPrice) {
    return false;
  }

  return true;
}

function matchesLevel(coach, levelFilter) {
  if (!levelFilter) {
    return true;
  }

  return String(coach.coach_level_value) === String(levelFilter);
}

function buildCoachListModel(coach, { reviewCount = 0, ratingAverage = 0 } = {}) {
  return {
    user_id: coach.user_id,
    users: {
      id: coach.users?.id,
      name: coach.users?.name,
      avatar_url: coach.users?.avatar_url,
      level: coach.users?.level,
    },
    review_count: reviewCount,
    rating_avg: ratingAverage,
    university: coach.university,
    location: coach.location,
    referral_code: coach.referral_code || null,
    service_areas: coach.service_areas,
    philosophy: coach.philosophy,
    experience: coach.experience,
    base_price: coach.base_price,
    commission_rate: coach.commission_rate,
    approval_status: coach.approval_status,
    available_times: coach.available_times,
  };
}

function formatCoach(coach, coachBookings, coachPlans, availabilityRules, availabilityExceptions, selectedDate, selectedTime) {
  const formalAvailabilityRules = getFormalActiveAvailabilityRules(availabilityRules);
  const activePlans = getFormalActivePlans(coachPlans);
  const saleabilityCoach = {
    approval_status: coach.approval_status,
  };
  const saleability = getCoachSaleability({
    coach: saleabilityCoach,
    plans: activePlans,
    availabilityRules: formalAvailabilityRules,
  });
  const coachWithAvailability = {
    user_id: coach.user_id,
    available_times: null,
    availability_rules: formalAvailabilityRules,
    availability_exceptions: availabilityExceptions,
  };
  const coachLevelValue = normalizeLevel(coach?.users?.level);
  const nextAvailableSlot = saleability.canSell
    ? getNextAvailableSlot(coachWithAvailability, coachBookings, {
        startDate: getTodayDateString(),
        lookaheadDays: 14,
      })
    : null;

  const hasFixedSchedule = formalAvailabilityRules.length > 0;
  const bookingSet = buildBookedSlotSet(coachBookings);
  const slotMatch = saleability.canSell && doesCoachMatchSlot(coachWithAvailability, coachBookings, selectedDate, selectedTime);
  const availableTimeOptions = selectedDate && saleability.canSell
    ? generateSlotsForCoach(coachWithAvailability, bookingSet, {
        startDate: selectedDate,
        lookaheadDays: 1,
      })
        .filter((slot) => !slot.booked)
        .map((slot) => slot.time)
    : [];
  const planOptions = activePlans;
  const prices = planOptions.map((plan) => Number(plan.price || 0)).filter((price) => price > 0);

  return {
    id: coach.users.id,
    user_id: coach.user_id,
    name: coach.users.name,
    avatar_url: coach.users.avatar_url,
    review_count: coach.review_count,
    rating_avg: coach.rating_avg,
    university: coach.university,
    location: coach.location,
    referral_code: coach.referral_code || null,
    service_areas: coach.service_areas,
    base_price: coach.base_price,
    commission_rate: coach.commission_rate,
    has_fixed_schedule: hasFixedSchedule,
    can_book: saleability.canSell,
    saleability_reasons: saleability.reasons,
    uses_legacy_available_times: !hasFixedSchedule && Boolean(coach.available_times),
    plan_count: planOptions.length,
    min_price: prices.length ? Math.min(...prices) : null,
    coach_level: LEVEL_META[coachLevelValue].key,
    coach_level_label: LEVEL_META[coachLevelValue].label,
    coach_level_value: coachLevelValue,
    next_available_at: nextAvailableSlot?.iso || null,
    next_available_date: nextAvailableSlot?.date || null,
    next_available_time: nextAvailableSlot?.time || null,
    available_time_options: availableTimeOptions,
    slot_match: slotMatch,
    booked_slot_count: bookingSet.size,
  };
}

export async function GET(request) {
  try {
    const adminSupabase = getAdminSupabase();
    const { searchParams } = new URL(request.url);

    const selectedDate = searchParams.get('date') || '';
    const selectedTime = searchParams.get('time') || '';
    const region = searchParams.get('region') || '';
    const sport = searchParams.get('sport') || '';
    const category = searchParams.get('category') || '';
    const minPriceValue = Number(searchParams.get('minPrice'));
    const maxPriceValue = Number(searchParams.get('maxPrice'));
    const levelFilter = searchParams.get('level') || '';

    const minPrice = Number.isFinite(minPriceValue) ? minPriceValue : NaN;
    const maxPrice = Number.isFinite(maxPriceValue) ? maxPriceValue : NaN;

    const { data: coaches, error: coachError } = await adminSupabase
      .from('coaches')
      .select(PUBLIC_COACH_LIST_SELECT)
      .eq('approval_status', 'approved');

    if (coachError) {
      throw coachError;
    }

    const coachIds = (coaches || []).map((coach) => coach.user_id);

    const { data: allReviews, error: reviewError } = await adminSupabase
      .from('reviews')
      .select('reviewee_id, rating')
      .in('reviewee_id', coachIds.length ? coachIds : ['00000000-0000-0000-0000-000000000000']);

    if (reviewError) {
      throw reviewError;
    }

    const { data: coachBookings, error: bookingError } = await adminSupabase
      .from('bookings')
      .select('coach_id, expected_time, status, duration_minutes, payment_expires_at')
      .in('coach_id', coachIds.length ? coachIds : ['00000000-0000-0000-0000-000000000000'])
      .in('status', ['pending_payment', 'scheduled', 'in_progress', 'pending_completion', 'completed']);

    if (bookingError) {
      throw bookingError;
    }

    const { data: coachPlans, error: planError } = await adminSupabase
      .from('coach_plans')
      .select(PUBLIC_COACH_PLAN_SELECT)
      .in('coach_id', coachIds.length ? coachIds : ['00000000-0000-0000-0000-000000000000'])
      .eq('is_active', true);

    if (planError) {
      throw planError;
    }

    const { data: availabilityRules, error: rulesError } = await adminSupabase
      .from('coach_availability_rules')
      .select(PUBLIC_AVAILABILITY_RULE_SELECT)
      .in('coach_id', coachIds.length ? coachIds : ['00000000-0000-0000-0000-000000000000'])
      .eq('is_active', true);

    if (rulesError) {
      throw rulesError;
    }

    const startDate = selectedDate || getTodayDateString();
    const endDate = selectedDate || addDays(startDate, 13);
    const { data: availabilityExceptions, error: exceptionsError } = await adminSupabase
      .from('coach_availability_exceptions')
      .select(PUBLIC_AVAILABILITY_EXCEPTION_SELECT)
      .in('coach_id', coachIds.length ? coachIds : ['00000000-0000-0000-0000-000000000000'])
      .gte('exception_date', startDate)
      .lte('exception_date', endDate);

    if (exceptionsError) {
      throw exceptionsError;
    }

    const reviewMap = {};
    for (const review of allReviews || []) {
      if (!reviewMap[review.reviewee_id]) {
        reviewMap[review.reviewee_id] = [];
      }
      reviewMap[review.reviewee_id].push(Number(review.rating || 0));
    }

    const bookingMap = {};
    for (const booking of coachBookings || []) {
      if (!bookingMap[booking.coach_id]) {
        bookingMap[booking.coach_id] = [];
      }
      bookingMap[booking.coach_id].push(booking);
    }

    const planMap = {};
    for (const plan of coachPlans || []) {
      if (!planMap[plan.coach_id]) {
        planMap[plan.coach_id] = [];
      }
      planMap[plan.coach_id].push(plan);
    }

    const availabilityRuleMap = {};
    for (const rule of availabilityRules || []) {
      if (!availabilityRuleMap[rule.coach_id]) {
        availabilityRuleMap[rule.coach_id] = [];
      }
      availabilityRuleMap[rule.coach_id].push(rule);
    }

    const availabilityExceptionMap = {};
    for (const exception of availabilityExceptions || []) {
      if (!availabilityExceptionMap[exception.coach_id]) {
        availabilityExceptionMap[exception.coach_id] = [];
      }
      availabilityExceptionMap[exception.coach_id].push(exception);
    }

    const formatted = (coaches || []).map((coach) => {
      const ratings = reviewMap[coach.user_id] || [];
      const count = ratings.length;
      const sum = ratings.reduce((accumulator, rating) => accumulator + rating, 0);

      return formatCoach(
        buildCoachListModel(coach, {
          reviewCount: count,
          ratingAverage: count ? Number((sum / count).toFixed(1)) : 0,
        }),
        bookingMap[coach.user_id] || [],
        planMap[coach.user_id] || [],
        availabilityRuleMap[coach.user_id] || [],
        availabilityExceptionMap[coach.user_id] || [],
        selectedDate,
        selectedTime
      );
    });

    const filtered = formatted.filter((coach) => {
      if (!matchesRegion(coach, region)) {
        return false;
      }
      
      if (!matchesSport(coach, sport)) {
        return false;
      }

      if (!matchesCategory(coach, category)) {
        return false;
      }

      if (!matchesPriceRange(coach, minPrice, maxPrice)) {
        return false;
      }

      if (!matchesLevel(coach, levelFilter)) {
        return false;
      }

      if (selectedDate && selectedTime) {
        return coach.slot_match;
      }

      return true;
    });

    filtered.sort((left, right) => {
      if (selectedDate && selectedTime && left.slot_match !== right.slot_match) {
        return left.slot_match ? -1 : 1;
      }

      // 1. Earliest available
      if (left.next_available_at && right.next_available_at) {
        const timeCompare = left.next_available_at.localeCompare(right.next_available_at);
        if (timeCompare !== 0) return timeCompare;
      } else if (left.next_available_at) {
        return -1;
      } else if (right.next_available_at) {
        return 1;
      }

      // 2. Most booked
      if ((right.booked_slot_count || 0) !== (left.booked_slot_count || 0)) {
        return (right.booked_slot_count || 0) - (left.booked_slot_count || 0);
      }

      // 3. Highest rating
      if ((right.rating_avg || 0) !== (left.rating_avg || 0)) {
        return (right.rating_avg || 0) - (left.rating_avg || 0);
      }

      // Fallbacks
      if (left.coach_level_value !== right.coach_level_value) {
        return right.coach_level_value - left.coach_level_value;
      }

      return (left.base_price || 0) - (right.base_price || 0);
    });

    const allSportsSet = new Set();
    const TUTOR_KEYWORDS = ['數', '英', '國文', '語', '文', '理化', '自然', '科學', '伴讀', '程式', '碼', '畫', '美術', '琴', '樂', '會考', '學測'];
    
    formatted.forEach((coach) => {
      // 依據 category 決定要不要把這個教練的 service_areas 放進 allSports
      if (!matchesCategory(coach, category)) return;
      
      if (coach.service_areas) {
        const parts = coach.service_areas.split(/[、,，\s]+/);
        parts.forEach((p) => {
          if (p.trim()) allSportsSet.add(p.trim());
        });
      }
    });
    const allSports = Array.from(allSportsSet).sort();

    return NextResponse.json({ coaches: filtered, allSports });
  } catch (error) {
    console.error('Coaches fetch error:', safeErrorDetails(error));
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
