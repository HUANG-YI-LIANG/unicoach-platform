import { safeErrorDetails } from './safeLogging.js';

const COACH_FAULT_PARTIES = new Set(['coach_fault', 'coach_pending_review']);

export function isCoachFaultCancellation(booking) {
  return booking?.status === 'cancelled' && COACH_FAULT_PARTIES.has(booking?.cancel_fault_party);
}

export function calculateCoachPerformance(bookings = []) {
  const safeBookings = Array.isArray(bookings) ? bookings : [];
  const completed = safeBookings.filter((booking) => booking?.status === 'completed').length;
  const cancelled = safeBookings.filter((booking) => booking?.status === 'cancelled').length;
  const maliciousCancels = safeBookings.filter(isCoachFaultCancellation).length;
  const totalFinished = completed + cancelled;

  return {
    total_bookings: safeBookings.length,
    completed_bookings: completed,
    cancelled_bookings: cancelled,
    malicious_cancels: maliciousCancels,
    completion_rate: totalFinished > 0 ? completed / totalFinished : 0,
  };
}

export { COACH_FAULT_PARTIES };

async function getDefaultAdminSupabase() {
  const { getAdminSupabase } = await import('./supabase.js');
  return getAdminSupabase();
}




/**
 * 取得教練近 30 天的動態績效、符合的等級與對應的抽成率
 * @param {string} userId (即 users.id，對應到 coaches.user_id)
 * @param {object} supabaseAdmin 
 */
export async function getCoachPerformanceByUserId(userId, supabaseAdmin) {
  const supabase = supabaseAdmin || await getDefaultAdminSupabase();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoIso = thirtyDaysAgo.toISOString();

  try {
    // 1. 取得全域設定的門檻參數
    const { data: settingsData } = await supabase.from('platform_settings').select('key, value');
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
      .select('id, status, created_at, expected_time, cancel_fault_party')
      .eq('coach_id', userId)
      .gte('created_at', thirtyDaysAgoIso);

    const monthly_lessons = (recentBookings || []).filter(b => b.status === 'completed').length;
    // 逾期未接單算作惡意取消
    const malicious_cancels = (recentBookings || []).filter(isCoachFaultCancellation).length;
    // 完課率 (完課數 / (完課數 + 逾期取消數))
    const totalValidBookings = monthly_lessons + malicious_cancels;
    const completion_rate = totalValidBookings === 0 ? 100 : Math.round((monthly_lessons / totalValidBookings) * 100);

    // 3. 撈取近 30 天評價平均
    const { data: reviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('coach_id', userId)
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
      .eq('coach_id', userId)
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
          const firstUserMsg = roomMessages.find(m => m.sender_id !== userId);
          if (firstUserMsg) {
            roomsWithUserMessage++;
            // 找第一則教練的回覆
            const firstCoachReply = roomMessages.find(m => m.sender_id === userId && new Date(m.created_at) > new Date(firstUserMsg.created_at));
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
      .eq('coach_id', userId);
    const intro_video_uploaded = (videoCount || 0) > 0;

    // Fetch coach personal discount with error handling in case the column doesn't exist yet
    let personalDiscount = 0;
    try {
      const { data: coachData, error: coachError } = await supabase.from('coaches').select('commission_discount').eq('user_id', userId).maybeSingle();
      if (!coachError && coachData) {
        personalDiscount = coachData.commission_discount || 0;
      }
    } catch (e) {
      console.warn('[Coach Performance] Missing commission_discount column', safeErrorDetails(e));
    }

    let baseCommission = thresholds.lv1_commission;
    let currentLevel = 1;
    let currentCommission = thresholds.lv1_commission;

    // 判斷 Lv4
    const isLv4 = 
      monthly_lessons >= thresholds.lv4_lessons &&
      average_rating >= 4.8 &&
      average_response_time <= 15 &&
      completion_rate >= 98 &&
      malicious_cancels === 0;

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
      baseCommission = thresholds.lv4_commission;
    } else if (isLv3) {
      currentLevel = 3;
      baseCommission = thresholds.lv3_commission;
    } else if (isLv2) {
      currentLevel = 2;
      baseCommission = thresholds.lv2_commission;
    }

    currentCommission = Math.max(0, baseCommission - personalDiscount);

    return {
      currentLevel,
      currentCommission,
      baseCommission,
      personalDiscount,
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
    console.error('[Coach Performance Error]', safeErrorDetails(err));
    // 預設回退
    return {
      currentLevel: 1,
      currentCommission: 45,
      baseCommission: 45,
      personalDiscount: 0,
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
