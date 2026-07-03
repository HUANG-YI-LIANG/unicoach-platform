---
name: unicoach coach system
description: Unicoach 教練審核機制、創始教練規則、與動態績效 (Dynamic Commission) 抽成判定
---

# Unicoach Coach System Skill

這份文件記錄了 Unicoach 平台的核心「教練系統」運作邏輯，包含審核流程、創始教練特殊邀請、以及動態抽成等級計算。

## 1. 創始教練邀請與審核 (Pioneer Coach Verification)
- **觸發條件**：透過專屬邀請網址（帶有 `?invite=pioneer` 參數）註冊。
- **審核流程**：
  1. `app/api/auth/register/route.js` 自動在 `user_metadata` 寫入 `applied_as_pioneer: true`。
  2. 系統自動尋找管理員並建立聊天室 (`chat_rooms`)，發送預設的審核問題。
  3. 管理員在後台審核列表 (`app/admin/verification/page.js`) 會看見「🌟 申請創始教練」徽章。
  4. 管理員進入聊天室 (`app/chat/[id]/page.js`)，可點擊「🏆 設為創始教練」。
  5. 觸發 `app/api/admin/verify/route.js` 的 `approve_pioneer` 動作，完成核准、減免 5% 抽成 (`commission_discount = 5`)，並正式標記 `is_pioneer: true`。

## 2. 一般教練審核 (General Verification)
- **審核條件**：教練需上傳相關證明文件至 `user_files`，狀態為 `pending`。
- **處理邏輯**：管理員可進行 `approve`、`reject`、`suspend`、`delete_coach`。
- **轉回一般使用者**：若執行 `delete_coach`，為避免連鎖刪除既有預約或影片，系統採用「軟刪除」：
  - 將 `coaches.approval_status` 設為 `revoked`。
  - 將 `users.role` 從 `coach` 改回 `user`。

## 3. 動態績效與抽成等級 (Dynamic Commission & Levels)
- **檔案位置**：`lib/coachPerformance.js`
- **核心機制**：
  - 教練的抽成比例 (Commission) 與等級 (Level) 會根據**近 30 天的表現**動態計算。
  - 判定參數來源：`platform_settings` 表中的門檻值。
  - 影響指標：
    1. **月完課數** (Completed Bookings)
    2. **平均評價** (Average Rating)
    3. **回覆率與速度** (Response Rate & Time)
    4. **完課率** (惡意取消或逾期未接單將影響完課率)
- **結算結果**：
  - 系統計算出 Base Commission（基礎抽成，通常介於 20% ~ 45%）。
  - 若教練本身享有 `commission_discount`（例如創始教練的 5% 減免），最終抽成為 `Base Commission - Discount` (最低不低於 0)。
  - 若未達最低標（如完課率低於 85%、惡意取消超過 2 次等），會被強制限縮為 Level 1，抽成率為最高（例如 45%）。

## 4. 教練儀表板與前端呈現 (Coach Dashboard)
- **檔案位置**：`app/dashboard/coach/page.js`
- **呈現邏輯**：前端只讀取 `lib/coachPerformance.js` 回傳的運算結果。教練介面會即時顯示當前的抽成率、達標進度條，並以此督促教練提升上課品質。
