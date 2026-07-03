export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';
import { getCoachPerformanceByUserId } from '@/lib/coachPerformance';

export async function GET(request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const { searchParams } = new URL(request.url);
    let targetUserId = searchParams.get('userId');

    // If targetUserId is provided, check if requester is admin
    if (targetUserId && targetUserId !== auth.user.id && auth.user.role !== 'admin') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 });
    }

    if (!targetUserId) {
      targetUserId = auth.user.id;
    }

    const adminSupabase = getAdminSupabase();

    // 1. Get User Data
    const { data: user, error } = await adminSupabase
      .from('users')
      .select('id, role, level')
      .eq('id', targetUserId)
      .single();

    if (error) throw error;

    // 2. Fetch Global Tier Settings
    const { data: settings } = await adminSupabase
      .from('platform_settings')
      .select('key, value')
      .in('key', ['user_tier_discounts', 'coach_tier_rates']);
      
    const settingsObj = (settings || []).reduce((acc, curr) => {
      try {
        acc[curr.key] = JSON.parse(curr.value);
      } catch(e) {
        acc[curr.key] = [];
      }
      return acc;
    }, {});

    let result = {
      role: user.role,
      currentLevel: user.level || 1,
      nextLevel: null,
      progress: null, // text description
      progressPercent: 0
    };

    if (user.role === 'coach') {
      const performance = await getCoachPerformanceByUserId(targetUserId, adminSupabase);
      result.currentLevel = performance.currentLevel;
      
      const currentLv = result.currentLevel;
      const nextLv = currentLv + 1;
      const thresholds = performance.thresholds;
      
      let requiredLessons = 0;
      if (nextLv === 2) requiredLessons = thresholds.lv2_lessons;
      else if (nextLv === 3) requiredLessons = thresholds.lv3_lessons;
      else if (nextLv === 4) requiredLessons = thresholds.lv4_lessons;
      
      if (requiredLessons > 0) {
        const currentLessons = performance.metrics.monthly_lessons || 0;
        const remaining = Math.max(0, requiredLessons - currentLessons);
        result.nextLevel = nextLv;
        result.progress = `還差 ${remaining} 堂課升至 Lv${nextLv}`;
        result.progressPercent = Math.min(100, Math.round((currentLessons / requiredLessons) * 100));
        
        // if they met lessons but not rating, add hint
        if (remaining === 0) {
           result.progress = `堂數達標，維持評價即可升級`;
           result.progressPercent = 100;
        }
      } else {
        result.progress = '已達最高等級';
        result.progressPercent = 100;
      }
      
      // Check if temporary manual override exists
      const { data: authData } = await adminSupabase.auth.admin.getUserById(targetUserId);
      if (authData?.user?.user_metadata?.granted_level) {
        const gl = authData.user.user_metadata.granted_level;
        if (new Date(gl.expires_at) > new Date()) {
          result.progress = `管理員強制設定 (至 ${new Date(gl.expires_at).toLocaleDateString()})`;
          result.progressPercent = 100;
        }
      }

    } else {
      // User (Student) Progression
      const userTiers = settingsObj.user_tier_discounts || [];
      const sortedTiers = userTiers.sort((a, b) => a.level - b.level);
      
      const nextTier = sortedTiers.find(t => t.level === (user.level || 1) + 1);
      
      if (nextTier && nextTier.requirement) {
        result.nextLevel = nextTier.level;
        if (nextTier.requirement.completed_sessions) {
          const req = nextTier.requirement.completed_sessions;
          const curr = user.completed_sessions || 0;
          const remaining = Math.max(0, req - curr);
          result.progress = `還差 ${remaining} 堂課可升至 Lv${nextTier.level}`;
          result.progressPercent = Math.min(100, Math.round((curr / req) * 100));
        } else if (nextTier.requirement.spent_points) {
          const req = nextTier.requirement.spent_points;
          const curr = user.spent_points || 0;
          const remaining = Math.max(0, req - curr);
          result.progress = `再消費 ${remaining} 點升級`;
          result.progressPercent = Math.min(100, Math.round((curr / req) * 100));
        }
      } else {
        result.progress = '已達最高等級';
        result.progressPercent = 100;
      }
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('[USER STATS API ERROR]', err);
    return NextResponse.json({ error: '獲取進度失敗' }, { status: 500 });
  }
}
