---
name: unicoach admin controls
description: Unicoach 管理員後台機制、權限驗證與審計日誌 (Admin Controls & Audit Logs)
---

# Unicoach Admin Controls Skill

這份文件記錄了 Unicoach 平台的「管理員後台 (Admin Panel)」與「審計追蹤 (Audit Logs)」機制。為了確保平台的安全性與操作透明度，所有與管理員相關的開發都應遵循此規範。

## 1. 管理員權限驗證 (Admin Authorization)
- **檔案位置**：`lib/auth.js`
- **前端與 API 路由保護**：
  - 所有的後台頁面 (`app/admin/*`) 與管理員 API (`app/api/admin/*`)，在最外層都必須呼叫 `requireAuth(['admin'])`。
  - 此函式會解析 Request Cookie 中的 `session` token，解密並確認 `role === 'admin'`。若非管理員，將直接返回 403 Forbidden 或將使用者重導向至首頁。

## 2. 後端提權操作 (Bypass RLS)
- **檔案位置**：`lib/supabase.js`
- **核心機制 (`getAdminSupabase`)**：
  - 一般的 Supabase Client 會受到 Row Level Security (RLS) 的限制，確保用戶只能存取自己的資料。
  - 但在管理員 API 中，我們需要進行跨使用者的查詢與修改（例如：審核教練、查詢全站交易紀錄）。因此，必須引入並使用 `getAdminSupabase()`。
  - 這個 Client 使用了 `SUPABASE_SERVICE_ROLE_KEY`，能**完全繞過 RLS**，因此**絕對不可**在 Client-side 或未經驗證的 API 路由中使用它。

## 3. 審計日誌追蹤 (Audit Logs)
- **資料表**：`audit_logs`
- **設計目的**：記錄所有具備「破壞性」或「高權限」的操作，作為日後溯源防弊的依據。
- **寫入時機範例**：
  - **使用者註冊** (`USER_REGISTERED`)：紀錄註冊信箱、角色與未成年同意狀態。
  - **教練審核操作** (`COACH_APPROVE`, `COACH_REJECT`, `COACH_SUSPEND`, `COACH_DELETE`)：紀錄是由哪位管理員 (`actor_id`) 在什麼時間，對哪位教練 (`target_id`) 執行了什麼動作，並附帶原因 (`details.reason`)。
  - **點數與折價券派發** (`COUPON_ISSUED`, `SYSTEM_ADJUSTMENT`)：紀錄發放對象與額度。
- **實作規範**：任何對 `app/api/admin/` 的狀態修改 (Update/Delete/Insert)，都應在 Transaction 成功後，同步 `insert` 一筆紀錄到 `audit_logs` 表。

## 4. 特殊操作防呆
- **刪除教練 (`delete_coach`)**：
  - 在 `app/api/admin/verify/route.js` 中，管理員有權「刪除」教練資格。
  - 但為了避免關聯資料庫報錯 (如該教練身上綁定了舊有的課程、影片、錢包紀錄)，系統**不使用 SQL 的 DELETE 語法**，而是採取「軟刪除」加「降級」：
    1. 將 `coaches.approval_status` 標記為 `revoked`。
    2. 將 `users.role` 從 `coach` 改回 `user`。
  - 如此一來，該帳號無法再接單或進入教練後台，但過去的歷史紀錄與財務報表仍完美保留。
