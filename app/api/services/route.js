export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';
import { safeErrorDetails } from '@/lib/safeLogging';

const INCOMPLETE_PUBLIC_TEXT = new Set(['', '未填寫', '尚未填寫', '未命名課程']);

function hasPublicText(value) {
  const text = String(value || '').trim();
  return Boolean(text) && !INCOMPLETE_PUBLIC_TEXT.has(text) && !text.includes('未填寫');
}

function normalizePositiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function formatOneDecimalRating(value) {
  const rating = normalizePositiveNumber(value);
  return rating ? Number(rating.toFixed(1)) : null;
}

const PUBLIC_SERVICE_LIST_SELECT = `
  id,
  category,
  title,
  subject_or_sport,
  intro,
  price,
  city,
  district,
  lesson_type,
  target_students,
  available_times,
  cover_image,
  intro_video,
  coach_profiles!inner(
    id,
    user_id,
    school,
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

export async function GET(request) {
  try {
    const adminSupabase = getAdminSupabase();
    const { searchParams } = new URL(request.url);

    const region = searchParams.get('region') || '';
    const category = searchParams.get('category') || '';
    const minPriceValue = Number(searchParams.get('minPrice'));
    const maxPriceValue = Number(searchParams.get('maxPrice'));
    const query = searchParams.get('q') || ''; // General search term

    let dbQuery = adminSupabase
      .from('coach_services')
      .select(PUBLIC_SERVICE_LIST_SELECT)
      .eq('is_active', true)
      .eq('coach_profiles.verification_status', 'approved');

    if (category) {
      dbQuery = dbQuery.eq('category', category);
    }

    const { data: services, error } = await dbQuery;

    if (error) {
      throw error;
    }

    // Client-side filtering for complex text matches (similar to old logic)
    const filteredServices = (services || []).filter((service) => {
      // Filter out services where the profile wasn't approved (Supabase inner join handles this, but just to be safe)
      if (!service.coach_profiles || service.coach_profiles.verification_status !== 'approved') return false;

      if (!hasPublicText(service.title)) return false;
      if (!hasPublicText(service.intro)) return false;
      if (!hasPublicText(service.subject_or_sport)) return false;
      if (!hasPublicText(service.city)) return false;
      if (!hasPublicText(service.coach_profiles?.users?.name)) return false;

      // Region match
      if (region) {
        const regionText = [service.city, service.district, service.coach_profiles.school].filter(Boolean).join(' ').toLowerCase();
        if (!regionText.includes(region.toLowerCase())) return false;
      }

      // Keyword match (sport/subject)
      if (query) {
        const text = [
          service.title,
          service.subject_or_sport,
          service.intro,
          service.coach_profiles.school
        ].filter(Boolean).join(' ').toLowerCase();
        if (!text.includes(query.toLowerCase())) return false;
      }

      // Price match
      if (Number.isFinite(maxPriceValue) && maxPriceValue > 0) {
        if (service.price > maxPriceValue) return false;
      }
      if (Number.isFinite(minPriceValue) && minPriceValue > 0) {
        if (service.price < minPriceValue) return false;
      }

      return true;
    });

    // Formatting for frontend
    const formatted = filteredServices.map((service) => {
      const reviewCount = normalizePositiveNumber(service.coach_profiles.review_count) || 0;
      const rating = reviewCount > 0 ? formatOneDecimalRating(service.coach_profiles.overall_rating) : null;
      const completedLessons = normalizePositiveNumber(service.coach_profiles.completed_lessons);

      return ({
      id: service.id,
      category: service.category,
      title: service.title,
      subject_or_sport: service.subject_or_sport,
      intro: service.intro,
      price: service.price,
      city: service.city,
      district: service.district,
      lesson_type: service.lesson_type,
      target_students: service.target_students,
      available_times: service.available_times,
      cover_image: service.cover_image,
      intro_video: service.intro_video,
      coach: {
        id: service.coach_profiles.user_id || service.coach_profiles.users.id,
        profile_id: service.coach_profiles.id,
        user_id: service.coach_profiles.user_id || service.coach_profiles.users.id,
        name: service.coach_profiles.users.name,
        avatar_url: service.coach_profiles.users.avatar_url,
        school: service.coach_profiles.school,
        review_count: reviewCount,
        overall_rating: rating,
        completed_lessons: completedLessons,
      }
    });
    });

    // Pagination
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    const paginatedServices = formatted.slice(offset, offset + limit);

    return NextResponse.json({ 
      services: paginatedServices,
      total: formatted.length,
      hasMore: offset + limit < formatted.length,
      page,
      limit
    });
  } catch (error) {
    console.error('Error fetching services:', safeErrorDetails(error));
    return NextResponse.json(
      { error: 'Failed to fetch services', details: error.message },
      { status: 500 }
    );
  }
}
