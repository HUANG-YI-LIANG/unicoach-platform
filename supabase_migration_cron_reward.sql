-- supabase_migration_cron_reward.sql
-- Purpose:
-- 1) Create RPC for atomically releasing referral rewards to prevent race conditions.

CREATE OR REPLACE FUNCTION public.release_referral_reward(p_log_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_user_id UUID;
  v_reward_amount INTEGER;
  v_order_id TEXT;
BEGIN
  -- 1. 嘗試以樂觀鎖更新獎勵狀態 (只有 pending 才能更新)
  UPDATE public.reward_logs
  SET status = 'released', released_at = now()
  WHERE id = p_log_id AND status = 'pending'
  RETURNING referrer_user_id, reward_amount, order_id INTO v_referrer_user_id, v_reward_amount, v_order_id;

  -- 2. 如果沒有更新到任何行，代表已經被處理過或不存在
  IF v_referrer_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 3. 原子化更新錢包餘額
  UPDATE public.users
  SET wallet_balance = COALESCE(wallet_balance, 0) + v_reward_amount
  WHERE id = v_referrer_user_id;

  -- 4. 記錄交易明細
  INSERT INTO public.wallet_transactions (
    user_id, amount, transaction_type, reference_id, description
  ) VALUES (
    v_referrer_user_id, v_reward_amount, 'referral_bonus', v_order_id, '推薦獎勵解鎖 (被推薦人完成首堂課)'
  );

  RETURN TRUE;
END;
$$;

NOTIFY pgrst, 'reload schema';
