export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';

/**
 * GET: 管理員取得所有教練列表及其審核狀態
 */
export async function GET(request) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const adminSupabase = getAdminSupabase();
    const { data: rawCoaches, error } = await adminSupabase
      .from('coaches')
      .select(`
        *,
        user:users(
          id, name, email, avatar_url, created_at, wallet_balance,
          reviews:reviews!reviews_reviewee_id_fkey(rating, comment, created_at, reviewer:users!reviews_reviewer_id_fkey(name, avatar_url)),
          bookings:bookings!bookings_coach_id_fkey(expected_time, status),
          wallet_transactions(amount, transaction_type, created_at)
        )
      `);

    if (error) throw error;

    // Fetch user metadata for pending coaches to check pioneer invite status
    const pendingCoachIds = rawCoaches.filter(c => c.approval_status === 'pending').map(c => c.user_id);
    const pioneerApplicants = new Set();
    
    // We fetch one by one since there is no bulk getUserById in Supabase JS, and pending list is usually small
    for (const pid of pendingCoachIds) {
      try {
        const { data: authUser } = await adminSupabase.auth.admin.getUserById(pid);
        if (authUser?.user?.user_metadata?.applied_as_pioneer) {
          pioneerApplicants.add(pid);
        }
      } catch (e) {
        console.warn('Failed to fetch auth user for pioneer check', e);
      }
    }

    const coaches = rawCoaches.map(c => {
      const allRatings = c.user?.reviews?.map(r => r.rating) || [];
      const avgRating = allRatings.length > 0 
        ? (allRatings.reduce((a, b) => a + b, 0) / allRatings.length).toFixed(1)
        : null;

      const completedBookings = (c.user?.bookings || [])
        .filter(b => b.status === 'completed' && b.expected_time)
        .map(b => new Date(b.expected_time));
      
      const latestClassTime = completedBookings.length > 0 
        ? new Date(Math.max.apply(null, completedBookings)).toISOString()
        : null;

      const recentReviews = (c.user?.reviews || [])
        .filter(r => r.comment && r.comment.trim() !== '')
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 3); // Get latest 3 reviews with comments

      const txs = c.user?.wallet_transactions || [];
      const totalDeposit = txs
        .filter(t => t.transaction_type === 'deposit' || t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0);

      const totalWithdrawal = txs
        .filter(t => t.transaction_type === 'withdrawal' || t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      const totalClassesAmount = txs
        .filter(t => t.transaction_type === 'class_payment' || t.transaction_type === 'coach_payout')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      // Remove the raw massive arrays to save bandwidth
      if (c.user) {
        delete c.user.reviews;
        delete c.user.bookings;
        delete c.user.wallet_transactions;
      }
      
      return {
        ...c,
        recent_reviews: recentReviews,
        average_rating: avgRating,
        latest_class_time: latestClassTime,
        review_count: allRatings.length,
        wallet_balance: c.user?.wallet_balance || 0,
        total_deposit: totalDeposit,
        total_withdrawal: totalWithdrawal,
        total_classes_amount: totalClassesAmount,
        last_login_ip: '2001:b011:7007::', // Mock IP as before
        created_at: c.user?.created_at,
        applied_as_pioneer: pioneerApplicants.has(c.user_id),
      };
    });

    return NextResponse.json({ coaches });
  } catch (err) {
    console.error('[ADMIN COACH LIST ERROR]', err);
    return NextResponse.json({ error: '無法獲取教練列表' }, { status: 500 });
  }
}
