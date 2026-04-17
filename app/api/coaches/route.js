import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET() {
  try {
    const { data: coaches, error: coachError } = await supabaseAdmin
      .from('coaches')
      .select('*, users!inner(id, name, email, phone, avatar_url)')
      .eq('approval_status', 'approved'); // ✅ 僅顯示已核准的教練
      
    if (coachError) throw coachError;

    // Fetch review ratings separately as there's no direct FK from coaches to reviews
    const { data: allReviews, error: reviewError } = await supabaseAdmin
      .from('reviews')
      .select('reviewee_id, rating');

    if (reviewError) throw reviewError;

    const reviewMap = {};
    if (allReviews) {
      allReviews.forEach(r => {
        if (!reviewMap[r.reviewee_id]) reviewMap[r.reviewee_id] = [];
        reviewMap[r.reviewee_id].push(r.rating);
      });
    }
    
    // Formatting to flat JSON expected by frontend MVP
    const formatted = coaches.map(c => {
      const coachId = c.users.id;
      const reviewList = reviewMap[coachId] || [];
      const count = reviewList.length;
      const sum = reviewList.reduce((acc, r) => acc + r, 0);
      const avg = count > 0 ? (sum / count).toFixed(1) : 0;

      return {
        id: coachId,
        name: c.users.name,
        email: c.users.email,
        phone: c.users.phone,
        ...c,
        users: undefined,
        rating_avg: avg,
        review_count: count
      };
    });
    
    return NextResponse.json({ coaches: formatted });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
