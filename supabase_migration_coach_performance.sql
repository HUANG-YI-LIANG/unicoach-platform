-- 針對教練動態績效系統的資料庫更新

-- 1. 在預約紀錄中新增「取消原因」欄位，供教練主動取消時填寫，留待後台審核
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

-- 2. 在 coaches 新增「個人抽成減免」欄位，供管理員設定該教練額外的降成比例
ALTER TABLE public.coaches 
ADD COLUMN IF NOT EXISTS commission_discount INT DEFAULT 0;
