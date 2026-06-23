import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';
import { safeErrorDetails } from '@/lib/safeLogging';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const auth = await requireAuth();
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (auth.user.role !== 'coach' && auth.user.role !== 'admin') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    const supabase = getAdminSupabase();

    // Query users who are 'user' (students)
    const { data: students, error, count } = await supabase
      .from('users')
      .select('id, name, avatar_url, grade, learning_goals, created_at', { count: 'exact' })
      .eq('role', 'user')
      .not('learning_goals', 'is', null) // Filter out complete ghosts
      .neq('learning_goals', '')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    // We can also fetch their average review scores
    let reviewsMap = {};
    if (students.length > 0) {
      const studentIds = students.map(s => s.id);
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('student_id, review_scores(score)')
        .in('student_id', studentIds);

      if (reviewsData) {
        reviewsData.forEach(r => {
          if (!reviewsMap[r.student_id]) {
            reviewsMap[r.student_id] = { totalScore: 0, count: 0 };
          }
          if (r.review_scores && r.review_scores.length > 0) {
            r.review_scores.forEach(rs => {
              reviewsMap[r.student_id].totalScore += rs.score;
              reviewsMap[r.student_id].count += 1;
            });
          }
        });
      }
    }

    const formattedStudents = students.map(s => {
      const rStats = reviewsMap[s.id];
      const avgScore = rStats && rStats.count > 0 ? (rStats.totalScore / rStats.count).toFixed(1) : null;
      
      return {
        ...s,
        avg_score: avgScore,
        review_count: rStats ? rStats.count : 0
      };
    });

    return NextResponse.json({ 
      students: formattedStudents,
      total: count,
      hasMore: offset + limit < count,
      page,
      limit
    });

  } catch (error) {
    console.error('Error fetching students:', safeErrorDetails(error));
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
