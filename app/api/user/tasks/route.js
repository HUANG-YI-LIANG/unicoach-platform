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

    // 12. 邀請第 2 位朋友完成註冊
    const task12Progress = (referredCount || 0) >= 2 ? 100 : ((referredCount || 0) === 1 ? 50 : 0);

    let tasks = [];
    let overallProgress = 0;

    if (user.level === 1) {
      tasks = [
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
        { id: 12, title: '邀請第 2 位朋友註冊', subtitle: '擴大你的學習圈', progress: task12Progress, link: '/dashboard/user' }
      ];
      overallProgress = Math.round(tasks.reduce((sum, task) => sum + task.progress, 0) / tasks.length);
    } else if (user.level === 2) {
      const l2t1 = Math.min(Math.round(((completedClasses || 0) / 2) * 100), 100);
      const l2t2 = Math.min(Math.round(((reviewCount || 0) / 2) * 100), 100);
      const l2t3 = Math.min(Math.round(((reportViewCount || 0) / 2) * 100), 100);
      const l2t4 = Math.min(Math.round(((bookedClasses || 0) / 3) * 100), 100);
      const l2t5 = Math.min(Math.round(((messageCount || 0) / 3) * 100), 100);
      const l2t6 = Math.min(Math.round(((referredCount || 0) / 3) * 100), 100);

      tasks = [
        { id: 1, title: '完成 2 堂課', subtitle: '持續精進球技', progress: l2t1, link: '/coaches' },
        { id: 2, title: '留下 2 則評價', subtitle: '幫助教練進步', progress: l2t2, link: '/bookings' },
        { id: 3, title: '查看 2 份學習紀錄', subtitle: '回顧學習成效', progress: l2t3, link: '/bookings' },
        { id: 4, title: '再預約 1 堂課', subtitle: '保持學習動能', progress: l2t4, link: '/coaches' },
        { id: 5, title: '與教練完成 3 則對話', subtitle: '積極溝通討論', progress: l2t5, link: '/chat' },
        { id: 6, title: '邀請 1 位朋友完成註冊', subtitle: '分享學習樂趣', progress: l2t6, link: '/dashboard/user' }
      ];
      overallProgress = Math.round(tasks.reduce((sum, task) => sum + task.progress, 0) / tasks.length);
    } else if (user.level === 3) {
      const l3t1 = Math.min(Math.round(((completedClasses || 0) / 10) * 100), 100);
      const l3t2 = Math.min(Math.round(((reviewCount || 0) / 5) * 100), 100);
      const l3t3 = Math.min(Math.round(((reportViewCount || 0) / 5) * 100), 100);
      
      // 計算推薦完課人數
      const { data: referredUsersData } = await adminSupabase.from('users').select('id').eq('referred_by', userId);
      let friendsCompletedClass = 0;
      if (referredUsersData && referredUsersData.length > 0) {
        const referredUserIds = referredUsersData.map(u => u.id);
        const { data: refCompletedBookings } = await adminSupabase.from('bookings').select('user_id').in('user_id', referredUserIds).eq('status', 'completed');
        friendsCompletedClass = new Set((refCompletedBookings || []).map(b => b.user_id)).size;
      }
      const l3t4 = Math.min(Math.round((friendsCompletedClass / 2) * 100), 100);

      // 計算累積消費
      const { data: completedBookingsData } = await adminSupabase.from('bookings').select('final_price').eq('user_id', userId).eq('status', 'completed');
      const totalSpent = (completedBookingsData || []).reduce((sum, b) => sum + (b.final_price || 0), 0);
      const l3t5 = Math.min(Math.round((totalSpent / 10000) * 100), 100);

      tasks = [
        { id: 1, title: '累積完成 10 堂課', subtitle: '邁向大師之路', progress: l3t1, link: '/coaches' },
        { id: 2, title: '留下 5 則評價', subtitle: '成為社群指標', progress: l3t2, link: '/bookings' },
        { id: 3, title: '查看 5 份學習紀錄', subtitle: '深度掌握學習成效', progress: l3t3, link: '/bookings' },
        { id: 4, title: '推薦 2 位朋友完課', subtitle: '(任選一完成) 散播學習熱情', progress: l3t4, link: '/dashboard/user' },
        { id: 5, title: '累積消費滿 NT$10,000', subtitle: '(任選一完成) 頂級會員里程碑', progress: l3t5, link: '/bookings' }
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
          levelUpMessage = '恭喜！您已完成所有新手任務，晉升至等級 2！獲得 $50 優惠券！';
          
          // 發放 $50 折價券
          const validUntil = new Date();
          validUntil.setDate(validUntil.getDate() + 30);
          await adminSupabase.from('coupons').insert([{ 
            user_id: userId, 
            type: 'level',
            discount_amount: 50,
            valid_until: validUntil.toISOString()
          }]);
        }
      } else if (newLevel === 2) {
        newLevel = 3;
        const { error: updateError } = await adminSupabase.from('users').update({ level: newLevel }).eq('id', userId);
        if (!updateError) {
          levelUpMessage = '太神啦！您已晉升至等級 3！獲得專屬 8 折優惠券！';
          
          // 發放 8 折 (20% off) 優惠券
          const validUntil = new Date();
          validUntil.setDate(validUntil.getDate() + 30);
          await adminSupabase.from('coupons').insert([{ 
            user_id: userId, 
            type: 'level',
            discount_percent: 20, 
            max_amount: 500,
            valid_until: validUntil.toISOString()
          }]);
        }
      } else if (newLevel === 3) {
        newLevel = 4;
        const { error: updateError } = await adminSupabase.from('users').update({ level: newLevel }).eq('id', userId);
        if (!updateError) {
          levelUpMessage = '恭喜破關！您已達到目前最高等級 4！';
        }
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
