import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

    // Fetch platform settings for tasks and rewards
    const { data: rawSettings } = await adminSupabase.from('platform_settings').select('*');
    const settings = (rawSettings || []).reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    const getConfig = (key, defaultVal, isNum = true) => {
      if (settings[key] === undefined || settings[key] === null || settings[key] === '') return defaultVal;
      return isNum ? Number(settings[key]) : settings[key];
    };

    // Lv1 targets
    const l1_t3_target = getConfig('task_lv1_t3_target', 1);
    const l1_t4_target = getConfig('task_lv1_t4_target', 3);
    const l1_t11_target = getConfig('task_lv1_t11_target', 2);
    const l1_t12_target = getConfig('task_lv1_t12_target', 2);

    // Lv2 targets
    const l2_t1_target = getConfig('task_lv2_t1_target', 2);
    const l2_t2_target = getConfig('task_lv2_t2_target', 2);
    const l2_t3_target = getConfig('task_lv2_t3_target', 2);
    const l2_t4_target = getConfig('task_lv2_t4_target', 3);
    const l2_t5_target = getConfig('task_lv2_t5_target', 3);
    const l2_t6_target = getConfig('task_lv2_t6_target', 3);

    // Lv3 targets
    const l3_t1_target = getConfig('task_lv3_t1_target', 10);
    const l3_t2_target = getConfig('task_lv3_t2_target', 5);
    const l3_t3_target = getConfig('task_lv3_t3_target', 5);
    const l3_t4_target = getConfig('task_lv3_t4_target', 3);
    const l3_t5_target = getConfig('task_lv3_t5_target', 15000);

    // Rewards config
    const rewardConfig = {
      lv2: { type: getConfig('reward_lv2_type', 'amount', false), value: getConfig('reward_lv2_value', 50) },
      lv3: { type: getConfig('reward_lv3_type', 'percent', false), value: getConfig('reward_lv3_value', 20) },
      lv4: { type: getConfig('reward_lv4_type', 'none', false), value: getConfig('reward_lv4_value', 0) }
    };

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
    const task3Progress = Math.min(Math.round(((favoriteCount || 0) / l1_t3_target) * 100), 100);

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
    const task4Progress = Math.min(Math.round((likedCoachesCount / l1_t4_target) * 100), 100);

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
      .gt('coupon_discount', 0);
    const task7Progress = (discountOrderCount || 0) >= 1 ? 100 : 0;

    // 8. 完成第一堂課
    const { count: completedClasses } = await adminSupabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'completed');
    const task8Progress = (completedClasses || 0) >= 1 ? 100 : 0;
    
    // 11. 再預約第二堂課
    const { count: bookedClasses } = await adminSupabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('status', 'in', '("cancelled","refunded","disputed")');
    const task11Progress = Math.min(Math.round(((bookedClasses || 0) / l1_t11_target) * 100), 100);

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

    // 12. 邀請第 2 位朋友完成註冊
    const task12Progress = Math.min(Math.round(((referredCount || 0) / l1_t12_target) * 100), 100);

    let tasks = [];
    let overallProgress = 0;

    if (user.level === 1) {
      tasks = [
        { id: 1, title: '完成個人資料', subtitle: '讓教練知道你的需求', progress: task1Progress, link: '/dashboard/user/edit' },
        { id: 2, title: '觀看 1 支教練影片（≥10秒）', subtitle: '了解教練風格', progress: task2Progress, link: '/explore' },
        { id: 3, title: `收藏 ${l1_t3_target} 位教練`, subtitle: '建立你的比較清單', progress: task3Progress, link: '/explore' },
        { id: 4, title: `幫 ${l1_t4_target} 位不同教練按讚`, subtitle: '幫助教練建立信任', progress: task4Progress, link: '/explore' },
        { id: 5, title: '發送第一則聊天訊息', subtitle: '開始與教練溝通', progress: task5Progress, link: '/chat' },
        { id: 6, title: '邀請第一位朋友註冊', subtitle: '使用推薦功能', progress: task6Progress, link: '/dashboard/user' },
        { id: 7, title: '使用優惠券完成一次預約', subtitle: '學會使用折扣', progress: task7Progress, link: '/explore' },
        { id: 8, title: '完成第一堂課', subtitle: '開始實際學習', progress: task8Progress, link: '/coaches' },
        { id: 9, title: '查看學習紀錄卡', subtitle: '了解你的進步', progress: task9Progress, link: '/bookings' },
        { id: 10, title: '留下第一則評價', subtitle: '幫助其他學員選擇', progress: task10Progress, link: '/bookings' },
        { id: 11, title: `累積預約 ${l1_t11_target} 堂課`, subtitle: '建立持續學習習慣', progress: task11Progress, link: '/coaches' },
        { id: 12, title: `累積邀請 ${l1_t12_target} 位朋友註冊`, subtitle: '擴大你的學習圈', progress: task12Progress, link: '/dashboard/user' }
      ];
      overallProgress = Math.round(tasks.reduce((sum, task) => sum + task.progress, 0) / tasks.length);
    } else if (user.level === 2) {
      const l2t1 = Math.min(Math.round(((completedClasses || 0) / l2_t1_target) * 100), 100);
      const l2t2 = Math.min(Math.round(((reviewCount || 0) / l2_t2_target) * 100), 100);
      const l2t3 = Math.min(Math.round(((reportViewCount || 0) / l2_t3_target) * 100), 100);
      const l2t4 = Math.min(Math.round(((bookedClasses || 0) / l2_t4_target) * 100), 100);
      const l2t5 = Math.min(Math.round(((messageCount || 0) / l2_t5_target) * 100), 100);
      const l2t6 = Math.min(Math.round(((referredCount || 0) / l2_t6_target) * 100), 100);

      tasks = [
        { id: 1, title: `累積完成 ${l2_t1_target} 堂課`, subtitle: '持續精進球技', progress: l2t1, link: '/coaches' },
        { id: 2, title: `累積留下 ${l2_t2_target} 則評價`, subtitle: '幫助教練進步', progress: l2t2, link: '/bookings' },
        { id: 3, title: `查看 ${l2_t3_target} 份學習紀錄`, subtitle: '回顧學習成效', progress: l2t3, link: '/bookings' },
        { id: 4, title: `累積預約 ${l2_t4_target} 堂課`, subtitle: '保持學習動能', progress: l2t4, link: '/coaches' },
        { id: 5, title: `與教練完成 ${l2_t5_target} 則對話`, subtitle: '積極溝通討論', progress: l2t5, link: '/chat' },
        { id: 6, title: `累積邀請 ${l2_t6_target} 位朋友註冊`, subtitle: '分享學習樂趣', progress: l2t6, link: '/dashboard/user' }
      ];
      overallProgress = Math.round(tasks.reduce((sum, task) => sum + task.progress, 0) / tasks.length);
    } else if (user.level === 3) {
      const l3t1 = Math.min(Math.round(((completedClasses || 0) / l3_t1_target) * 100), 100);
      const l3t2 = Math.min(Math.round(((reviewCount || 0) / l3_t2_target) * 100), 100);
      const l3t3 = Math.min(Math.round(((reportViewCount || 0) / l3_t3_target) * 100), 100);
      
      // 計算推薦完課人數
      const { data: referredUsersData } = await adminSupabase.from('users').select('id').eq('referred_by', userId);
      let friendsCompletedClass = 0;
      if (referredUsersData && referredUsersData.length > 0) {
        const referredUserIds = referredUsersData.map(u => u.id);
        const { data: refCompletedBookings } = await adminSupabase.from('bookings').select('user_id').in('user_id', referredUserIds).eq('status', 'completed');
        friendsCompletedClass = new Set((refCompletedBookings || []).map(b => b.user_id)).size;
      }
      const l3t4 = Math.min(Math.round((friendsCompletedClass / l3_t4_target) * 100), 100);

      // 計算累積消費
      const { data: completedBookingsData } = await adminSupabase.from('bookings').select('final_price').eq('user_id', userId).eq('status', 'completed');
      const totalSpent = (completedBookingsData || []).reduce((sum, b) => sum + (b.final_price || 0), 0);
      const l3t5 = Math.min(Math.round((totalSpent / l3_t5_target) * 100), 100);

      tasks = [
        { id: 1, title: `累積完成 ${l3_t1_target} 堂課`, subtitle: '邁向大師之路', progress: l3t1, link: '/coaches' },
        { id: 2, title: `累積留下 ${l3_t2_target} 則評價`, subtitle: '成為社群指標', progress: l3t2, link: '/bookings' },
        { id: 3, title: `查看 ${l3_t3_target} 份學習紀錄`, subtitle: '深度掌握學習成效', progress: l3t3, link: '/bookings' },
        { id: 4, title: `推薦 ${l3_t4_target} 位朋友完課`, subtitle: '(任選一完成) 散播學習熱情', progress: l3t4, link: '/dashboard/user' },
        { id: 5, title: `累積消費滿 NT$${l3_t5_target.toLocaleString()}`, subtitle: '(任選一完成) 頂級會員里程碑', progress: l3t5, link: '/bookings' }
      ];
      
      // 二選一邏輯：取任務 4 與 5 進度的最高值
      const orProgress = Math.max(l3t4, l3t5);
      overallProgress = Math.round((l3t1 + l3t2 + l3t3 + orProgress) / 4);
    } else {
      overallProgress = 100;
    }

    let levelUpMessage = null;
    let newLevel = user.level || 1;

    // 滿級自動升級邏輯
    if (overallProgress === 100) {
      if (newLevel === 1) {
        newLevel = 2;
        const { error: updateError } = await adminSupabase.from('users').update({ level: newLevel }).eq('id', userId);
        if (!updateError) {
          levelUpMessage = '恭喜！您已完成所有新手任務，晉升至等級 2！';
          if (rewardConfig.lv2.type !== 'none') {
            const validUntil = new Date();
            validUntil.setDate(validUntil.getDate() + 30);
            const couponData = { user_id: userId, type: 'level', valid_until: validUntil.toISOString() };
            if (rewardConfig.lv2.type === 'amount') couponData.discount_amount = rewardConfig.lv2.value;
            if (rewardConfig.lv2.type === 'percent') { couponData.discount_percent = rewardConfig.lv2.value; couponData.max_amount = 500; }
            await adminSupabase.from('coupons').insert([couponData]);
          }
        }
      } else if (newLevel === 2) {
        newLevel = 3;
        const { error: updateError } = await adminSupabase.from('users').update({ level: newLevel }).eq('id', userId);
        if (!updateError) {
          levelUpMessage = '太神啦！您已晉升至等級 3！';
          if (rewardConfig.lv3.type !== 'none') {
            const validUntil = new Date();
            validUntil.setDate(validUntil.getDate() + 30);
            const couponData = { user_id: userId, type: 'level', valid_until: validUntil.toISOString() };
            if (rewardConfig.lv3.type === 'amount') couponData.discount_amount = rewardConfig.lv3.value;
            if (rewardConfig.lv3.type === 'percent') { couponData.discount_percent = rewardConfig.lv3.value; couponData.max_amount = 500; }
            await adminSupabase.from('coupons').insert([couponData]);
          }
        }
      } else if (newLevel === 3) {
        newLevel = 4;
        const { error: updateError } = await adminSupabase.from('users').update({ level: newLevel }).eq('id', userId);
        if (!updateError) {
          levelUpMessage = '恭喜破關！您已達到目前最高等級 4！';
          if (rewardConfig.lv4.type !== 'none') {
            const validUntil = new Date();
            validUntil.setDate(validUntil.getDate() + 30);
            const couponData = { user_id: userId, type: 'level', valid_until: validUntil.toISOString() };
            if (rewardConfig.lv4.type === 'amount') couponData.discount_amount = rewardConfig.lv4.value;
            if (rewardConfig.lv4.type === 'percent') { couponData.discount_percent = rewardConfig.lv4.value; couponData.max_amount = 500; }
            await adminSupabase.from('coupons').insert([couponData]);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      overallProgress,
      level: newLevel,
      levelUpMessage,
      tasks,
      rewardConfig
    });

  } catch (error) {
    console.error('[GET TASKS ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
