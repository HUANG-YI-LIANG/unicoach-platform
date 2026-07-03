---
name: unicoach financial system
description: Unicoach 金流、錢包、優惠券、與校園大使分潤機制 (Wallet & Financials)
---

# Unicoach Financial System Skill

這份文件記錄了 Unicoach 平台最核心的「金流與錢包系統」，包含所有餘額扣抵、優惠券使用、以及校園大使的自動分潤機制。所有的金流操作都必須嚴格遵守這些規則，以防止資料庫出現負數或餘額異常。

## 1. 錢包交易模型 (Wallet Transactions)
- **資料表**：`users.wallet_balance` 與 `wallet_transactions` 表。
- **交易類型 (transaction_type)**：
  - `deposit`: 儲值 (使用者加值點數)。
  - `class_payment`: 課程扣款 (當使用者預約課程時，預扣點數)。
  - `coach_payout`: 教練撥款 (當課程完課後，將結算金額撥給教練)。
  - `withdrawal`: 提領出金 (教練申請將平台點數換成現金)。
  - `refund`: 退款 (課程被取消或教練未接單，將預扣的點數退還給學員)。
  - `ambassador_reward`: 校園大使分潤 (從教練的平台手續費中，提撥給介紹人的獎金)。
  - `system_adjustment`: 系統調整 (由管理員手動調整的點數補償或扣除)。
- **安全防護**：
  - 在執行任何扣款 (`class_payment`, `withdrawal`) 時，必須在資料庫層級 (Postgres RPC 或 Transaction) 鎖定該筆 `users` 資料 (`SELECT ... FOR UPDATE`)，並確認扣除後的 `wallet_balance >= 0`。絕對不可依賴純應用層的檢查，以防 Race Condition。

## 2. 折扣與優惠券系統 (Promotions & Coupons)
- **折扣類型**：
  1. **User Coupons**：存於 `users.user_metadata.coupons` 中，學員可透過輸入折扣碼 (Promotion Code) 獲得。
  2. **Active Coupon**：結帳時選用的優惠，存於 `user_metadata.active_coupon`。
  3. **Level Discount**：學員等級自動打折 (儲存於 `platform_settings`)。
- **結帳套用順序**：
  - 課程原價先套用 Level Discount，再套用 Active Coupon，得出最終「學員實付金額」。
  - 學員付款時，從錢包中扣除「實付金額」，同時清除 `active_coupon`。

## 3. 教練結算機制 (Coach Settlements)
- **檔案/機制**：結算通常透過 Postgres RPC (`settle_booking` 或類似函數) 執行。
- **抽成計算公式**：
  - 教練實拿點數 = `課程原價 * (100 - 教練當前抽成比例%) / 100`。
  - 平台手續費收入 = `實付金額 - 教練實拿點數`。
  - *(注意：平台會承擔學員使用的優惠券差額。也就是說，即使學員用 0 元上課，只要課程有成立，教練依然會拿到依「原價」計算出的酬勞，這部分的虧損由平台吸收。)*

## 4. 校園大使分潤 (Ambassador Earnings)
- **角色定義**：`role === 'ambassador'`，專門推廣平台的人員。
- **觸發時機 (Webhook/Trigger)**：
  - 當學員結帳一筆課程，且該學員註冊時有填寫大使的 `referral_code`（或 `referred_by`）。
  - 當「教練完課結算」時，若該學員是被介紹的，系統會從「**平台手續費收入**」中，提撥一定比例 (預設可能為 10% 或依照設定檔) 的點數，自動作為 `ambassador_reward` 匯入該大使的錢包中。
- **防呆機制**：如果該筆課程退款 (`refund`)，通常會透過 DB Trigger 同步回收該筆分潤，或是在未完課前先不撥款給大使。
