import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

export async function POST(request) {
  try {
    const auth = await requireAuth(['user']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const { bookingId, rating, comment } = await request.json();
    const adminSupabase = getAdminSupabase();

    // 1. Verify Booking
    const { data: booking, error: bError } = await adminSupabase
      .from('bookings')
      .select('*')
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
        rating: Math.max(1, Math.min(5, rating)),
        comment
      }]);

    if (rError) throw rError;

    return NextResponse.json({ success: true, message: 'Review submitted successfully' });
  } catch (err) {
    console.error('Submit review error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
