import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const adminSupabase = getAdminSupabase();
    
    const { data: coach, error } = await adminSupabase
      .from('coaches')
      .select('*, users!inner(name, email, phone, id, avatar_url)')
      .eq('user_id', id)
      .single();
      
    if (error || !coach) return NextResponse.json({ error: 'Coach not found' }, { status: 404 });

    const { data: reviews } = await adminSupabase
      .from('reviews')
      .select('*, users!reviews_reviewer_id_fkey(name)')
      .eq('reviewee_id', id);

    const { data: videos } = await adminSupabase
      .from('coach_videos')
      .select('*')
      .eq('coach_id', id)
      .order('created_at', { ascending: false });

    // Format for MVP
    const formattedCoach = {
      id: coach.users.id,
      name: coach.users.name,
      ...coach,
      users: undefined
    };

    const formattedReviews = reviews ? reviews.map(r => ({
      ...r,
      reviewer_name: r.users?.name || 'User'
    })) : [];

    return NextResponse.json({ coach: formattedCoach, reviews: formattedReviews, videos: videos || [] });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
