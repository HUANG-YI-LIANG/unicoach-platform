export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';

export async function GET(request) {
  try {
    const auth = await requireAuth(['coach', 'admin']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const adminSupabase = getAdminSupabase();
    const currentUserId = auth.user.id;

    // 1. Get referral commission rate from settings
    const { data: settings } = await adminSupabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'referral_commission_rate')
      .single();
    
    const commissionRate = settings ? Number(settings.value) || 3 : 3;

    // 2. Find all users referred by current user
    const { data: referredUsers, error: refError } = await adminSupabase
      .from('users')
      .select('id, name, email, role, created_at')
      .eq('referred_by', currentUserId);

    if (refError) throw refError;

    if (!referredUsers || referredUsers.length === 0) {
      return NextResponse.json({
        total_earnings: 0,
        commission_rate: commissionRate,
        referrals: []
      });
    }

    const referredUserIds = referredUsers.map(u => u.id);

    // 3. Find completed bookings where coach or student is a referred user
    // We can do this with an OR condition: coach_id IN (...) OR user_id IN (...)
    // However, Supabase doesn't easily support OR with IN array. 
    // We can query all completed bookings, then filter in JS, or do two separate queries.
    // Let's do two separate queries for simplicity.

    const [coachBookingsRes, studentBookingsRes] = await Promise.all([
      adminSupabase
        .from('bookings')
        .select('id, platform_fee, coach_id, user_id, final_price')
        .eq('status', 'completed')
        .in('coach_id', referredUserIds),
      adminSupabase
        .from('bookings')
        .select('id, platform_fee, coach_id, user_id, final_price')
        .eq('status', 'completed')
        .in('user_id', referredUserIds)
    ]);

    // Merge and deduplicate just in case both coach and student are referred by the same person
    const allBookingsMap = new Map();
    if (coachBookingsRes.data) coachBookingsRes.data.forEach(b => allBookingsMap.set(b.id, b));
    if (studentBookingsRes.data) studentBookingsRes.data.forEach(b => allBookingsMap.set(b.id, b));
    
    const allBookings = Array.from(allBookingsMap.values());

    // 4. Calculate earnings per user and total
    let totalEarnings = 0;
    const userEarnings = {};
    
    referredUserIds.forEach(id => {
      userEarnings[id] = { booking_count: 0, total_contribution: 0 };
    });

    allBookings.forEach(b => {
      const commission = Math.floor((b.platform_fee || 0) * (commissionRate / 100));
      totalEarnings += commission;
      
      // Assign contribution to the referred coach
      if (userEarnings[b.coach_id]) {
        userEarnings[b.coach_id].booking_count += 1;
        userEarnings[b.coach_id].total_contribution += commission;
      }
      
      // If student is also referred, but not coach, assign to student
      // If both referred, they both contributed? We already added commission once to total.
      // Let's assign contribution to the student if the coach was not the reason for the commission here.
      // Wait, if BOTH are referred, the referrer gets 2x commission? The prompt says "只要有開單或花錢，推薦都能抽成". 
      // This implies if they refer a coach AND a student, and they match, maybe they get commission from both sides of the platform fee.
      // But standard is just one commission per booking, or two commissions if both parties are referred.
      // Let's keep it simple: 1 commission per booking, attributed to the coach first, then student.
      if (userEarnings[b.user_id] && !userEarnings[b.coach_id]) {
        userEarnings[b.user_id].booking_count += 1;
        userEarnings[b.user_id].total_contribution += commission;
      }
    });

    // 5. Format response
    const referrals = referredUsers.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      created_at: u.created_at,
      booking_count: userEarnings[u.id]?.booking_count || 0,
      total_contribution: userEarnings[u.id]?.total_contribution || 0
    })).sort((a, b) => b.total_contribution - a.total_contribution);

    return NextResponse.json({
      total_earnings: totalEarnings,
      commission_rate: commissionRate,
      referrals
    });

  } catch (err) {
    console.error('[REFERRALS GET ERROR]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
