import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const { id } = params;
  const auth = await requireAuth();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  
  const supabase = getAdminSupabase();

  try {
    const { data: studentInfo, error: studentError } = await supabase
      .from('users')
      .select('id, name, avatar_url, grade, learning_goals, created_at')
      .eq('id', id)
      .single();

    if (studentError && studentError.code !== 'PGRST116') {
      console.error('Error fetching student info:', studentError);
    }

    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('*, coach:coach_id(id, full_name, role), review_scores(score)')
      .eq('student_id', id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Process the review scores
    const processedReviews = reviews.map(r => {
      let avgScore = 0;
      let scoreCount = 0;
      if (r.review_scores && r.review_scores.length > 0) {
        scoreCount = r.review_scores.length;
        const total = r.review_scores.reduce((sum, s) => sum + s.score, 0);
        avgScore = total / scoreCount;
      }
      return {
        ...r,
        coach_name: r.coach?.full_name || '未知教練',
        avg_score: avgScore,
        score_count: scoreCount
      };
    });

    return NextResponse.json({ 
      student: studentInfo || null,
      reviews: processedReviews 
    });
  } catch (err) {
    console.error('Error fetching student portfolio:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
