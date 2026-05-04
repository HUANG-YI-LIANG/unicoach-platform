import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';
import { getNextAvailableSlot } from '@/lib/coachAvailability';
import {
  getCoachSaleability,
  getFormalActiveAvailabilityRules,
  getFormalActivePlans,
} from '@/lib/salableCoachRules';

const LEVEL_META = {
  1: { key: 'beginner', label: '初階教練' },
  2: { key: 'advanced', label: '進階教練' },
  3: { key: 'professional', label: '專業教練' },
};

function normalizeLevel(levelValue) {
  const numeric = Number(levelValue);
  return LEVEL_META[numeric] ? numeric : 1;
}

export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    const adminSupabase = getAdminSupabase();

    const { data: coach, error } = await adminSupabase
      .from('coaches')
      .select('*, users!inner(name, email, phone, id, avatar_url, level)')
      .eq('user_id', id)
      .single();

    if (error || !coach) {
      return NextResponse.json({ error: 'Coach not found' }, { status: 404 });
    }

    const { data: reviews } = await adminSupabase
      .from('reviews')
      .select('*, users!reviews_reviewer_id_fkey(name)')
      .eq('reviewee_id', id)
      .order('created_at', { ascending: false });

    const { data: videos } = await adminSupabase
      .from('coach_videos')
      .select('*')
      .eq('coach_id', id)
      .order('created_at', { ascending: false });

    const { data: bookings } = await adminSupabase
      .from('bookings')
      .select('id, expected_time, status, duration_minutes, payment_expires_at')
      .eq('coach_id', id)
      .in('status', ['pending_payment', 'scheduled', 'in_progress', 'pending_completion', 'completed']);

    const [{ data: availabilityRules, error: rulesError }, { data: availabilityExceptions, error: exceptionsError }] = await Promise.all([
      adminSupabase
        .from('coach_availability_rules')
        .select('*')
        .eq('coach_id', id)
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('weekday', { ascending: true })
        .order('start_time', { ascending: true }),
      adminSupabase
        .from('coach_availability_exceptions')
        .select('*')
        .eq('coach_id', id)
        .gte('exception_date', new Date().toISOString().slice(0, 10)),
    ]);

    if (rulesError) throw rulesError;
    if (exceptionsError) throw exceptionsError;

    const ratingList = (reviews || []).map((review) => Number(review.rating || 0));
    const reviewCount = ratingList.length;
    const ratingAvg = reviewCount
      ? Number((ratingList.reduce((sum, rating) => sum + rating, 0) / reviewCount).toFixed(1))
      : 0;

    const { data: coachPlans, error: planError } = await adminSupabase
      .from('coach_plans')
      .select('*')
      .eq('coach_id', id)
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('duration_minutes', { ascending: true });

    if (planError) {
      throw planError;
    }

    const activePlans = getFormalActivePlans(coachPlans || []);
    const formalAvailabilityRules = getFormalActiveAvailabilityRules(availabilityRules || []);
    const saleability = getCoachSaleability({
      coach,
      plans: activePlans,
      availabilityRules: formalAvailabilityRules,
    });
    const coachLevelValue = normalizeLevel(coach.users.level);
    const planOptions = activePlans;
    const coachWithFormalAvailability = {
      ...coach,
      availability_rules: formalAvailabilityRules,
      availability_exceptions: availabilityExceptions || [],
      available_times: null,
    };
    const nextAvailableSlot = saleability.canSell ? getNextAvailableSlot(coachWithFormalAvailability, bookings || []) : null;

    const formattedCoach = {
      id: coach.users.id,
      user_id: coach.user_id,
      name: coach.users.name,
      email: coach.users.email,
      phone: coach.users.phone,
      avatar_url: coach.users.avatar_url,
      rating_avg: ratingAvg,
      review_count: reviewCount,
      coach_level: LEVEL_META[coachLevelValue].key,
      coach_level_label: LEVEL_META[coachLevelValue].label,
      coach_level_value: coachLevelValue,
      availability_rules: formalAvailabilityRules,
      availability_exceptions: availabilityExceptions || [],
      has_fixed_schedule: formalAvailabilityRules.length > 0,
      can_book: saleability.canSell,
      saleability_reasons: saleability.reasons,
      uses_legacy_available_times: !formalAvailabilityRules.length && Boolean(coach.available_times),
      next_available_at: nextAvailableSlot?.iso || null,
      plan_options: planOptions,
      plan_count: planOptions.length,
      min_price: planOptions.length ? Math.min(...planOptions.map((plan) => plan.price)) : null,
      ...coach,
      users: undefined,
    };

    const formattedReviews = (reviews || []).map((review) => ({
      ...review,
      reviewer_name: review.users?.name || 'User',
    }));

    return NextResponse.json({
      coach: formattedCoach,
      reviews: formattedReviews,
      videos: videos || [],
      bookings: bookings || [],
    });
  } catch (error) {
    console.error('Coach detail fetch error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
