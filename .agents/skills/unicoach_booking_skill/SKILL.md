---
name: unicoach booking system
description: Unicoach 預約流程與課程狀態流轉機制 (Booking Workflow)
---

# Unicoach Booking System Skill

這份文件記錄了 Unicoach 平台的核心「課程預約系統」與「狀態流轉機制」。

## 1. 狀態流轉架構 (State Machine)
- **核心檔案**：`lib/bookingWorkflow.js`
- 系統定義了嚴格的狀態流轉，並基於不同角色 (Student, Coach, Admin) 給予不同的操作權限。
- **合法狀態清單 (VALID_BOOKING_STATUSES)**：
  - `pending_payment` (待付款)
  - `pending_confirmation` (待確認 - 若有需求則使用，目前多為直入 scheduled)
  - `scheduled` (已預約 / 即將上課)
  - `in_progress` (進行中)
  - `pending_completion` (待完課 - 通常是教練送出報告後)
  - `completed` (已完課)
  - `cancelled` (已取消)
  - `refunded` (已退款)
- **終點狀態 (Terminal Statuses)**：`completed`, `cancelled`, `refunded`。一旦進入這些狀態，則無法再隨意更動。

## 2. 角色權限規則 (Transition Rules)
- **學生 (Student)**：
  - 在 `pending_payment`, `pending_confirmation`, `scheduled` 狀態下，僅允許執行 `cancelled`。
- **教練 (Coach)**：
  - `pending_confirmation` -> `scheduled` 或 `cancelled`。
  - `scheduled` -> `in_progress` 或 `cancelled`。
  - `in_progress` -> `pending_completion` (必須透過填寫報告觸發)。
  - `pending_completion` -> `completed`。
- **管理員 (Admin)**：
  - 不受一般流程限制，可強制介入，但若目標狀態不合法，仍可能被擋下。

## 3. 完課條件防護 (Completion Guards)
- 當教練嘗試將課程標記為完成 (`completed`) 時，會觸發 `canCompleteBooking` 驗證：
  1. `payment_status` 必須是 `paid`。
  2. 必須已經填寫「**正式學習報告**」(`hasFinalReport === true`)。
  3. **時間限制**：目前時間 (`now`) 必須大於 `expected_time + duration_minutes`。也就是說，課程尚未結束前，不允許提早完課。

## 4. 取消與惡意判定 (Cancellation & Faults)
- **判定邏輯**：當狀態變更為 `cancelled` 時，會紀錄 `cancel_fault_party`。
- 如果 `cancel_fault_party` 是 `coach_fault` 或 `coach_pending_review`，這筆取消將會計入教練的「惡意取消」次數，並嚴重影響其在 `coachPerformance` 的完課率及評分。

## 5. 付款過期防護 (Payment Expiration)
- 處於 `pending_payment` 的預約會有一個 `payment_expires_at`。
- API 存取或更新時，會透過 `getPendingPaymentExpirationState` 檢查。如果已過期，系統會自動將該筆預約標記為 `cancelled` 且 `payment_status` 標記為 `expired`，並擋下後續操作。
