---
name: unicoach auth and users
description: Unicoach 平台使用者認證系統、角色權限、未成年限制與 Profile 讀取機制
---

# Unicoach Auth & Users Skill

這份文件記錄了 Unicoach 平台的使用者認證、角色權限與基本用戶模型。

## 1. 註冊與身分驗證 (Registration)
- **檔案位置**：`app/api/auth/register/route.js`
- **核心機制**：
  - 底層使用 Supabase Auth (`adminSupabase.auth.admin.createUser`) 建立帳號。
  - **合規限制**：使用者年齡必須 >= 13 歲。若 `< 18` 歲，必須勾選 `guardianConsent`。
  - 註冊時將前端傳來的 `role` 寫入 `user_metadata` 中。
  - 成功建立 Auth 後，系統會在 `public.users` 資料表內建立對應的 Profile。
  - 若 `role === 'coach'`，系統會自動在 `public.coaches` 中建立預設資料，並將 `approval_status` 設為 `pending`。
  - **審計紀錄**：註冊成功會寫入 `audit_logs` (Action: `USER_REGISTERED`)。

## 2. 登入機制 (Login & Sessions)
- **檔案位置**：`app/api/auth/login/route.js`
- **核心機制**：
  - 使用 Supabase Auth 進行信箱密碼驗證。
  - 登入成功後，將用戶的 `{ id, email, name, role, level }` 進行 AES 加密，存入 HTTP-only Cookie (`session`) 供全站 Middleware 進行無狀態驗證。
  - 若用戶密碼過於老舊或觸發強制重設條件，`public.users` 中可能標記 `force_password_reset`。

## 3. 使用者資料模型 (User Profile & Metadata)
- **檔案位置**：`app/api/auth/profile/route.js`
- **核心機制**：
  - 用戶資料分散在三個地方：
    1. `public.users`：存放公開無敏感性資料（姓名、餘額、等級、頭像等）。這些欄位受 `lib/securityRules.js` 中的 `SAFE_USER_PROFILE_FIELDS` 限制。
    2. `user_metadata` (Auth)：存放不需要被他人看見、或與認證高度綁定的標記，如：`coupons`（優惠券）、`active_coupon`（當前使用的優惠券）、`is_pioneer`（創始教練標記）。
    3. `public.coaches`：若為教練，專屬的教學設定（經歷、教學理念、基底價格、時段）存於此。

## 4. 角色與權限架構 (Roles & Authorization)
- **四種主要角色**：
  - `user`：一般學員，可預約課程、儲值、觀看歷史紀錄。
  - `coach`：教練，有專屬儀表板，可設定上課時段、請款。需由管理員核准 (`approval_status === 'approved'`) 才可公開接單。
  - `admin`：管理員，擁有最高權限，可進入後台進行資料審核、封鎖用戶、派發折價券等操作。
  - `ambassador`：校園大使，特殊推廣帳號，不一定具備教練或學員功能，但可參與推廣分潤。
- **權限控制**：
  - 前端與 API 路由透過 `lib/auth.js` 裡的 `requireAuth(['admin'])` 來保護。若無權限會返回 403 或重導向。
