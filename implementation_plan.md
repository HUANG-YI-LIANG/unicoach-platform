# Push Notifications v1 MVP 實作計畫

本計畫目標是實作 UniCoach / AMIKE 平台的 Web Push MVP (第一版)，使管理員能夠測試發送推播給有啟用通知的使用者，並為後續業務事件推播打好基礎架構。本計畫完全依照 Hermes 提供的架構建議進行。

## User Review Required

> [!WARNING]
> **VAPID 私鑰暴露警告**
> 由於剛剛在對話紀錄中不小心將 VAPID Private Key 印出，該把鑰匙已被視為洩漏。
> 請您務必重新執行 `npx web-push generate-vapid-keys`，並將新的金鑰設定到本機 `.env.local` 以及 Vercel 環境變數。

> [!IMPORTANT]
> **SQL 部署**
> 我將會產生 `supabase_migration_push_notifications_v1.sql` 檔案，稍後您需要到 Supabase SQL Editor 中手動執行這段語法，以擴充資料庫欄位並加入 `notification_delivery_logs`。

## Proposed Changes

---

### Database Migration

#### [NEW] [supabase_migration_push_notifications_v1.sql](file:///d:/Codex/AMIKE/platform/supabase_migration_push_notifications_v1.sql)
- 擴充 `push_subscriptions` 欄位 (`last_seen_at`, `revoked_at`, `failure_count`, `last_error` 等)
- 建立 `notification_delivery_logs` 以記錄推播發送稽核紀錄
- 建立 `notification_reads` 以紀錄全域通知的已讀狀態
- 設定對應的 RLS (Row Level Security) 政策與 Index

---

### Frontend Clients & UI

#### [NEW] [lib/pushClient.js](file:///d:/Codex/AMIKE/platform/lib/pushClient.js)
- 實作前端專用的 `isPushSupported()`, `getNotificationPermission()`, `enablePushNotifications()`, `disablePushNotifications()`。

#### [NEW] [components/PushNotificationToggle.jsx](file:///d:/Codex/AMIKE/platform/components/PushNotificationToggle.jsx)
- 建立可以掛載在 Dashboard 或設定頁面的「推播通知開關」React 元件，封裝狀態管理與讀取機制。

#### [MODIFY] [public/sw.js](file:///d:/Codex/AMIKE/platform/public/sw.js)
- 加強 Service Worker 的 `push` 及 `notificationclick` 事件處理，規範 payload 解析與點擊推播時只能開啟相對路徑（同源網址），防範釣魚連結。

---

### Backend API Routes & Services

#### [NEW] [lib/notificationService.js](file:///d:/Codex/AMIKE/platform/lib/notificationService.js)
- 封裝 `notifyUser` 服務，內部會先 `insert user_notifications`，接著呼叫 `sendPushNotification` 送出推播。

#### [MODIFY] [lib/pushManager.js](file:///d:/Codex/AMIKE/platform/lib/pushManager.js)
- 強化 `sendPushNotification`，加入 `revoked_at` 的過濾、支援回寫 `notification_delivery_logs`，並在 404/410 錯誤時進行 soft revoke（標記 `revoked_at`）。

#### [MODIFY] [app/api/push/subscribe/route.js](file:///d:/Codex/AMIKE/platform/app/api/push/subscribe/route.js)
- 修改 POST，接收新的 Request Body `({ subscription, userAgent })`，支援存入新擴充的 DB 欄位 (e.g. `user_agent`, `last_seen_at`)。

#### [NEW] [app/api/push/status/route.js](file:///d:/Codex/AMIKE/platform/app/api/push/status/route.js)
- 建立 GET Endpoint 讓前端能確認目前使用者的 active subscription 狀態。

#### [NEW] [app/api/push/unsubscribe/route.js](file:///d:/Codex/AMIKE/platform/app/api/push/unsubscribe/route.js)
- 建立 POST Endpoint 讓使用者可關閉裝置通知（soft delete，設定 `revoked_at`）。

#### [MODIFY] [app/api/admin/notifications/route.js](file:///d:/Codex/AMIKE/platform/app/api/admin/notifications/route.js)
- 在 Admin 發送單一使用者站內通知時，如果 Payload 設定了 `send_push: true`，則呼叫 Web Push。

#### [MODIFY] [app/api/notifications/route.js](file:///d:/Codex/AMIKE/platform/app/api/notifications/route.js)
- 強化通知列表與已讀標記的 API，支援 `notification_reads` 機制。

## Verification Plan

### Manual Verification
1. 設定好全新的 VAPID Keys 後，開啟平台並登入管理員帳號。
2. 前往加入 `PushNotificationToggle` 的頁面，點擊開啟推播，並允許瀏覽器要求。
3. 進入 Supabase `push_subscriptions` 檢查紀錄是否產生。
4. 透過 Admin 的「測試通知功能」發送推播給自己的帳號。
5. 驗證是否在桌面上彈出推播視窗。
6. 點擊推播，確認會跳轉到 `/notifications` 等設定頁面。
