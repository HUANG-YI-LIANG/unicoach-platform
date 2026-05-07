export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { safeErrorDetails } from '@/lib/safeLogging';

const REVIEW_BOOKING_SELECT = 'id, user_id, coach_id, status';

export async function POST(request) {
  try {
    const auth = await requireAuth(['user']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const { bookingId, rating, comment } = await request.json();
    if (rating === null || rating === undefined || (typeof rating === 'string' && rating.trim() === '')) {
      return NextResponse.json({ error: 'Rating must be a number between 1 and 5' }, { status: 400 });
    }
    const normalizedRating = Number(rating);
    if (!Number.isFinite(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
      return NextResponse.json({ error: 'Rating must be a number between 1 and 5' }, { status: 400 });
    }
    const adminSupabase = getAdminSupabase();

    // 1. Verify Booking
    const { data: booking, error: bError } = await adminSupabase
      .from('bookings')
      .select(REVIEW_BOOKING_SELECT)
      .eq('id', bookingId)
      .single();

    if (bError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.user_id !== auth.user.id) {
      return NextResponse.json({ error: 'Unauthorized to review this booking' }, { status: 403 });
    }

    if (booking.status !== 'completed') {
      return NextResponse.json({ error: 'Can only review completed courses' }, { status: 400 });
    }

    // 2. Uniqueness Check (API Level)
    const { data: existingReview } = await adminSupabase
      .from('reviews')
      .select('id')
      .eq('booking_id', bookingId)
      .single();

    if (existingReview) {
      return NextResponse.json({ error: 'You have already reviewed this course' }, { status: 400 });
    }

    // 3. Insert Review
    const { error: rError } = await adminSupabase
      .from('reviews')
      .insert([{
        booking_id: bookingId,
        reviewer_id: auth.user.id,
        reviewee_id: booking.coach_id,
        rating: normalizedRating,
        comment
      }]);

    if (rError) throw rError;

    return NextResponse.json({ success: true, message: 'Review submitted successfully' });
  } catch (err) {
    console.error('Submit review error:', safeErrorDetails(err));
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
