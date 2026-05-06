import { getAdminSupabase } from './supabase';

/**
 * 取得教練近 30 天的動態績效、符合的等級與對應的抽成率
 * @param {string} coachId 
 * @param {object} supabaseAdmin 
 */
export async function getCoachPerformance(coachId, supabaseAdmin) {
  const supabase = supabaseAdmin || getAdminSupabase();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoIso = thirtyDaysAgo.toISOString();

  try {
    // 1. 取得全域設定的門檻參數
    const { data: settingsData } = await supabase.from('platform_settings').select('*');
    const settings = (settingsData || []).reduce((acc, curr) => {
      acc[curr.key] = Number(curr.value) || curr.value;
      return acc;
    }, {});

    const thresholds = {
      lv2_lessons: settings.coach_lv2_lessons ?? 2,
      lv3_lessons: settings.coach_lv3_lessons ?? 4,
      lv4_lessons: settings.coach_lv4_lessons ?? 6,
      lv1_commission: settings.coach_lv1_commission ?? 45,
      lv2_commission: settings.coach_lv2_commission ?? 35,
      lv3_commission: settings.coach_lv3_commission ?? 25,
      lv4_commission: settings.coach_lv4_commission ?? 20,
    };

    // 2. 撈取近 30 天 bookings 資料 (包含完課、逾期取消)
    const { data: recentBookings } = await supabase
      .from('bookings')
      .select('id, status, created_at, expected_time')
      .eq('coach_id', coachId)
      .gte('created_at', thirtyDaysAgoIso);

    const monthly_lessons = (recentBookings || []).filter(b => b.status === 'completed').length;
    // 逾期未接單算作惡意取消
    const malicious_cancels = (recentBookings || []).filter(b => b.status === 'expired').length;
    // 完課率 (完課數 / (完課數 + 逾期取消數))
    const totalValidBookings = monthly_lessons + malicious_cancels;
    const completion_rate = totalValidBookings === 0 ? 100 : Math.round((monthly_lessons / totalValidBookings) * 100);

    // 3. 撈取近 30 天評價平均
    const { data: reviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('coach_id', coachId)
      .gte('created_at', thirtyDaysAgoIso);
    
    let average_rating = 0;
    if (reviews && reviews.length > 0) {
      average_rating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    } else {
      // 預設給予滿分，或是維持舊分數？(為避免新教練因無評價被降級，預設給 5)
      average_rating = 5.0; 
    }

    // 4. 撈取回覆速度與回覆率 (粗略估算：撈取教練參與的近 30 天聊天室)
    const { data: chatRooms } = await supabase
      .from('chat_rooms')
      .select('id, created_at')
      .eq('coach_id', coachId)
      .gte('created_at', thirtyDaysAgoIso);
    
    let average_response_time = 0; // 分鐘
    let response_rate = 100;
    
    if (chatRooms && chatRooms.length > 0) {
      const roomIds = chatRooms.map(r => r.id);
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('room_id, sender_id, created_at')
        .in('room_id', roomIds)
        .order('created_at', { ascending: true });
        
      let totalResponseTime = 0;
      let respondedRooms = 0;
      let roomsWithUserMessage = 0;

      if (messages) {
        roomIds.forEach(roomId => {
          const roomMessages = messages.filter(m => m.room_id === roomId);
          const firstUserMsg = roomMessages.find(m => m.sender_id !== coachId);
          if (firstUserMsg) {
            roomsWithUserMessage++;
            // 找第一則教練的回覆
            const firstCoachReply = roomMessages.find(m => m.sender_id === coachId && new Date(m.created_at) > new Date(firstUserMsg.created_at));
            if (firstCoachReply) {
              respondedRooms++;
              const diffMins = (new Date(firstCoachReply.created_at) - new Date(firstUserMsg.created_at)) / 60000;
              totalResponseTime += diffMins;
            }
          }
        });
      }

      if (roomsWithUserMessage > 0) {
        response_rate = Math.round((respondedRooms / roomsWithUserMessage) * 100);
        if (respondedRooms > 0) {
          average_response_time = totalResponseTime / respondedRooms;
        } else {
          average_response_time = 9999; // 極大值代表未回覆
        }
      }
    }

    // 5. 判斷是否上傳自我介紹影片
    const { count: videoCount } = await supabase
      .from('coach_videos')
      .select('id', { count: 'exact', head: true })
      .eq('coach_id', coachId);
    const intro_video_uploaded = (videoCount || 0) > 0;

    // 6. 嚴格判定當前等級
    let currentLevel = 1;
    let currentCommission = thresholds.lv1_commission;

    // 判斷 Lv4
    const isLv4 = 
      monthly_lessons >= thresholds.lv4_lessons &&
      average_rating >= 4.8 &&
      average_response_time <= 15 &&
      completion_rate >= 98 &&
      malicious_cancels === 0; // 忽略推薦任務簡化邏輯

    const isLv3 = 
      monthly_lessons >= thresholds.lv3_lessons &&
      average_rating >= 4.7 &&
      average_response_time <= 60 &&
      completion_rate >= 95 &&
      malicious_cancels === 0 &&
      intro_video_uploaded;

    const isLv2 = 
      monthly_lessons >= thresholds.lv2_lessons &&
      average_rating >= 4.5 &&
      response_rate >= 80 &&
      malicious_cancels === 0;

    if (isLv4) {
      currentLevel = 4;
      currentCommission = thresholds.lv4_commission;
    } else if (isLv3) {
      currentLevel = 3;
      currentCommission = thresholds.lv3_commission;
    } else if (isLv2) {
      currentLevel = 2;
      currentCommission = thresholds.lv2_commission;
    }

    return {
      currentLevel,
      currentCommission,
      metrics: {
        monthly_lessons,
        average_rating: average_rating.toFixed(1),
        response_rate,
        average_response_time: Math.round(average_response_time),
        completion_rate,
        malicious_cancels,
        intro_video_uploaded
      },
      thresholds
    };

  } catch (err) {
    console.error('[Coach Performance Error]', err);
    // 預設回退
    return {
      currentLevel: 1,
      currentCommission: 45,
      metrics: {
        monthly_lessons: 0,
        average_rating: 5.0,
        response_rate: 100,
        average_response_time: 0,
        completion_rate: 100,
        malicious_cancels: 0,
        intro_video_uploaded: false
      },
      thresholds: {}
    };
  }
}
