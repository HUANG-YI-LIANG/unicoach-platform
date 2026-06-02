export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';
import { safeErrorDetails } from '@/lib/safeLogging';

function normalizePositiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

const PUBLIC_SERVICE_DETAIL_SELECT = `
  id,
  category,
  title,
  subject_or_sport,
  intro,
  price,
  trial_price,
  city,
  district,
  lesson_type,
  target_students,
  available_times,
  cover_image,
  intro_video,
  is_active,
  coach_profiles!inner(
    id,
    user_id,
    school,
    department,
    bio,
    verification_status,
    overall_rating,
    completed_lessons,
    users!inner(
      id,
      name,
      avatar_url,
      level
    )
  )
`;

export async function GET(request, { params }) {
  try {
    const adminSupabase = getAdminSupabase();
    const serviceId = params.id;

    if (!serviceId) {
      return NextResponse.json({ error: 'Service ID is required' }, { status: 400 });
    }

    const { data: service, error } = await adminSupabase
      .from('coach_services')
      .select(PUBLIC_SERVICE_DETAIL_SELECT)
      .eq('id', serviceId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Not found
        return NextResponse.json({ error: 'Service not found' }, { status: 404 });
      }
      throw error;
    }

    if (!service.is_active || service.coach_profiles.verification_status !== 'approved') {
      return NextResponse.json({ error: 'Service is not active or coach is not approved' }, { status: 403 });
    }

    const reviewCount = normalizePositiveNumber(service.coach_profiles.review_count) || 0;
    const rating = reviewCount > 0 ? normalizePositiveNumber(service.coach_profiles.overall_rating) : null;
    const completedLessons = normalizePositiveNumber(service.coach_profiles.completed_lessons);

    const formatted = {
      id: service.id,
      category: service.category,
      title: service.title,
      subject_or_sport: service.subject_or_sport,
      intro: service.intro,
      price: service.price,
      trial_price: service.trial_price,
      city: service.city,
      district: service.district,
      lesson_type: service.lesson_type,
      target_students: service.target_students,
      available_times: service.available_times,
      cover_image: service.cover_image,
      intro_video: service.intro_video,
      coach: {
        id: service.coach_profiles.user_id || service.coach_profiles.users.id, // For booking/chat fallback
        profile_id: service.coach_profiles.id,
        user_id: service.coach_profiles.user_id || service.coach_profiles.users.id, // For chat
        name: service.coach_profiles.users.name,
        avatar_url: service.coach_profiles.users.avatar_url,
        school: service.coach_profiles.school,
        department: service.coach_profiles.department,
        bio: service.coach_profiles.bio,
        verification_status: service.coach_profiles.verification_status,
        review_count: reviewCount,
        overall_rating: rating,
        completed_lessons: completedLessons,
      }
    };

    return NextResponse.json({ service: formatted });
  } catch (error) {
    console.error('Service detail fetch error:', safeErrorDetails(error));
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
