# Coach Plans Data Cleanup Plan

> 目標：補齊正式可售教練需要的資料，但本階段不直接改 DB。

## 背景

上一輪已經把正式可售規則改成保守模式：

- 教練必須 `approval_status = approved`。
- 教練必須有正式存在於 `coach_plans` 的 active 方案。
- 教練必須有正式存在於 `coach_availability_rules` 的 active 固定時段。
- `default-*` synthetic plan、`base_price` fallback、legacy `available_times` 都不可再當作正式可售資料。

因此，若 live DB 沒有 active `coach_plans`，前台可以顯示教練資料，但不應讓使用者直接下單預約。

## 不直接改 DB

本文件只定義資料補齊流程、人工確認門檻與驗收方式。這一階段不會由助理直接寫入 production DB，也不會要求你把 service role key、connection string 或任何 secret 貼到對話中。

建議流程是：

1. 在 Supabase SQL Editor 執行唯讀檢查 SQL。
2. 對每位缺資料教練做人工確認。
3. 確認每位教練的方案名稱、價格、課程長度與固定時段。
4. 另開一輪、取得明確同意後，才準備正式資料補齊 SQL 或由後台逐筆建立。

## 唯讀檢查 SQL

檔案：

`supabase_coach_plans_data_readiness_checks.sql`

這支 SQL 只讀取資料，回報：

- `coach_saleability_readiness_summary`
  - approved coach 總數
  - 依新規則可正式可售的 coach 數
  - 缺 active `coach_plans` 的 coach 數
  - 缺 active `coach_availability_rules` 的 coach 數
  - 有 legacy `available_times` 但缺正式 rules 的 coach 數

- `coaches_missing_active_plans`
  - 找出 approved 但沒有 active `coach_plans` 的教練

- `coaches_missing_active_availability_rules`
  - 找出 approved 但沒有 active `coach_availability_rules` 的教練

- `coach_plan_seed_candidates`
  - 產生人工審核用的建議方案欄位
  - 這只是候選清單，不是寫入語法

- `coach_availability_rule_seed_candidates`
  - 找出需要把 legacy `available_times` 轉成正式 `coach_availability_rules` 的教練

## 人工確認門檻

每位教練至少要確認：

1. 是否仍要在平台正式上架。
2. 正式方案名稱，例如「一般單堂課」。
3. 課程長度，例如 60 / 90 / 120 分鐘。
4. 正式價格，不可只依賴舊 `base_price`。
5. 固定可預約時段：星期、開始時間、結束時間。
6. 時段是否與教練實際可授課時間一致。
7. 是否要保留 legacy `available_times` 作為參考，或清空避免混淆。

## 建議補齊順序

1. 先補 `coach_plans`
   - 每位 approved coach 至少一筆 active plan。
   - 價格必須大於 0。
   - `duration_minutes` 必須符合目前 API 可接受值。

2. 再補 `coach_availability_rules`
   - 每位要上架教練至少一筆 active rule。
   - `weekday` 必須是 0 到 6。
   - `end_time` 必須大於 `start_time`。
   - 不可與同一天既有 active rule 重疊。

3. 最後重跑唯讀檢查 SQL
   - `formally_salable_coach_count` 應符合預期。
   - 缺資料清單應為 0，或只剩刻意不上架的教練。

## 驗收

資料補齊後，建議驗收：

1. `/api/coaches` 回傳至少一位 `can_book = true` 的教練。
2. `/api/coaches/[id]` 回傳非空 `plan_options`。
3. `/api/coaches/[id]` 回傳非空 `availability_rules`。
4. 前台教練詳情頁可選正式方案。
5. 建立預約時使用正式 `planId`，不再使用 `default-*`。
6. 建立預約仍會檢查正式 availability rules。
7. 若教練缺方案或缺固定時段，仍會被擋下，不可售。

## 回滾

本階段沒有直接改 DB，因此沒有 production 資料回滾。

若後續真的執行資料補齊，建議正式補資料前先輸出 affected coach id 清單，並在補資料 SQL 中保留可辨識欄位，例如：

- `title`
- `duration_minutes`
- `price`
- `display_order`

若補錯資料，回滾策略應是針對該批新增的方案或時段改為 inactive，而不是硬刪已被 booking 參照的資料。

## 風險

1. 目前新規則會讓沒有正式方案的教練不可預約。
2. 若補資料前先部署，live DB 可能暫時出現正式可售教練為 0 的狀態。
3. 若用錯價格或課程長度補資料，會直接影響付款金額。
4. 若把 legacy `available_times` 自動轉換但未人工確認，可能開放錯誤時段。

## 下一步建議

先由使用者確認：

1. 是否要我根據唯讀檢查結果，產生「每位教練候選補齊清單」。
2. 是否仍維持不直接寫 DB，只產生 SQL 草稿或 CSV 草稿。
3. 是否先用後台 UI 手動建立方案與時段，而不是 SQL 批次補資料。
