import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  const { id } = params; // review_id
  const auth = await requireAuth();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const supabase = getAdminSupabase();

  try {
    const { score } = await request.json();

    if (!score || score < 1 || score > 5) {
      return NextResponse.json({ error: 'Invalid score. Must be between 1 and 5.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('review_scores')
      .upsert(
        { review_id: id, evaluator_id: auth.user.id, score },
        { onConflict: 'review_id, evaluator_id' }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, score: data });
  } catch (err) {
    console.error('Error submitting review score:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
