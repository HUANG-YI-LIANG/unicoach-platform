import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';

// 規則 4：24小時後定期掃描並解鎖推薦獎勵 (釋放至使用者錢包或做其他紀錄)
// 這是設計給 Cron Job (如 Vercel Cron) 呼叫的 API
export async function GET(request) {
  try {
    // 簡單的安全機制，如果是從 Vercel Cron 呼叫會有特定的 Header
    // 這裡我們暫時只依賴內部呼叫或帶有秘密 token (可後續補上 auth_token 檢查)
    const adminSupabase = getAdminSupabase();

    const now = new Date().toISOString();

    // 尋找所有已經超過 release_time 且狀態為 pending 的 reward_logs
    const { data: pendingLogs, error } = await adminSupabase
      .from('reward_logs')
      .select('*')
      .eq('status', 'pending')
      .lte('release_time', now)
      .limit(100); // 一次處理 100 筆

    if (error) throw error;
    if (!pendingLogs || pendingLogs.length === 0) {
      return NextResponse.json({ success: true, message: '沒有需要解鎖的獎勵', processedCount: 0 });
    }

    let processedCount = 0;
    
    // 逐筆發放獎勵
    for (const log of pendingLogs) {
      // 1. 更新 reward_logs 狀態為 released
      const { error: updateError } = await adminSupabase
        .from('reward_logs')
        .update({ 
          status: 'released', 
          released_at: new Date().toISOString() 
        })
        .eq('id', log.id);

      if (updateError) {
        console.error(`[CRON ERROR] Failed to update reward_log ${log.id}`, updateError);
        continue;
      }

      // 2. 將獎勵金額加到推薦人的錢包 (wallet_balance) 
      //    (根據您的商業邏輯，您可能有 wallet_transactions 表，我們這邊實作最基本的 update balance)
      
      // 讀取當前餘額
      const { data: user } = await adminSupabase
        .from('users')
        .select('wallet_balance')
        .eq('id', log.referrer_user_id)
        .single();
        
      if (user) {
        const newBalance = (user.wallet_balance || 0) + log.reward_amount;
        await adminSupabase.from('users').update({ wallet_balance: newBalance }).eq('id', log.referrer_user_id);
        
        // 記錄 wallet_transactions
        await adminSupabase.from('wallet_transactions').insert([{
          user_id: log.referrer_user_id,
          amount: log.reward_amount,
          transaction_type: 'referral_bonus',
          reference_id: log.order_id,
          description: `推薦獎勵解鎖 (被推薦人完成首堂課)`
        }]);
      }
      processedCount++;
    }

    return NextResponse.json({ success: true, processedCount });

  } catch (error) {
    console.error('[CRON ERROR] Failed to release rewards:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
