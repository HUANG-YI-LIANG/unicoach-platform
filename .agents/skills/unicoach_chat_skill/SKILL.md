---
name: unicoach chat system
description: Unicoach 聊天室機制、對話權限控制與 Web Push 通知推播系統 (Chat & Notifications)
---

# Unicoach Chat & Notifications Skill

這份文件記錄了 Unicoach 平台的「即時通訊 (Chat)」與「推播通知 (Web Push)」的運作機制。

## 1. 聊天室權限與建立 (Chat Rooms)
- **檔案位置**：`app/api/chat/rooms/route.js`
- **對象限制**：
  - 正常情況下，只有當**學員與教練之間有實質的預約關係 (Bookings)** 時，雙方才能建立聊天室。
  - **特例 1 (創始教練審核)**：當教練使用特殊邀請碼註冊時，系統會在後台強制插入一筆 `user_id = admin.id` 的對話紀錄。
  - **特例 2 (管理員介入)**：管理員 (`role === 'admin'`) 可以無條件讀取並參與任何對話，或強制開啟與特定使用者的對話。
- **權限驗證 (verifyRoomParticipant)**：
  - 在發送或讀取訊息時，後端會驗證當前登入的 User ID 是否存在於 `chat_rooms.user_id` 或 `chat_rooms.coach_id` 中，或是其角色為 `admin`。若非以上三者，將被阻擋 (403 Forbidden)。

## 2. 訊息處理與標記 (Chat Messages)
- **檔案位置**：`app/api/chat/route.js`
- **欄位定義**：
  - `is_system`：若為 `true`，前端會將該訊息渲染為系統提示 (例如：「預約已成立」、「審核問題」)，而非一般的使用者對話氣泡。
  - `is_read`：用來計算未讀訊息數量。當使用者進入特定的 `app/chat/[id]/page.js` 時，前端會呼叫 API 將對應該 Room 且非自己發送的訊息標記為 `is_read = true`。

## 3. Web Push 通知機制 (Push Notifications)
- **架構設計**：
  - 瀏覽器端使用 Service Worker (`public/sw.js`) 來接收並顯示系統原生通知。
  - 前端透過 `lib/pushClient.js` 處理訂閱邏輯，並將產生的 Push Subscription JSON 存入資料庫 (`push_subscriptions` 表)。
- **觸發時機**：
  - 當一則新訊息送出時 (`app/api/chat/route.js`)，後端會**同步**呼叫 `sendPushNotification`，將標題 (`Title`)、內文 (`Body`) 與點擊後前往的網址 (`URL`) 推送給對方。
- **伺服器端實作**：
  - 後端推播邏輯位於 `lib/pushManager.js` (使用 Web-Push 套件)。
  - 推播發送失敗時，會累加該 Subscription 的 `failure_count`；若失敗超過一定次數，系統會自動清除該無效訂閱，以免浪費伺服器資源。
