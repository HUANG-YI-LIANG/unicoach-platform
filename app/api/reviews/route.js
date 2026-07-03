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

    const { bookingId, comment, timeScore, teachingScore, attitudeScore, rating: fallbackRating } = await request.json();
    
    // Calculate final rating. If the new UI isn't used, fallback to the old rating.
    let finalRating = Number(fallbackRating);
    let tScore = null;
    let tcScore = null;
    let aScore = null;

    if (timeScore && teachingScore && attitudeScore) {
      tScore = Number(timeScore);
      tcScore = Number(teachingScore);
      aScore = Number(attitudeScore);
      finalRating = (tScore + tcScore + aScore) / 3;
    }

    if (!Number.isFinite(finalRating) || finalRating < 1 || finalRating > 5) {
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
        rating: finalRating,
        time_score: tScore,
        teaching_score: tcScore,
        attitude_score: aScore,
        comment
      }]);

    if (rError) throw rError;

    // 4. Update Coach Warnings logic
    const { data: coachUser, error: coachError } = await adminSupabase
      .from('users')
      .select('warnings_count, consecutive_excellent_ratings')
      .eq('id', booking.coach_id)
      .single();

    if (!coachError && coachUser) {
      let newConsecutive = coachUser.consecutive_excellent_ratings || 0;
      let newWarnings = coachUser.warnings_count || 0;

      if (finalRating >= 4.8) {
        newConsecutive += 1;
        if (newConsecutive >= 3 && newWarnings > 0) {
          newWarnings -= 1;
          newConsecutive = 0; // Reset after redemption
        }
      } else {
        newConsecutive = 0; // Reset if below 4.8
      }

      if (newConsecutive !== coachUser.consecutive_excellent_ratings || newWarnings !== coachUser.warnings_count) {
        await adminSupabase
          .from('users')
          .update({
            warnings_count: newWarnings,
            consecutive_excellent_ratings: newConsecutive
          })
          .eq('id', booking.coach_id);
      }
    }

    return NextResponse.json({ success: true, message: 'Review submitted successfully' });
  } catch (err) {
    console.error('Submit review error:', safeErrorDetails(err));
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
