-- 針對教練動態績效系統的資料庫更新

-- 1. 在預約紀錄中新增「取消原因」欄位，供教練主動取消時填寫，留待後台審核
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

-- 2. 在 users (或 coaches) 中若沒有 level 欄位可選加（目前系統可能已有或由 API 動態覆寫）
-- ALTER TABLE public.coaches ADD COLUMN IF NOT EXISTS level INT DEFAULT 1;
