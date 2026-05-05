import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';

export async function GET(request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const adminSupabase = getAdminSupabase();
    const userId = auth.user.id;

    // Fetch user basic data
    const { data: user } = await adminSupabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // 1. 完成個人資料
    const profileFields = ['phone', 'address', 'gender', 'grade', 'learning_goals', 'avatar_url'];
    const filledFields = profileFields.filter(field => user[field] !== null && user[field] !== '').length;
    const task1Progress = Math.round((filledFields / profileFields.length) * 100);

    // 2. 觀看教練影片 ≥10秒
    const task2Progress = user.video_watched_10s ? 100 : 0;

    // 3. 收藏教練
    const { count: favoriteCount } = await adminSupabase
      .from('favorite_coaches')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    const task3Progress = (favoriteCount || 0) >= 1 ? 100 : 0;

    // 4. 幫 3 位不同教練按讚
    const { data: likes } = await adminSupabase
      .from('video_likes')
      .select('coach_videos(coach_id)')
      .eq('user_id', userId);
    
    let likedCoachesCount = 0;
    if (likes) {
      const coachIds = new Set(likes.map(like => like.coach_videos?.coach_id).filter(Boolean));
      likedCoachesCount = coachIds.size;
    }
    const task4Progress = Math.min(Math.round((likedCoachesCount / 3) * 100), 100);

    // 5. 發送第一則聊天訊息
    const { count: messageCount } = await adminSupabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('sender_id', userId);
    const task5Progress = (messageCount || 0) >= 1 ? 100 : 0;

    // 6. 邀請 1 位朋友註冊
    const { count: referredCount } = await adminSupabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('referred_by', userId);
    const task6Progress = (referredCount || 0) >= 1 ? 100 : 0;

    // 7. 使用優惠完成一次訂單
    const { count: discountOrderCount } = await adminSupabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'completed')
      .gt('coupon_discount', 0); // Assuming coupon_discount > 0 means discount used
    const task7Progress = (discountOrderCount || 0) >= 1 ? 100 : 0;

    // 8. 完成第一堂課
    const { count: completedClasses } = await adminSupabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'completed');
    const task8Progress = (completedClasses || 0) >= 1 ? 100 : 0;
    
    // 11. 再預約第二堂課 (只要有兩筆非取消的預約就算)
    const { count: bookedClasses } = await adminSupabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('status', 'in', '("cancelled","refunded","disputed")');
    const task11Progress = Math.min(Math.round(((bookedClasses || 0) / 2) * 100), 100);

    // 9. 查看並確認第一張學習紀錄卡
    const { count: reportViewCount } = await adminSupabase
      .from('learning_reports')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('student_viewed_at', 'is', null);
    const task9Progress = (reportViewCount || 0) >= 1 ? 100 : 0;

    // 10. 留下第一則評價
    const { count: reviewCount } = await adminSupabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('reviewer_id', userId);
    const task10Progress = (reviewCount || 0) >= 1 ? 100 : 0;

    // 12. 邀請朋友完成第一堂課
    const { count: friendCompleteCount } = await adminSupabase
      .from('reward_logs')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_user_id', userId)
      .eq('reward_type', 'referral_bonus');
    const task12Progress = (friendCompleteCount || 0) >= 1 ? 100 : 0;

    // Compile results
    const tasks = [
      { id: 1, title: '完成個人資料', subtitle: '讓教練知道你的需求', progress: task1Progress, link: '/dashboard/user/edit' },
      { id: 2, title: '觀看 1 支教練影片（≥10秒）', subtitle: '了解教練風格', progress: task2Progress, link: '/explore' },
      { id: 3, title: '收藏 1 位教練', subtitle: '建立你的比較清單', progress: task3Progress, link: '/explore' },
      { id: 4, title: '幫 3 位不同教練按讚', subtitle: '幫助教練建立信任', progress: task4Progress, link: '/explore' },
      { id: 5, title: '發送第一則聊天訊息', subtitle: '開始與教練溝通', progress: task5Progress, link: '/chat' },
      { id: 6, title: '邀請 1 位朋友註冊', subtitle: '使用推薦功能', progress: task6Progress, link: '/dashboard/user' },
      { id: 7, title: '使用優惠券完成一次預約', subtitle: '學會使用折扣', progress: task7Progress, link: '/explore' },
      { id: 8, title: '完成第一堂課', subtitle: '開始實際學習', progress: task8Progress, link: '/coaches' },
      { id: 9, title: '查看學習紀錄卡', subtitle: '了解你的進步', progress: task9Progress, link: '/bookings' },
      { id: 10, title: '留下第一則評價', subtitle: '幫助其他學員選擇', progress: task10Progress, link: '/bookings' },
      { id: 11, title: '再預約第二堂課', subtitle: '建立持續學習習慣', progress: task11Progress, link: '/coaches' },
      { id: 12, title: '邀請朋友完成第一堂課', subtitle: '推薦成功，獲得獎勵', progress: task12Progress, link: '/dashboard/user' }
    ];

    const overallProgress = Math.round(tasks.reduce((sum, task) => sum + task.progress, 0) / tasks.length);

    let levelUpMessage = null;
    let newLevel = user.level || 1;

    // 滿級自動升級邏輯
    if (overallProgress === 100 && newLevel === 1) {
      newLevel = 2;
      
      // 1. 更新使用者等級
      const { error: updateError } = await adminSupabase
        .from('users')
        .update({ level: newLevel })
        .eq('id', userId);
        
      if (!updateError) {
        levelUpMessage = '恭喜！您已完成所有新手任務，晉升至等級 2！';
        
        // 2. 自動發送 $50 折價券
        // 此處實作視資料庫設計而定，若有 coupons 表可在此 insert
        // await adminSupabase.from('coupons').insert([{ user_id: userId, code: 'LV2-BONUS', discount_amount: 50 }]);
      }
    }

    return NextResponse.json({
      success: true,
      overallProgress,
      level: newLevel,
      levelUpMessage,
      tasks
    });

  } catch (error) {
    console.error('[GET TASKS ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
