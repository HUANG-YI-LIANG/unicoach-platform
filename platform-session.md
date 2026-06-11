
2026-05-09 15:48:40 使用者提供 AMIKE platform 專案路徑 D:\Codex\AMIKE\platform 與 Vercel 網址 https://platform-zeta-one-51.vercel.app/；本輪已讀取 AGENTS.md、首頁與教練列表頁，確認目前導流主路徑為首頁 CTA『我要找教練』到 /coaches，並準備詢問是否進行讀取式行銷導流/媒合表單檢查。

2026-05-09 15:53:08 使用者選 C：同時檢查首頁/coaches 社群導流承接與 1 分鐘媒合需求表流程，但不改程式。已只讀檢查 app/page.js、app/coaches/page.js、app/coaches/[id]/page.js、register、bookings、Navigation、/api/ai/match 等；發現目前已有找教練、篩選、詳情、聊天、預約與未接上的 AI match API，但缺少社群專用 landing/快速需求表，預約流程對冷流量偏重。

===============2026-05-09 16:35:23===============
使用者確認 B：直接修改 /match，做第一版免登入 1 分鐘媒合表導到 /coaches。已先備份 app/match/page.js -> app/match/page_bak.js；新增 tests/match-page-static.test.mjs，先跑出 RED，再把 app/match/page.js 從 redirect 改為 client 表單，支援 audience=student/parent、6 個需求欄位、localStorage 暫存與 /coaches query/UTM 導流。驗證：node --test tests/match-page-static.test.mjs 通過；npm run build 初次因 WSL sharp optional dependency 失敗，執行 npm install --include=optional sharp 後 build 通過，警告 VAPID keys 未設定。

===============2026-05-14 14:11:25===============
使用者提供 UniCoach/AMIKE 系統角色設定，要求 Hermes 閱讀專案核心原始碼與 hermes_context.txt。已讀 AGENTS.md、ai-prompts/hermes_context.txt 檔案清單、package.json、auth/db/booking/settlement/social auto-post 關鍵檔案；目前維持唯讀，未修改專案原始碼。

===============2026-05-14 14:15:37===============
使用者選擇 A，要求深度審查 confirm-payment 與 settlements route 的高風險現金流。已唯讀審查付款確認、結算產生、結算狀態更新、schema/migration guards；發現 settlements POST 非 transaction、insert batch/update bookings/補償 cancel 有 race window，建議改 PostgreSQL RPC + FOR UPDATE + advisory lock + unique/trigger constraints。

===============2026-05-14 14:24:00===============
使用者確認選項 A，要求產出 supabase_migration_settlements_rpc.sql 完整 Migration SQL，由 Antigravity 寫入專案。回覆將提供可直接在 Supabase 執行的 SQL，包含結算產生/狀態更新/付款確認 RPC、settlement paid_at consistency、settlement status transition trigger、booking settlement link trigger、索引與權限。

===============2026-05-14 15:34:00===============
使用者回報 Antigravity 已修復封裝前財務安全 P0/P1：settlement trigger 分離 INSERT/UPDATE、回收 create_booking_safe/complete_booking_with_referral authenticated 權限、settlement_batches NOT NULL/DEFAULT backfill、清理未使用 imports。已唯讀確認 migration 關鍵段落與 route imports；npm run lint 不存在，需改用可用 scripts 驗證。

===============2026-05-14 15:45:00===============
使用者提供最新 hermes_context 並要求規劃 Web Push Notifications。已讀 AGENTS、hermes_context 前段與既有推播檔案：lib/pushManager.js、app/api/push/subscribe/route.js、app/api/admin/notifications/route.js、app/api/notifications/route.js、public/sw.js、supabase_migration_push_notifications.sql、package.json。發現已有 web-push、push_subscriptions、Service Worker、subscribe API 與 admin notification API 雛形；Build 警告源於 VAPID env 未設。另發現 scripts/push-env.js 含硬編碼敏感金鑰，回覆時需要求移除並輪替，且不可揭露值。

===============2026-05-15 12:27:00===============
使用者回報 Antigravity 已刪除 scripts/push-env.js、建立 push-env.example.js、生成 VAPID keys，並要求產出 Push Notifications v1 MVP 實作規格書與完整 DB migration。回覆需避免重述使用者貼出的 VAPID private key；因 private key 已出現在對話中，建議重新生成/輪替 VAPID key pair 後再設定。

===============2026-05-15 12:35:00===============
使用者轉述 Antigravity 已將 Hermes 規格整理成 implementation_plan.md 並要求核准 MVP Push v1 實作。實際檔案系統未找到 /mnt/d/Codex/AMIKE/platform/implementation_plan.md；git status 顯示 ai-prompts/hermes_context.txt、platform-session.md 修改、scripts/push-env.js 刪除、scripts/push-env.example.js 新增。已確認 push-env.example.js 無實際 secret，但仍是可寫入 Vercel env 的腳本範本；.env.local 受 .gitignore 保護。回覆建議暫緩 Approve，請先同步/提供 implementation_plan.md 或確認路徑，並要求重新生成 VAPID key、輪替 Supabase sensitive secrets。

===============2026-05-15 12:42:00===============
使用者回報 Antigravity 已將 implementation_plan.md 寫入專案、push-env.example.js 加 throw 防誤執行、並由使用者自行重新生成 VAPID keys 寫入 .env.local。已讀 implementation_plan.md 與 push-env.example.js；計畫範圍符合 MVP Push v1，push-env.example.js 無實際 secret 且第一行 throw 阻斷。git status 顯示 implementation_plan.md 與 push-env.example.js 未追蹤、scripts/push-env.js 已刪除。回覆可正式 Approve，但要求先不要做 global broadcast、DB migration 需手動備份後執行、private key 不可貼出。

===============2026-05-15 12:55:00===============
使用者回報 Antigravity 已完成 Web Push MVP v1 實作並要求手動 Supabase migration/測試。已唯讀檢查 changed files、執行 npm run build 成功但仍出現 VAPID keys not configured；紅acted 檢查顯示本工作區 .env.local 目前缺 NEXT_PUBLIC_VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY。獨立審查未發現 P0，但指出 P1：notification_delivery_logs 對 authenticated 可 SELECT 且含 endpoint/error_message 過度暴露；public/sw.js click handler 未在 click 階段重新 sanitize URL。建議暫緩執行 DB migration，先修 P1。

===============2026-05-15 13:10:00===============
使用者同意依雙 AI 協作模式產生 Web Push MVP P1 修正補丁。未修改正式原檔；已建立 _hermes_patches 並寫入完整替換檔：sw.js、pushManager.js、supabase_migration_push_notifications_v1.sql。修正內容：SW click 階段再次 sanitize URL；pushManager 加 server-only、集中 URL sanitize、redact endpoint、normalize error、failure_count 遞增；migration 移除 authenticated 對 notification_delivery_logs 的一般 SELECT policy/grant，並收緊 notification_reads insert policy。

===============2026-05-15 13:25:00===============
使用者要求檢查 Web Push MVP 是否仍有 bug。已讀 AGENTS、requesting-code-review 技能、目前正式檔案 sw.js/pushManager.js/migration/routes/UI；git status 乾淨，_hermes_patches 已不存在，表示 Antigravity 已套用並清理。npm run build 成功，但目前環境仍顯示 VAPID keys not configured。獨立子代理審查指出主要剩餘問題：P1 authenticated 可直接寫 push_subscriptions 繞過 API 驗證；P2 disable 流程 local unsubscribe 成功但 DB revoke 失敗會殘留 active row；P2 Toggle 只看 local subscription 未對照 /api/push/status；P2 admin delivery logs policy 與 revoke grant 矛盾；低風險 JSON parse 400 與 failure_count race/reset。

===============2026-05-18 06:12:00===============
使用者要求「挖 App 最深處，找出所有潛在 Bug」。已依 read-only audit 執行：讀 AGENTS/requesting-code-review/codebase-inspection 與相關 references；盤點 57 個 API routes 與 35 個 SQL；平行委派三個稽核軌道（Auth/Admin/IDOR、Booking/Payments/Settlement/Rewards、Public/Media/Social/Push/AI）；手動驗證 P0/P1 核心證據檔案；npm run build 成功但有 Turbopack NFT warning 與 VAPID keys not configured。主要 findings：P0 financial payout/discount/adjust-price invariant 可能 coach_payout > final_price；P1 production JWT_SECRET fallback；P1 rate limit fail-open/forgot-password no limiter；P1 AI match 信任 LLM coach_id + select(*)；P1 unauthenticated social test connection；P1 push endpoint 任意 HTTPS egress/SSRF；P1 pending_payment expired 與 DB exclusion constraint 卡時段；P1 reward_logs schema/state drift；P1 apply-code referral race；P2 public coach DTO leaks、logout endpoint deletion IDOR、video interaction spam、malformed JSON 500、delivery-log policy/grant ambiguity、upload validation weakness、Meta token query/preview。未修改正式檔案。

===============2026-05-18 06:28:00===============
使用者確認依建議修 P0 金額/分潤 invariant。已依 Hermes×Antigravity 模式建立 _hermes_patches，未覆寫正式檔案。產生完整替換檔：bookingSecurity.js（新增 calculatePriceSplitFromFinalPrice/assertFinancialPriceInvariant，改為用 finalPrice 拆 platform_fee/coach_payout）、adjust-price.route.js（調價時同步更新 final_price/deposit_paid/platform_fee/coach_payout，safe JSON，審計記錄新舊分潤）、supabase_migration_financial_price_invariants.sql（新增 DB constraints/view/settlement link guard；替換 bookings_non_negative_money 以允許 -200..200 price_adjustment）。node --check 通過。委派獨立 review 第一輪發現負調價與既有 constraint 衝突，已修；第二輪判定無 blocking findings、safe to review/apply；SQL 僅靜態審查，未本地執行 psql。

===============2026-05-19 01:08:00===============
使用者轉貼 Antigravity 提供的 Ambassador Dashboard 相關路徑。已讀取 app/ambassador/page.js、layout.js、ambassador.css、supabase_migration_ambassador_earnings_hook.sql。初步確認 ambassador UI 仍是 client-side hardcoded demo data；SQL hook 在 complete_booking_with_referral 中以 booking.platform_fee 計算 ambassador earnings，需後續審查其與 P0 financial invariant 修補後的 platform_fee 定義一致性、重複入帳/FOUND 行為、已完成 booking idempotency 與 DB schema/constraint。

===============2026-05-19 01:26:00===============
使用者要求直接重構 Ambassador Dashboard mobile layout，不新增功能、不改商業邏輯。已直接修改 app/ambassador/page.js 與 ambassador.css，將原本依賴未配置 Tailwind utilities 的 layout 改為明確 ambassador-* CSS class；建立 max-width 430px mobile frame、統一 section spacing、safe-area bottom nav padding、修正 referral rows、earnings list、level cards、hero overflow；修改 components/ConditionalShell.js 讓 /ambassador 與 /ambassador/* 跳過全域 Header/Navigation，避免左側/底部 nav 重複。獨立 review 第一輪發現 Tailwind 未配置 blocker，已改為純 CSS class；第二輪 review 無 blocking findings。npm run build 仍因 /api/files/upload sharp runtime 在 collect page data 階段失敗，與本次 layout 無關；改用 npx next build --experimental-build-mode compile 驗證通過，/ambassador 編譯成功。


## 2026-05-19 23:11:54 CST — Ambassador Dashboard premium mobile redesign
- 依使用者要求將 `/ambassador` 重構為 premium dark SaaS / fintech mobile dashboard：390px optimized、max-width 430px、20px inline padding、24px section rhythm、28px card radius、glass dark dock bottom nav、dark luxury orange accent system。
- 直接修改正式檔案：`app/ambassador/page.js`、`app/ambassador/ambassador.css`、`app/ambassador/layout.js`，並延續既有 `components/ConditionalShell.js` standalone route 行為。
- 移除 Tailwind arbitrary utility 殘留與 `framer-motion` unused wrapper；改用 route-scoped `ambassador-*` CSS class。
- UI 不再使用 hardcoded financial/demo dashboard data；改由 `GET /api/ambassador/dashboard` 讀取 profile、financials、stats、levels、recentEarnings，新增 loading/error/empty states。
- `app/api/ambassador/dashboard/route.js` 擴充只讀資料輸出：ambassador levels 與最近 earnings feed summary；未修改 payout/commission 計算邏輯。
- 修正 QR download no-op：改為 client-side fetch blob 下載，失敗時 fallback 開啟 QR 圖。
- 驗證：`npx next build --experimental-build-mode compile` 通過；`node --check app/api/ambassador/dashboard/route.js` 通過；全文搜尋確認無 Tailwind utility / fake earnings rows / hardcoded level percentage residue。
- 已知非本次 blocker：完整 `npm run build` 仍受既有 `/api/files/upload` sharp linux-x64 runtime 問題阻擋，且 Turbopack NFT warning 仍來自 `next.config.mjs -> lib/imgbbApi.js -> app/api/cron/auto-post/route.js`。


## 2026-05-20 05:25 CST — Hermes P0-4 booking service binding patch handoff
- Read-only reviewed booking/chat/service routes for P0-4: service-bound bookings, slot race conditions, duplicate payment guards, and chat user_id/profile_id routing.
- Created complete replacement patch files under `_hermes_patches/` instead of modifying live source directly.
- Patch set adds `coach_service_id` / service snapshot persistence, service price/trial_price server-side pricing, race-safe `create_booking_safe` migration update, `/book/[id]` page, and chat `with` resolver for coach_profiles.id vs users.id.
- Verification run: `node --check` passed for patched API routes; Babel JSX parse passed for patched page files.
- No secrets read, displayed, or saved.


## 2026-05-20 16:26 CST — Hermes P1-A Conversion backend patches

Scope: created backend-only patch files for P1 Conversion layer. No production source files were overwritten.

Patch files:
- _hermes_patches/app/api/services/[id]/trust-metrics/route.js
  - Adds GET /api/services/[id]/trust-metrics.
  - Computes coach/service trust metrics for Service Detail lazy loading: response time, response rate, completion rate, retention rate, and six-month coach-fault absence/cancel count.
  - Uses service-level booking metrics when sample size is sufficient and falls back to coach-level metrics.
  - Returns aggregated metrics only; does not expose student identities or message contents.

- _hermes_patches/app/api/services/[id]/videos/route.js
  - Adds GET /api/services/[id]/videos.
  - Resolves service -> coach profile -> coach user id.
  - Combines coach_services.intro_video, coach_videos, and user_videos into one normalized video array for Service Detail.
  - Supports ?limit= with cap and returns source counts for frontend diagnostics.

Verification:
- node --check _hermes_patches/app/api/services/[id]/trust-metrics/route.js: passed
- node --check _hermes_patches/app/api/services/[id]/videos/route.js: passed

Apply order for Antigravity:
1. Copy _hermes_patches/app/api/services/[id]/trust-metrics/route.js -> app/api/services/[id]/trust-metrics/route.js
2. Copy _hermes_patches/app/api/services/[id]/videos/route.js -> app/api/services/[id]/videos/route.js
3. Run npm run build.
4. Smoke test:
   - GET /api/services/{serviceId}/trust-metrics
   - GET /api/services/{serviceId}/videos

Notes:
- These routes require existing P0 V2 tables coach_services and coach_profiles.
- The videos endpoint uses existing coach_videos and user_videos; short_videos table was not found in repo.
- Attendance/no-show is currently derived from bookings.cancel_fault_party IN ('coach_fault', 'coach_pending_review') within the selected window.


## 2026-05-20 16:54 CST — Hermes P1-B Ambassador Register hardening patches

Scope: created patch files only under _hermes_patches; production source files were not overwritten.

Patch files:
- _hermes_patches/supabase_migration_p1_b_ambassador_register_hardening.sql
  - Adds ambassador to public.users role constraint using a role-column-only constraint replacement.
  - Normalizes ambassador_invite_codes.code to upper(trim(code)), adds normalized-code and usage constraints, and adds a normalized unique index.
  - Adds ambassador_invite_claims claim tracking table.
  - Adds claim_ambassador_invite_code(p_code) RPC with SELECT FOR UPDATE and conditional used_count increment.
  - Adds consume_ambassador_invite_claim(p_claim_token, p_user_id) RPC.
  - Adds release_ambassador_invite_claim(p_claim_token) RPC that can only release an unconsumed claim token.

- _hermes_patches/app/api/ambassador/register/route.js
  - Replaces unsafe select-then-update invite usage with claim/consume/release RPC flow.
  - Normalizes invite code/email inputs.
  - Adds duplicate public user precheck before claiming invite usage.
  - Adds promotion-code collision retry.
  - Checks every Supabase mutation error before issuing session cookie.
  - Performs best-effort cleanup of terms_consents, ambassadors, public.users, auth user, and invite claim on partial failure.
  - Does not release an invite claim if Auth user deletion fails.
  - Avoids logging raw request body, password, or secrets.

- _hermes_patches/app/api/ambassador/verify-invite-code/route.js
  - Normalizes invite code, adds rate limiting, uses generic invalid responses, and stops returning remaining uses/expiry/code to reduce invite-code oracle surface.

Verification:
- node --check _hermes_patches/app/api/ambassador/register/route.js: passed
- node --check _hermes_patches/app/api/ambassador/verify-invite-code/route.js: passed
- Static grep for hardcoded secrets / console.log / eval / exec in P1-B patch files: no matches
- Independent review found initial blockers; fixes applied for claim-token correlation and narrower users.role constraint handling.

Apply order:
1. Run _hermes_patches/supabase_migration_p1_b_ambassador_register_hardening.sql in Supabase SQL Editor for Local then Production.
2. Copy _hermes_patches/app/api/ambassador/verify-invite-code/route.js -> app/api/ambassador/verify-invite-code/route.js
3. Copy _hermes_patches/app/api/ambassador/register/route.js -> app/api/ambassador/register/route.js
4. Run npm run build.
5. Smoke/concurrency tests: valid invite registration, expired/exhausted invite rejection, duplicate email does not consume invite, and two parallel uses of a max_uses=1 code produce only one ambassador.

Notes:
- Migration may fail fast if existing invite codes have duplicates after upper(trim(code)) normalization. Resolve duplicates before rerun if that occurs.
- Cleanup is still best-effort across Supabase Auth + DB because Auth and public schema cannot share one DB transaction.

## 2026-05-20 Playwright installation
- Installed @playwright/test 1.60.0 as a devDependency via npm in /mnt/d/Codex/AMIKE/platform.
- Downloaded Playwright browser binaries (Chromium, Firefox, WebKit, FFmpeg) to /home/mike/.cache/ms-playwright.
- Attempted `npx playwright install --with-deps`; sudo password was required, so system deps were not installed. Playwright reported missing Linux dependency: libasound2t64. User should run `sudo npx playwright install-deps` or `sudo apt-get install libasound2t64` in WSL.
- Backups before install: /mnt/d/Codex/AMIKE/platform/_hermes_backups/playwright_install_20260520_164733/package.json and package-lock.json.
- Verified `npx playwright --version` => 1.60.0 and `npm ls @playwright/test --depth=0` resolves.
- Verification browser launch currently fails because WSL is missing shared library libnspr4.so; install system deps with `sudo npx playwright install-deps` (recommended) before running browser tests.

---
## 2026-05-21 01:54 CST — Hermes P2 retention optimization patches

Scope: P2 留存率優化，僅包含輕量課後日誌、一鍵續課參數支援、站內通知 + Email。依 Hermes/Antigravity handoff 規則，未直接覆蓋原始檔，完整 replacement / migration 放在 `_hermes_patches/`。

Patch files:
- `_hermes_patches/supabase_migration_p2_retention_optimization.sql` (16568 bytes)
- `_hermes_patches/app/api/lesson-logs/route.js` (11216 bytes)
- `_hermes_patches/app/api/notifications/route.js` (2447 bytes)
- `_hermes_patches/app/api/notifications/[id]/read/route.js` (1503 bytes)
- `_hermes_patches/app/api/bookings/route.js` (25104 bytes)

SQL migration highlights:
- Creates `lesson_logs` with booking unique constraint, rating 1-5, focus area validation, 120-char feedback constraints, indexes, RLS.
- Creates `notifications` with allowed P2 event types, title/message/link constraints, unread indexes, RLS.
- Adds `bookings.rebook_from_booking_id` and `bookings.rebook_context`.
- Recreates `create_booking_safe` with DB-side rebook source validation: same student, same coach, same service, source status completed/pending_completion.
- Keeps `create_booking_safe` service_role-only; explicitly revokes PUBLIC/anon/authenticated execute.
- Notifications direct client update is not allowed; authenticated gets SELECT only; read changes go through API route.

API patch highlights:
- `POST /api/lesson-logs`: coach/admin submission, booking ownership check, completed/pending_completion only, one log per booking, creates in-app notification, sends best-effort Email via EMAIL_USER/EMAIL_APP_PASSWORD if configured.
- `GET /api/lesson-logs`: role-scoped list; student sees own logs, coach sees own submitted logs, admin sees all.
- `GET /api/notifications`: user-scoped notifications, unread filter/count, P2 type filter.
- `PATCH /api/notifications/[id]/read`: marks only current user notification read.
- `POST /api/bookings`: accepts `rebookFromBookingId` / `rebook_from_booking_id`; validates source and carries old settings into a new pending_payment booking only.

Verification:
- `node --check` passed for lesson-logs, notifications, notification read, and bookings patch routes.
- hardcoded secret / console.log / eval / exec grep returned no findings.
- Independent review found two blockers; both fixed: create_booking_safe authenticated grant removed, notifications direct UPDATE removed. Focused second review reported no remaining blockers.

Apply order:
1. Run `_hermes_patches/supabase_migration_p2_retention_optimization.sql` in Supabase local/staging first, then production.
2. Apply replacement route files for lesson-logs and notifications.
3. Apply replacement booking route patch if Antigravity has merged latest P0 booking route baseline.
4. Run `npm run build`.
5. Smoke test lesson log creation, notification list/read, and one-click rebook with source booking.

---
## 2026-05-21 03:46 CST — Hermes P2 UI style/UX review and fixes

Scope: reviewed Antigravity P2 UI refactor for UniCoach dark premium style, mobile-first behavior, UX flow, and client-side quality. User authorized direct fixes limited to UI/UX/responsive/bug fixes; no DB schema or booking/payment core changes were made.

Backups: `_hermes_backups/p2_ui_review_20260521_033843/`

Files changed:
- `app/reports/[bookingId]/page.js`
- `components/NotificationBell.jsx`
- `app/dashboard/user/page.js`
- `app/book/[id]/page.js`

Fixes applied:
- Reports page: fixed localStorage draft overwrite race by adding draftLoaded guard; draft remains per bookingId and clears before redirect on submit.
- Reports page: removed UI-side booking status mutation after lesson-log submit; the report form no longer changes booking/payment lifecycle state.
- Reports page: capped quick-template/textarea text to 120 chars and changed 1-5 rating buttons to a 5-column mobile-safe grid.
- NotificationBell: fixed unread count to use API unreadCount fallback, guarded link_url to internal paths only, improved mobile sheet width/box sizing/safe-area/scroll containment, removed noisy polling console errors.
- User dashboard: fixed notification read API path to `/api/notifications/[id]/read`, restored notification message rendering for new P2 DTO, and added internal-link navigation on notification click.
- User dashboard: replaced several lingering var-based/legacy surface styles with #050816/#0F172A/#FF8A3D aligned styling and fixed orange-button contrast.
- Book page: fixed datetime-local timezone formatting, improved rebook fetch error handling, clarified one-click rebook banner that it creates only a pending booking and still requires user confirmation/payment.

Verification:
- `node --check` passed for `app/reports/[bookingId]/page.js`, `app/dashboard/user/page.js`, and `app/book/[id]/page.js`. (`components/NotificationBell.jsx` cannot be checked by `node --check` because Node rejects `.jsx` extension.)
- `npm run build` still fails, but not from the four reviewed files. Current blockers are pre-existing/unrelated JSX parse errors in `app/coaches/page.js` and `app/service/[id]/page.js` (`Expected </, got <eof>`), plus a Turbopack NFT warning from `next.config.mjs` / `lib/imgbbApi.js` / cron route import trace.
- Mobile 390px review was static/code-level: rating grid, bottom sheet width/box sizing/safe-area, dashboard inbox scroll, and book form spacing were adjusted. Browser-device verification is still recommended after unrelated build blockers are fixed.

---
## 2026-05-21 04:04 CST — Build stability fix for JSX parse blockers

Scope: build stability only. No new features, no DB schema changes, no booking/payment core changes.

Files changed:
- `app/coaches/page.js`
- `app/service/[id]/page.js`

Root cause:
- Both files had escaped template literal artifacts inside JSX inline style expressions: `\`url(\${service.cover_image})\``.
- The backslash before the template backtick caused the JS parser to misread the JSX expression and report `Expected </, got <eof>` at EOF, making it look like a missing closing JSX tag.

Fix:
- Replaced the escaped artifacts with valid template literals: `` `url(${service.cover_image})` `` in both files.
- No JSX tree structure, feature flow, booking/payment logic, or P2 UI four files were otherwise changed during this build-stability pass.

Verification:
- `node --check` passed for `app/coaches/page.js`, `app/service/[id]/page.js`, and P2 UI pages `app/reports/[bookingId]/page.js`, `app/dashboard/user/page.js`, `app/book/[id]/page.js`.
- `npm run build` passed fully.
- Build still emits warnings only: Turbopack NFT trace warning from `next.config.mjs` / `lib/imgbbApi.js` / `app/api/cron/auto-post/route.js`; VAPID keys not configured; edge runtime disables static generation warning. No build errors remained.
- No hydration errors were reported during production build. Browser runtime smoke test is still recommended for visual/hydration confirmation.


## 2026-05-21 04:53:51 CST — Final P2 smoke test (390px, no feature changes)

Scope:
- Smoke-tested mobile 390px surfaces for `/dashboard/user`, NotificationBell, and `/reports/[bookingId]` using mocked auth/API data.
- Verified `/book/[id]?rebook_from_booking_id=...` rebook flow at code level because browser automation timed out before final book screenshot; build remains green from previous pass.
- No app feature code, DB schema, booking/payment core logic, or UI implementation files were changed.

Artifacts:
- `_hermes_smoke/screenshots/01-dashboard-user-390.png`
- `_hermes_smoke/screenshots/02-notification-bell-390.png`
- `_hermes_smoke/screenshots/03-report-form-390.png`
- `_hermes_smoke/smoke-p2-final.js` test harness only

Results:
- Dashboard 390px: no visible horizontal overflow, bottom nav did not cover content, no white form remnants, notifications/lesson log/rebook entry visible.
- NotificationBell 390px: bottom sheet visible, no visible horizontal overflow, not blocked by bottom nav, no white background remnants.
- Report form 390px: no visible horizontal overflow, bottom nav did not cover submit area, dark form fields visible, draft cleanup guarded by code path (`localStorage.removeItem(storageKey)` on successful POST).
- Rebook code path: loads previous booking via `/api/bookings`, carries grade/gender/attendees/learning_status, uses local `datetime-local` formatter, shows copy that only pending-payment booking is created, and only posts to `/api/bookings` after user clicks confirm.
- No direct payment/order API call exists in `app/book/[id]/page.js`.

Limitations:
- Browser automation environment lacks Playwright Linux system libraries and passwordless sudo; subagent browser run produced 3 screenshots but timed out before `/book` screenshot.
- Windows Edge CDP was reachable only from Windows localhost, not directly from WSL Playwright.
- Screenshots show tofu boxes for some Chinese glyphs, likely test environment font fallback issue; layout was still inspectable.


## 2026-05-27 — P3 Premium Native App UI Reconstruction
- Scope: UI/UX-only reconstruction for mobile-first premium native-like experience.
- Guardrails: do not change booking/payment/auth/notification/rebook APIs or Supabase schema.
- Backups created under `_hermes_backups/p3_native_ui_20260527_0013/`.
- Implemented: global dark premium tokens, native floating bottom dock, fullscreen Discover/service-card feed, fullscreen video feed polish, premium service detail sales page, student home hero/category/search polish, coach creator-dashboard polish, favorites placeholder route.
- Verified: `npm run build` succeeded; smoke HTTP 200 for /coaches, /explore, /favorites, /service/test-id, /dashboard/user, /dashboard/coach via `npm run start` on localhost:4000.
- Build warnings observed: existing Turbopack NFT tracing warning via app/api/cron/auto-post/route.js -> lib/imgbbApi.js -> next.config.mjs; VAPID keys not configured. No booking/payment/auth/schema changes made.
- Re-validation: `npm run build` passed on 2026-05-27; smoke via Node fetch against http://[::1]:4000 returned 200 for /coaches, /explore, /favorites, /service/test-id, /dashboard/user, /dashboard/coach, /coach/plans, /coach/schedule, /chat. Temporary start server was killed after tests.
- Visual QA follow-up: used Windows Edge headless screenshots at 390/430 because Linux Playwright Chromium is blocked by missing libnspr4.so and sudo is unavailable. Added viewport export, tightened bottom nav sizing, polished service missing-state, reduced chat/card dark-system drift, adjusted Discover fallback copy and 390px CTA/action-rail spacing. `npm run build` passed; Node smoke returned HTTP 200 for all requested routes.
- P3 Antigravity UI QA: inspected globals, Navigation, student/coach dashboards, student edit, coach profile edit. Verified home dashboards are reduced to requested focus and referral/wallet/QR live in profile edit pages. Backed up files to _hermes_backups/p3_antigravity_qa_20260527_044759. Fixed visual-only issues: removed duplicate/conflicting 390px bottom-nav block, softened nav border/shadow, added safe bottom padding/overflow protection on edit pages, made referral/QR rows shrink-safe, aligned coach edit tokens, reduced remaining orange glow. `npm run build` passed with existing NFT/edge/VAPID warnings.


## 2026-05-27 05:16 CST — P3 Production QA Checklist established
- User formally switched Hermes role to UniCoach Stability + Product QA Lead.
- Created `/mnt/d/Codex/AMIKE/platform/P3_VISUAL_QA.md` as the production QA checklist and living visual/mobile QA record.
- Checklist covers 390px/430px viewport, bottom nav safe area, sticky CTA, Discover swipe feel, Coach Detail hierarchy, typography/spacing/animation consistency, loading skeletons, empty states, overflow, long text handling, keyboard overlap, and scroll smoothness.
- Added explicit design-token, spacing scale, glow usage, and typography hierarchy consistency checks.
- Recorded current verified pages, known authenticated screenshot limitations, coach dashboard mock stats risk, and next production-level polish order.
- No feature/API/DB/schema/booking/payment/auth/notification/rebook changes were made.


## 2026-05-31 00:44:49 CST — Dev server startup/status check
- Scope: server 啟動與 localhost 狀態檢查；未改程式碼、未新增功能、未改 DB。
- 初始 `ps aux | grep "next"` 未找到現有 Next dev server；依使用者要求在 `/mnt/d/Codex/AMIKE/platform` 執行 `npm run dev`。
- `npm run dev` 啟動為背景程序：Hermes session `proc_b79efb3f7761`，PID 4517；Next dev command `next dev --webpack -p 4000`，node PID 4580，next-server PID 4598。
- 初次 curl 在 server 尚未 ready 時 connection refused/timeout；等待後 `ss -ltnp` 顯示 `*:4000` listening。
- 驗證結果：`curl -I http://127.0.0.1:4000/` 200；`curl -I http://127.0.0.1:4000/seed` 200；`curl -I http://127.0.0.1:4000/login` 200；`curl -I http://localhost:4000/seed` 200。
- 背景 dev server 仍在執行；未觀察到 stdout/stderr 錯誤輸出。

2026-05-31 01:07:23 CST 使用者回報未登入在聊天室空狀態點『開始找教練』應跳出/顯示請先註冊。已依 A 方案修正 app/chat/page.js：讀取 AuthProvider 的 authLoading，未登入時不呼叫聊天房間 API，空狀態文案改為請先註冊/登入後才能使用訊息功能，CTA 改為『請先註冊』並導向 /register?redirect=/chat；新增 tests/chat-guest-register-cta.test.mjs。備份：_hermes_backups/chat_guest_register_20260531_010229/page.js。驗證：node --test tests/chat-guest-register-cta.test.mjs 通過；node --check app/chat/page.js 通過；curl http://localhost:4000/chat 回 200；npm run build 首次因 WSL sharp optional runtime 缺失失敗，執行 npm install --include=optional sharp 後 node require sharp 通過，npm run build 通過（仍有既有 Turbopack NFT warning 與 VAPID 未設定警告）。
2026-05-31 01:20 CST 使用者補充截圖：在 /chat 未登入空狀態點『開始找教練』進入短影音探索頁。判斷原因是瀏覽器仍載入修正前的舊 client bundle（截圖仍顯示舊文案/舊按鈕），舊按鈕會導到 /coaches，而目前 /coaches 已是沉浸式教練/服務 feed，所以看起來像探索影片頁。已重啟 localhost:4000 Next dev server，curl /chat 回 200；請使用者重新整理 /chat 後按鈕應顯示『請先註冊』並導向 /register?redirect=/chat。
2026-05-31 01:35 CST 使用者要求收藏頁未登入點『瀏覽教練』也導向註冊頁。已新增 tests/favorites-guest-browse-register-cta.test.mjs 先 RED，備份 app/favorites/page.js -> _hermes_backups/favorites_guest_register_20260531_013446/app/favorites/page.js，修改 app/favorites/page.js 使用 AuthProvider 判斷 guest；未登入時『瀏覽教練』按鈕文字改『請先註冊』並導向 /register?redirect=/coaches，登入後仍導向 /coaches；探索短影音按鈕維持 /explore。驗證：favorites focused test 通過、chat guest test 通過、node --check app/favorites/page.js 通過、curl /favorites 200、npm run build 通過（仍有既有 Turbopack NFT/VAPID 警告）。Patch: _hermes_patches/favorites_guest_register_20260531.patch。
2026-05-31 01:57 CST 使用者依截圖確認只改『我要找教練』『籃球』『數學』『瀏覽教練』：未登入導到註冊頁，登入後保留原本 coaches/分類導向；不改『探索短影音』與底部首頁/探索。已新增 tests/home-guest-coach-discovery-register-cta.test.mjs 先 RED；備份 app/page.js -> _hermes_backups/guest_register_coach_buttons_20260531_015707/app/page.js；修改 app/page.js 新增 getCoachDiscoveryHref(sport)，hero CTA『我要找教練』與熱門分類卡（如籃球/數學）未登入導向 /register?redirect=<encoded coaches path>，登入後仍去 /coaches 或 /coaches?sport=...；QR onboarding 教練選項同步使用同一 helper。收藏頁『瀏覽教練』維持既有 /register?redirect=/coaches guest 行為。驗證：home focused test 通過、favorites focused test 通過、node --check app/page.js/app/favorites/page.js 通過、curl /、/favorites、/register?redirect=%2Fcoaches 均 200、npm run build 通過（仍有既有 Turbopack NFT/VAPID 警告）。Patch: _hermes_patches/guest_register_coach_buttons_20260531_015707.patch。
2026-06-01 02:13 CST 使用者要求進入「產品真實感優化」階段，不新增大型功能，先處理內容密度、減少紫色 glow/重陰影、卡片變薄、聊天室預約平台感、收藏頁非空狀態、我的頁從表單改為 Profile/Nike-style、Discover 弱化社群 icon 並強化預約。已新增 tests/product-realism-ui-density.test.mjs 先 RED；備份 app/globals.css、app/favorites/page.js、app/chat/page.js、app/dashboard/user/edit/page.js、components/VideoFeed.js 到 _hermes_backups/product_realism_20260601_021332/。UI-only 修改：收藏頁改為最近看過/平台正在發生/熱門教練/猜你會喜歡/正在爆紅，優先 fetch /api/coaches 並保留 guest 註冊導向；全局 tokens 改近黑背景、深藍灰卡片、18px radius、較淡 shadow、橘色 CTA；聊天室列表加入預約狀態卡、下次上課、課程名稱、已付款、體驗課提醒；我的頁加入 Profile Hero、我的課程、優惠券與推薦碼，帳號設定表單改為 details 摺疊；Discover VideoFeed 縮小 Heart/Bookmark、加入本週可約/教學風格 context，預約 CTA 保留主行動。驗證：node --test tests/product-realism-ui-density.test.mjs 通過；node --test tests/home-guest-coach-discovery-register-cta.test.mjs tests/favorites-guest-browse-register-cta.test.mjs tests/chat-guest-register-cta.test.mjs 通過；node --check app/favorites/page.js app/chat/page.js app/dashboard/user/edit/page.js components/VideoFeed.js 通過；npm run build 通過（既有 Turbopack NFT/VAPID 警告仍存在）；curl /、/favorites、/chat、/dashboard/user/edit、/explore 均 200。Patch: _hermes_patches/product_realism_ui_density_20260601_021332.patch。
2026-06-01 02:33 CST 使用者要求下一輪產品打磨專注「平台呼吸感」與「真人感」，不新增大型功能。已新增 tests/product-breathing-humanity.test.mjs 先 RED；備份 app/favorites/page.js、app/dashboard/user/edit/page.js、components/VideoFeed.js、components/Navigation.js、app/globals.css 到 _hermes_backups/product_breathing_20260601_023306/。UI-only 修改：收藏頁加入克制動態層（幾分鐘前、剛剛上線、本週熱門、今晚可預約、剛新增影片、正在確認時段、還剩 2 個名額、5 人正在觀看）與 persona 文案（英文陪聊、數學救援、籃球板凳到先發、零基礎友善）；Discover VideoFeed 加入教練 persona helper 與本週/今晚可約、5 人正在觀看標籤；我的頁加入下次課程、最近預約、最近觀看、體驗課狀態、已讀/正在確認時段；Navbar icon 從 24px 收到 22px、stroke/opacity/active lift 與底部 dock shadow/glow 進一步收斂。驗證：node --test tests/product-breathing-humanity.test.mjs 通過；product-realism/guest CTA regression tests 通過；node --check app/favorites/page.js app/dashboard/user/edit/page.js components/VideoFeed.js components/Navigation.js 通過；npm run build 通過（既有 Turbopack NFT/VAPID 警告仍存在）；curl /、/favorites、/dashboard/user/edit、/explore、/chat 均 200。Patch: _hermes_patches/product_breathing_humanity_20260601_023306.patch。


## 2026-06-01 02:55 CST — Core Transaction Audit

- Request: audit UniCoach core transaction chain: Discovery → Booking → Payment → Lesson Completion → Retention; do not add large features; do not change DB schema; do not change payment/booking core code.
- Scope: read-only code audit plus documentation output.
- Reviewed key files/routes:
  - `app/coaches/page.js`, `app/coaches/[id]/page.js`
  - `app/book/[id]/page.js`, `app/bookings/page.js`
  - `app/api/services/route.js`, `app/api/services/[id]/route.js`
  - `app/api/bookings/route.js`, `app/api/bookings/[id]/status/route.js`
  - `app/api/bookings/[id]/report-payment/route.js`, `app/api/bookings/[id]/confirm-payment/route.js`
  - `app/api/chat/route.js`, `app/api/chat/rooms/route.js`, `app/api/chat/rooms/[id]/route.js`
  - `app/reports/[bookingId]/page.js`, `app/api/lesson-logs/route.js`
  - `lib/bookingWorkflow.js`, `lib/bookingSecurity.js`
  - `supabase_migration_booking_completion.sql`, `supabase_migration_settlements_rpc.sql`
- Created audit artifact: `CORE_TRANSACTION_AUDIT.md`.
- Classification summary:
  - A completed: discovery basics, service binding, server-side booking validation, pending-payment flow, admin payment confirmation, completion status machine, referral/coupon/trial/rebook foundations.
  - B half-complete: visible slot UX, payment/booking detail copy, cancellation/refund explanation, dispute/auto-complete copy, student-facing lesson log visibility.
  - C missing: payment modal final trust copy, refund/cancellation copy, location confirmation copy, full-amount vs deposit wording alignment, fake paid state in chat, broader anti-off-platform-chat guard, lesson-log route confirmation.
  - D deferred: full dispute center, full slot picker, course package purchase/nuclear accounting, growth dashboards, animations/live labels.
- Recommended next P0 batch:
  1. Neutralize hard-coded `/chat` paid/course status.
  2. Add payment modal platform escrow / no private transfer / refund review copy.
  3. Add booking-page cancellation/refund/location confirmation copy.
  4. Align MVP copy to full payment held by platform unless product explicitly chooses deposit flow.
  5. Confirm/fix `/lesson-logs` student destination or point notifications to `/bookings`.
- Backup before session-log edit: `_hermes_backups/core_transaction_audit_20260601_025502/platform-session.md`.


## 2026-06-01 04:06 CST — UI Micro Polish + Transaction Experience Polish

- Scope: UI micro-polish only. Transaction logic, booking/payment core routes, and DB schema stayed frozen.
- Backups: `_hermes_backups/ui_micro_polish_20260601_035912/`.
- Added focused regression: `tests/ui-micro-polish-transaction-experience.test.mjs` covering micro-polish tokens, transaction/payment hierarchy, coach verification badge, Discover hierarchy, Chat rhythm, and restrained learning activity.
- Changed UI files: `app/globals.css`, `app/book/[id]/page.js`, `app/bookings/page.js`, `app/chat/page.js`, `app/chat/[id]/page.js`, `app/coaches/page.js`, `app/coaches/[id]/page.js`, `app/dashboard/user/page.js`.
- Transaction polish: booking summary now reads as a real pending transaction; payment modal gained a lightweight three-step flow (`待付款` / `確認中` / `已付款`) and uses centralized pending/confirmed/paid status tokens.
- Typography/card polish: global secondary/caption text opacity reduced; card radius/shadows tightened; chat/system/timestamp text made quieter; hover effects reduced from glow/scale to smaller lift/opacity.
- Discover/Profile polish: Discover copy/overlay moved toward MasterClass-style persona headline and CTA hierarchy; profile/dashboard adds restrained `學習活動` with 本週課程、下次預約、最近觀看 without creating an admin dashboard.
- Verification: focused UI test passed (6/6); core transaction trust + UI tests passed (9/9); `npm run build` passed with existing Turbopack NFT and VAPID warnings; HTTP smoke returned 200 HTML for `/bookings`, `/chat`, `/coaches`, `/dashboard/user`, `/book/test-service-id`, `/chat/test-room-id`, `/coaches/test-coach-id` against existing localhost:4000 server.
- Notes: attempted `next start -p 4000` could not start because port 4000 was already in use; reused existing healthy server for smoke tests.


---
[2026-06-01 04:30:02] P0-4/P0-5 Payment Copy + Lesson Logs Route

Scope:
- Stopped further UI polishing; handled only P0-4 payment semantics and P0-5 student lesson-log destination.
- No DB schema changes and no booking/payment core-code changes.

Payment flow finding:
- UI/report-payment flow uses bookings.final_price as the amount students are asked to transfer.
- deposit_paid is still calculated/stored as 30% derived financial metadata, but current student payment UI and admin confirmation flow do not operate as a deposit+balance checkout.
- Therefore the minimum copy fix uses the single narrative: full payment is held by the platform.

Changes:
- app/book/[id]/page.js: relabeled price/escrow copy to "全額付款金額" and "全額付款由平台保管".
- app/bookings/page.js: relabeled list amount, pending-payment helper, payment modal amount, escrow bullet, and submit CTA to full-payment wording.
- app/lesson-logs/page.js: added minimal student-facing page for /lesson-logs?booking=... that fetches /api/lesson-logs?booking=... and renders rating, focus areas, feedback, and next step.
- tests/p0-payment-copy-lesson-logs-route.test.mjs: added focused regression for P0-4/P0-5.
- tests/core-transaction-trust-copy.test.mjs: updated escrow expectation to canonical full-payment copy.

Verification:
- RED confirmed before fix: P0-4 copy and missing /lesson-logs page failed.
- PASS: node --test tests/p0-payment-copy-lesson-logs-route.test.mjs tests/core-transaction-trust-copy.test.mjs tests/ui-micro-polish-transaction-experience.test.mjs (11/11).
- PASS: npm run build.
- PASS: HTTP smoke on fresh Next server port 4001: /bookings 200, /book/test 200, /lesson-logs?booking=test 200.

Backups:
- _hermes_backups/p0_payment_lesson_logs_20260601_041947/


## 2026-06-01 12:26 CST — Coach App Optimization read-only audit
- User requested Coach App Optimization audit only, no implementation.
- Read AGENTS.md, platform-session.md, coach dashboard/plans/schedule/bookings/earnings/profile pages, navigation/onboarding components, and related coach/bookings/services/unread/reports APIs.
- Created `COACH_APP_AUDIT.md` with findings across coach homepage, services/plans, scheduling, bookings, earnings, trust/conversion, A/B/C/D classification, top 5 issues, minimum viable fixes, UI reorder needs, fake data removal, and booking-impacting flows.
- No production code, DB schema, payment core, or booking core was modified.
- Backed up `platform-session.md` under `_hermes_backups/coach_app_audit_20260601_122705/`.


## 2026-06-01 13:12 CST — Coach Dashboard P1-A today workbench
- Scope followed: modified `/dashboard/coach` only plus focused regression test `tests/coach-dashboard-p1a-today-workbench.test.mjs`; no DB schema, booking/payment core, bookings page, coach plans/schedule, earnings, referral, wallet, or analytics changes.
- Replaced misleading dashboard mock metrics with safe operational empty states: `尚無完成課程`, `尚無學生資料`, `尚未建立可接單服務`.
- Promoted first screen to `今日待辦` workbench: today bookings, unread messages, pending orders, pending payment reminders, and pending lesson-report/log work; empty state says `今天還沒有待辦，先確認你的服務與時段是否已開放。`.
- Added lightweight best-effort receiving-orders checklist using existing profile/coach data plus existing `/api/coach/plans` and `/api/coach/availability`; no new DB fields.
- Verification: focused Node regression test passed; `npm run build` passed with existing Turbopack NFT warning and VAPID-not-configured warnings; route smoke via `npx next start -p 4001` then `curl -I http://127.0.0.1:4001/dashboard/coach` returned HTTP 200. Browser smoke was blocked by missing Playwright Chromium system library `libnspr4.so`, so curl/build were used instead.


## 2026-06-01 15:12 CST — Coach Bookings P1-C status workbench
- Scope followed: `/bookings` coach-facing UI/copy/client-side grouping only plus focused regression test `tests/coach-bookings-status-workbench.test.mjs`; no DB schema, booking/payment status machine, payment core, earnings, wallet, refund, or chat backend changes.
- Added coach status filter chips for: `待付款`, `待確認`, `待上課`, `進行中`, `待完課確認`, `待填課後日誌`, `已完成`, `爭議中`, `已取消`, using existing booking.status best-effort mapping.
- Added per-card `下一步` guidance and coach CTA hierarchy: `前往聊天`, `填寫課後日誌`, `確認完課`, `查看訂單`; price adjustment remains lower-priority below operational next-step guidance.
- Updated coach-readable status labels: `scheduled/confirmed -> 待上課`, `pending_payment -> 待學生付款`, `pending_completion -> 待完課確認`, `completed -> 已完成`, `cancelled/refunded/expired -> 已取消`, `dispute/disputed -> 爭議中`.
- Updated coach empty state to: `目前還沒有預約。確認你的課程方案、可上課時段與公開教練頁已完成，學生就能開始預約你。`
- Verification: RED observed first for the new focused test; after implementation `node --test tests/coach-bookings-status-workbench.test.mjs` passed (4/4). `npm run build` passed with the existing Turbopack NFT warning and VAPID-not-configured warnings. Fresh server smoke via `npx next start -p 4003` and `curl -I http://127.0.0.1:4003/bookings` returned HTTP 200.
- Backups: `_hermes_backups/coach_bookings_p1c_20260601_150050/`.
- Patch: `_hermes_patches/coach_bookings_p1c_code_only_20260601_151345.patch`.


## 2026-06-01 17:08 P1-E Coach Profile / Public Coach Page Completeness
- Scope: audit + minimal UI/copy only; no DB schema, booking/payment core, earnings/wallet/ranking additions.
- Modified app/coach/profile/edit/page.js: added public profile guidance copy, draft-only FB AI import copy, and lightweight profile completeness checklist driven by real form fields/status.
- Modified app/coaches/[id]/page.js: added public profile snapshot rows, safe incomplete-data fallback, visible chat CTA copy, verification status, and removed fake public metrics/media fallbacks from the page source.
- Added tests/coach-profile-public-completeness.test.mjs: focused checks for AI import draft-only behavior, checklist existence, safe missing-data copy, and no fake public content.
- Verification: node focused tests PASS; prior P1 regression tests PASS; npm run build PASS; smoke /coach/profile/edit and /coaches/p1e-smoke-coach both 200.


## 2026-06-01 17:57 Phase 2 Real User Validation MVP hardening
- Scope kept intentionally small: no wallet, no AI agent, no ranking, no gamification, no analytics, no booking/payment schema rewrite.
- Replaced `scripts/seed_premium_coaches.mjs` with 5 real-user-validation coach profiles: 校隊型、陪伴型、零基礎友善型、成績提升型、健身陪練型. Removed embedded service-role fallback and fake rating/completed lesson seed values; script now requires local env secrets.
- Landing `/` now lets first-time students browse coaches before registration, clarifies “真人大學生教練”, “先聊聊再預約”, beginner reassurance, and platform payment trust.
- Discovery `/coaches` now removes stock photo / placeholder / 5.0 rating fallbacks, uses safe media fallback, shows “尚無評價”, and fixes “先聊聊” CTA to chat instead of a non-existent booking path.
- Service detail `/service/[id]` now removes stock hero and fake trust defaults (“1 小時內 / 高完課率 / 高續課率 / 5.0 / 0 堂”), shows safe insufficient-data copy, and makes chat CTA visible as “先聊聊”.
- Added `tests/phase2-real-user-validation.test.mjs`; RED observed, then PASS.
- Verification: `node --check scripts/seed_premium_coaches.mjs` PASS; `node --test tests/phase2-real-user-validation.test.mjs tests/coach-profile-public-completeness.test.mjs` PASS 10/10; `npm run build` PASS with existing Turbopack NFT and VAPID warnings; smoke on port 4006 for `/`, `/coaches`, `/service/p2-smoke-service`, `/book/p2-smoke-coach?service=p2-smoke-service`, `/bookings`, `/lesson-logs` all HTTP 200.


## 2026-06-01 18:49 Phase 2-B 真人教練素材與測試流程準備
- Scope: documentation only. No DB, booking/payment, UI, feature, AI agent, ranking, wallet, or analytics changes.
- Created `COACH_CONTENT_CHECKLIST.md`: coach content intake checklist for 3–5 real college coaches, including basic profile, teaching fit, experience/philosophy, persona headline, photos/video, FB intro post, and platform participation willingness.
- Created `COACH_VIDEO_GUIDE.md`: casual 20–30 sec vertical video guide with scripts for sports coach, academic tutor, and companion/reading coach plus lighting/audio/background/clothing rules.
- Created `STUDENT_TEST_FLOW.md`: 5-student/parent validation walkthrough from homepage → coaches → detail → chat → booking → payment explanation → feedback, with observation prompts and required questions.
- Created `USER_TEST_NOTES_TEMPLATE.md`: copyable test note template covering identity, age, desired course, first impression, friction, trust concerns, coach choice, chat/booking/payment willingness, suggested changes, and important quotes.
- Verification: checked required files exist and key required phrases are present; no code/build run needed because only markdown docs were added.


## 2026-06-02 Phase 2-D First Real Usage Preparation
- Scope: documentation only. No DB, booking/payment core, UI, discover, feature, ranking, AI flow, or analytics changes.
- Created `REAL_COACH_CONTENT_TEMPLATES.md`: 3 direct-to-onboard real coach content templates for sports coach, academic tutor, and companion/reading coach, including persona headline, intro, first-lesson plan, fit, chat opening, 20-sec video script, and photo suggestions.
- Created `REAL_CHAT_EXAMPLES.md`: realistic Taiwan college-style first-chat examples for sports, English/math, and companion reading flows, including student openings, coach replies, asking level/location, lowering awkwardness, and safer first booking language.
- Created `PAYMENT_TRUST_REWRITE.md`: payment-before-trust rewrite plan for a future minimal copy-only iteration if tests confirm payment fear, covering coach no-show, refund/change, avoiding private transfer, platform collection, and scam concerns.
- Created `REAL_PLATFORM_SIGNAL_CHECKLIST.md`: real-platform signal checklist by homepage, coach cards, detail page, chat, booking, payment, and post-lesson, plus top 10 real signals and top 10 demo-smell risks.
- Verification: confirmed all 4 files exist and counted line totals; no build/test run needed because only markdown docs were added.


## 2026-06-02 09:30 CST — Phase 2 P0 real-platform fixes
- Scope limited to requested P0 real-platform corrections: service detail CTA null safety, public feed incomplete-data filtering, fake rating/completed-lessons normalization, profile edit de-dashboard/affiliate feel, and minimal payment trust copy. No DB schema, booking/payment core, wallet, ranking, analytics, gamification, AI flow, or dashboard polish was added.
- Backups created before edits: `_hermes_backups/real_platform_p0_20260602_091911/`.
- Modified files: `app/api/services/route.js`, `app/api/services/[id]/route.js`, `app/service/[id]/page.js`, `app/coaches/page.js`, `app/coach/profile/edit/page.js`, `app/bookings/page.js`, `tests/real-platform-p0.test.mjs`, `tests/core-transaction-trust-copy.test.mjs`.
- API public feed now filters incomplete public records before formatting: missing title/introduction, literal `未填寫`, empty city/location, or empty coach name.
- Service detail CTA now uses `service.coach.user_id || service.coach.id`; when both are absent, CTA is disabled and displays `教練資料尚未完成`.
- Trust metrics normalized: no fallback `5.0`; rating is shown only when `review_count > 0`; completed lesson count is shown only when `completed_lessons > 0`.
- Coach profile edit now foregrounds public listing readiness and does not surface wallet/referral/withdrawal affiliate blocks in the first coach-facing edit flow.
- Payment modal copy minimally answers: coach no-show, coach not confirmed, dispute handling, and rough refund handling, while keeping payment UI/core unchanged.
- Verification: `node --test tests/real-platform-p0.test.mjs tests/phase2-real-user-validation.test.mjs tests/coach-profile-public-completeness.test.mjs tests/p0-payment-copy-lesson-logs-route.test.mjs tests/core-transaction-trust-copy.test.mjs` passed 20/20; `npm run build` passed; production smoke on port 4010 returned 200 for `/`, `/coaches`, `/coach/profile/edit`, `/bookings`, `/api/services`.
- Patch generated: `_hermes_patches/real_platform_p0_code_only_20260602_093035.patch`.

## 2026-06-02 09:45 CST — First Real Coach Onboarding documentation packet
- Scope: documentation only. No app code, DB, booking/payment, UI polish, dashboard, or new feature work.
- Created `FIRST_COACH_ONBOARDING_PACKET.md`: first-coach data collection, minimum required data, later-fill items, 20-30 second scripts for sports/academic/陪讀, profile examples, and pre-launch checklist.
- Created `FIRST_COACH_MESSAGE_TEMPLATES.md`: LINE/IG/in-person invite scripts and replies for hassle, fees, student sourcing, and platform-held payment safety questions.
- Created `FIRST_STUDENT_TEST_PACKET.md`: first-student recruiting script, test tasks, observation guide, question list, payment-page pause questions, and distrust-moment recording template.
- Created `FIRST_REAL_CASE_CRITERIA.md`: success levels and criteria for the first real coach/student case, including material willingness, message replies, chat intent, booking intent, payment trust, and one-completed-lesson as above-expectation success.
- Verification: `wc -l` confirmed all four docs exist (1396 total lines); `git diff --check` passed for the new docs.

## 2026-06-02 10:05 CST — First Real Human Usage Phase docs
- Scope:真人營運與測試文件 only. No app code, DB, booking/payment, UI redesign, dashboard polish, or new feature work.
- Created `REAL_COACH_ONBOARDING_TRACKER.md` to track first real coaches: materials, profile readiness, chat willingness, student inquiries, first lesson status, stuck points, and coach verbatims.
- Created `REAL_STUDENT_TEST_TRACKER.md` to log first real student tests: desired learning goal, first clicked coach, stop points, distrust points, chat/booking/payment willingness, and key verbatims.
- Created `TRUST_BREAK_LOG.md` to centralize all “不敢繼續” moments across homepage, coach page, chat, booking, payment, and lesson log.
- Created `FIRST_REAL_BOOKING_PLAYBOOK.md` to manually accompany the first real booking: coach confirmation, student payment explanation, no private transfer reminders, awkwardness prevention, first lesson log, and first real feedback collection.
- Verification: `wc -l` confirmed all four docs exist (1278 total lines); `git diff --check` passed for the new docs.

## 2026-06-02 10:33 — Onboarding/auth bottom nav hidden

User request: minimal fix so onboarding / auth / first-entry / welcome flows stay as single-task screens and do not show global bottom navigation.

Scope kept intentionally small:
- Updated `components/ConditionalShell.js` with `TASK_FLOW_ROUTES` and `isTaskFlowRoute` so auth/onboarding/first-entry routes render without global header/content/nav shell.
- Updated `components/Navigation.js` with the same task-flow guard so bottom nav returns null if rendered directly on those routes.
- Added focused regression test `tests/auth-onboarding-nav-visibility.test.mjs`.

Hidden route prefixes covered:
- `/login`, `/register`, `/reset-password`, `/onboarding`, `/welcome`, `/role-select`, `/first-entry`, `/match`

Explicitly retained app routes in regression guard:
- `/dashboard`, `/coaches`, `/bookings`, `/chat`, `/coach/schedule`, `/coach/profile/edit`

Verification:
- RED confirmed before fix: `node --test tests/auth-onboarding-nav-visibility.test.mjs` failed on missing task-flow guard.
- GREEN: `node --test tests/auth-onboarding-nav-visibility.test.mjs` passed.
- Adjacent regression + build passed: `node --test tests/auth-onboarding-nav-visibility.test.mjs tests/phase2-real-user-validation.test.mjs tests/real-platform-p0.test.mjs && npm run build`.
- Production HTTP smoke on port 4011 returned 200 for `/login`, `/register`, `/reset-password`, `/match`, `/dashboard/coach`, `/coaches`, `/bookings`, `/chat`, `/coach/schedule`, `/coach/profile/edit`.
- Browser visual smoke was not possible because local Playwright Chromium failed to launch due missing `libnspr4.so`; not counted as verified.

Backups:
- `_hermes_backups/onboarding_nav_hide_20260602_102546/`

Patch:
- `_hermes_patches/onboarding_nav_hide_code_only_20260602_103219.patch`


## 20260603_134355 - Task-flow mobile scroll / IG WebView minimal fix
- Scope: Minimal scroll-container fix for /match and task-flow routes; no onboarding redesign and no bottom nav restoration.
- Files changed: app/globals.css, app/match/page.js, tests/auth-onboarding-nav-visibility.test.mjs.
- Backup: _hermes_backups/task_flow_scroll_ig_20260603_133524/.
- Patch: _hermes_patches/task_flow_scroll_ig_code_only_20260603_134355.patch.
- Root cause: task-flow routes render without the normal main.content scroll surface; .task-flow-content had overflow-y auto but lacked safe-area bottom padding, body/mobile-container did not explicitly allow vertical scroll fallback, and /match still used 100vh instead of 100dvh.
- Tests: node --test tests/auth-onboarding-nav-visibility.test.mjs PASS; npm run build PASS; HTTP smoke /match 200 with task-flow-content present and bottom-nav absent. Existing tests/match-page-static.test.mjs still fails on pre-existing outdated copy/query expectations, not this scroll fix.
- Visual smoke: Windows Edge headless 390x844 screenshot saved at _hermes_smoke/task_flow_scroll/match_390x844_wslip.png; screenshot shows /match task-flow page with no bottom nav. Automated scroll-to-bottom via browser CDP was blocked by WSL/Linux Chromium missing libnspr4 and Windows Edge remote-debugging limitations.


## 20260603_161448 - Bottom navigation mobile positioning fix
- Scope: Minimal CSS-only fix for bottom navigation being shifted left and floating too high on narrow mobile screens; no navigation redesign.
- Files changed: app/globals.css; added tests/bottom-nav-mobile-position.test.mjs.
- Backup: _hermes_backups/bottom_nav_mobile_position_20260603_155546/.
- Patch: _hermes_patches/bottom_nav_mobile_position_code_only_20260603_161448.patch.
- Root cause: @media (max-width: 400px) set .bottom-nav left/right to 8px while the base rule still applied transform: translateX(-50%), shifting the nav left. Base bottom offset also used 12px, making it float above the visual bottom.
- Fix: Keep mobile nav centered with left: 50%, right: auto, transform: translateX(-50%); move bottom to env(safe-area-inset-bottom, 0px).
- Tests: node --test tests/bottom-nav-mobile-position.test.mjs PASS; node --test tests/auth-onboarding-nav-visibility.test.mjs PASS; git diff --check PASS.
- Build: npm run build in the main D: repo is blocked by a pre-existing broken/locked node_modules state (next bin missing; npm ci hits EIO unlink on @next/swc-win32-x64-msvc). Clean Linux /tmp copy with npm ci + npm run build PASS.
- Visual smoke: Windows Edge headless 390x844 screenshot saved at _hermes_smoke/bottom_nav_mobile_position/chat_390x844.png; nav is at the visual bottom and no longer shifted left/floating high.


## 2026-06-04 17:09:15 — Wallet points / top-up hardening
- Fixed wallet balance reads to use `/api/auth/profile` and `data.profile.wallet_balance` in student wallet and booking pages.
- Tightened bank account last-5 validation to exactly five digits in UI and API.
- Changed admin top-up approve/reject APIs to accept only `requestId` and delegate to transaction RPCs.
- Changed wallet booking creation to delegate point deduction + booking creation to `create_wallet_booking_safe` transaction RPC.
- Added hardening SQL at `_hermes_patches/supabase_migration_wallet_points_hardening_20260604.sql` for post-initial-SQL Supabase migration.
- Added wallet transaction regression tests and updated payment-copy tests for direct wallet point deduction flow.
- Verification: focused wallet/top-up/booking tests passed; `npm run build` passed after rebuilding local node_modules. Full `node --test tests/*.test.mjs` still has unrelated pre-existing failures outside wallet scope.
- Note: a temporary dependency backup `node_modules.broken_20260604_164956/` remains because deleting it was blocked by safety confirmation.

## 2026-06-04 17:48:26 CST — P0-2 customPrice money-flow hardening
- User confirmed option A: fix P0-2 first, preventing client-controlled booking price/point deduction.
- Scope: minimal booking money-flow fix; did not address P0-1 wallet RPC scheduled/paid status consistency yet.
- Files changed this batch: `app/api/bookings/route.js`, `tests/wallet-points-transaction-hardening.test.mjs`, `tests/booking-security.test.mjs`, `tests/booking-performance-reliability.test.mjs`.
- Backup: `_hermes_backups/p0_2_custom_price_20260604_174410/` contains pre-edit copies of touched files.
- Fix: removed `customPrice` from booking POST destructuring, removed `pointsToPay` and pricing mutation, and now calculates `totalPointsToPay` from server-side `pricing.finalPrice * totalSessions` via `roundMoney(...)`.
- Tests: added RED regression test proving wallet booking price is server-calculated and source contains no `customPrice`/`pointsToPay`/pricing mutation; focused wallet + booking security/performance tests pass (18/18); `git diff --check` on touched files passes; `npm run build` passes with existing Turbopack imgbbApi NFT warnings and VAPID warnings.
- Full `NODE_OPTIONS=--no-warnings node --test tests/*.test.mjs` was attempted and still has unrelated pre-existing failures outside this batch (coach dashboard data / UI micro polish expectations); current batch tests pass.

## 2026-06-05 02:19:36 CST — P0-1 wallet RPC scheduled/paid consistency
- User confirmed option A: fix P0-1 next, aligning wallet point deduction with paid scheduled booking creation inside one DB transaction.
- Scope: `app/api/bookings/route.js`, `_hermes_patches/supabase_migration_wallet_points_hardening_20260604.sql`, `tests/wallet-points-transaction-hardening.test.mjs`.
- Backup: `_hermes_backups/p0_1_wallet_rpc_status_20260605_015009/` contains pre-edit copies of touched files.
- Fix: wallet booking payload now uses `status: 'scheduled'`, `payment_status: 'paid'`, and `payment_expires_at: null`; route validation allows wallet bookings to omit pending-payment expiry while retaining the stricter pending-payment RPC validation for non-wallet booking safety.
- SQL hardening: `create_wallet_booking_safe` no longer reuses `create_booking_safe` because that RPC only accepts `pending_payment`; the wallet RPC now performs service validation, coach/day advisory locking, overlap checks, wallet deduction, paid scheduled booking inserts, coupon redemption, and returns booking IDs in one transaction. The migration also idempotently ensures wallet/payment/service/rebook booking columns exist.
- Tests: wallet transaction hardening regression expanded to require paid scheduled wallet RPC behavior and no `create_booking_safe` reuse. Focused wallet/security/payment-copy tests pass (12/12); `git diff --check` on touched files passes; `npm run build` passes with existing Turbopack imgbbApi NFT warnings and VAPID warnings.

## 2026-06-05 02:38:51 CST — P0-3 JWT_SECRET production fail-closed
- User confirmed option A: fix JWT_SECRET production fail-open before continuing the production readiness audit.
- Scope: `lib/auth.js` plus new focused regression `tests/auth-production-hygiene.test.mjs`; no DB schema, booking/payment, wallet, settlement, rate-limit, or UI changes.
- Backup: `_hermes_backups/p0_3_jwt_secret_20260605_023236/` contains the pre-edit `lib/auth.js`.
- Fix: production now throws if `JWT_SECRET` is missing and rejects secrets shorter than 32 characters; the public local-development fallback remains available only when `NODE_ENV !== 'production'`.
- Tests: RED observed first for missing fail-closed behavior; GREEN verified with `NODE_OPTIONS=--no-warnings node --test tests/auth-production-hygiene.test.mjs`.
- Adjacent verification: `NODE_OPTIONS=--no-warnings node --test tests/auth-production-hygiene.test.mjs tests/auth-flow.test.mjs tests/auth-onboarding-nav-visibility.test.mjs` passed (13/13); `git diff --check -- lib/auth.js tests/auth-production-hygiene.test.mjs` passed; `JWT_SECRET=local_build_verification_secret_32_chars_minimum npm run build` passed with existing Turbopack imgbbApi NFT warnings, edge-runtime static-generation warning, and VAPID-not-configured warnings.
- Deployment note: Vercel production must have a strong `JWT_SECRET` of at least 32 characters before deploying this change; missing/weak secret will intentionally fail the build/runtime import instead of accepting forged cookies.

## 2026-06-05 03:05:13 CST — P0-4 paid settlement batch financial immutability
- User confirmed option A: fix settlement paid-batch immutability before continuing remaining production readiness findings.
- Scope: SQL guard hardening only plus focused regression; no API route, UI, booking, payment, wallet, or auth logic changes.
- Files changed: `supabase_migration_settlements_rpc.sql`, `supabase_migration_settlement_financial_guards.sql`, `tests/settlement-rules.test.mjs`.
- Backup: `_hermes_backups/p0_4_settlement_paid_immutable_20260605_025710/` contains pre-edit SQL/test files.
- Fix: `guard_settlement_batch_status_transition()` now rejects any update to paid settlement batches that changes `status`, `paid_at`, `total_amount`, or `booking_count`; pending->paid still validates linked booking count/coach payout totals before allowing paid status.
- Standalone guard migration: `supabase_migration_settlement_financial_guards.sql` now also installs `validate_settlement_batch()` plus the same immutable trigger so environments that apply that migration independently receive the DB-level guard.
- Tests: RED observed first for missing paid `total_amount`/`booking_count` immutability, then GREEN. `NODE_OPTIONS=--no-warnings node --test tests/settlement-rules.test.mjs tests/auth-production-hygiene.test.mjs` passed (8/8). `node --check lib/settlementRules.js && node --check tests/settlement-rules.test.mjs` passed. `git diff --check` on touched files passed.
- Build: `JWT_SECRET=local_build_verification_secret_32_chars_minimum npm run build` passed with existing Turbopack imgbbApi NFT warnings, edge-runtime static-generation warning, and VAPID-not-configured warnings.
- Patch generated: `_hermes_patches/p0_4_settlement_paid_immutable_20260605_030506.patch`.
- Deployment note: apply the settlement SQL in Supabase staging/local first, verify a paid batch cannot update `total_amount`/`booking_count`, then apply to production; do not run production SQL from chat without explicit deployment confirmation.

## 2026-06-05 03:28:15 CST — P1 rate limiter production fail-closed
- User confirmed option A: fix production rate-limit fail-open before continuing remaining production readiness findings.
- Scope: `lib/rateLimit.js`, `proxy.js`, and new focused regression `tests/rate-limit-fail-closed.test.mjs`; no DB schema, booking/payment, wallet, settlement, or UI changes.
- Backup: `_hermes_backups/p1_rate_limit_fail_closed_20260605_032117/` contains pre-edit `lib/rateLimit.js`, `proxy.js`, and any prior test file if present.
- Fix: missing Upstash Redis env in production now creates a fail-closed limiter result instead of an allow-all limiter; Redis `.limit()` errors are safely logged with `safeErrorDetails(error)` and fail closed in production while retaining dev/local fail-open behavior.
- Proxy hardening: `proxy.js` now applies rate limiting to all `/api/:path*` requests instead of unconditional `NextResponse.next()`; login/register use strict limiter, forgot/reset password use password-reset limiter, and other API routes use general limiter. Exceeded requests return 429; unavailable limiter infrastructure returns 503.
- Tests: RED observed first for missing fail-closed limiter, Redis-error fail-closed handling, and proxy unconditional pass-through. GREEN: `NODE_OPTIONS=--no-warnings node --test tests/rate-limit-fail-closed.test.mjs tests/auth-production-hygiene.test.mjs tests/settlement-rules.test.mjs` passed (11/11). `node --check lib/rateLimit.js && node --check proxy.js && node --check tests/rate-limit-fail-closed.test.mjs` passed. `git diff --check` on touched files passed.
- Build: `JWT_SECRET=local_build_verification_secret_32_chars_minimum npm run build` passed with existing Turbopack imgbbApi NFT warnings, edge-runtime static-generation warning, and VAPID-not-configured warnings.
- Patch generated: `_hermes_patches/p1_rate_limit_fail_closed_20260605_032814.patch`.
- Deployment note: production must configure valid `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` before deploying this change; otherwise API calls intentionally return 503 rather than running unprotected.


## 2026-06-05 — Support + wallet integrated V2 planning
- User provided V2 plan to merge manual wallet top-up with global support chat screenshot workflow.
- Read `AGENTS.md`, current wallet page, root layout, existing admin topup approve route, and SQL/test file inventory.
- Created refined TDD implementation plan at `docs/plans/support-wallet-integrated-v2-implementation-plan.md`.
- No production source/API/SQL migration was modified yet; next step requires user confirmation before starting RED tests and scaffolding.


## 2026-06-05 — Support + wallet integrated V2 skeleton implemented
- User confirmed option A: implement RED tests + SQL/API security skeleton before UI.
- Created backup directory `_hermes_backups/support_wallet_v2_skeleton_20260605_190613`.
- Added `tests/support-wallet-v2-safety.test.mjs`; RED observed missing SQL/routes, then GREEN after implementation.
- Added additive migration `supabase_migration_support_wallet_v2.sql` with private `support_images` bucket setup, `support_messages`, `support_wallet_grants`, RLS policies, storage object policies, and `grant_wallet_points_from_support` RPC using `FOR UPDATE` plus `UNIQUE(support_message_id)` idempotency. SQL not applied to Supabase.
- Added API skeletons: `app/api/support/send/route.js`, `app/api/support/history/route.js`, `app/api/admin/support/conversations/route.js`, `app/api/admin/support/grant-points/route.js`; grant route calls RPC and never directly updates wallet balance.
- Verification: `node --test tests/support-wallet-v2-safety.test.mjs tests/wallet-points-transaction-hardening.test.mjs tests/rate-limit-fail-closed.test.mjs` passed 13/13; `node --check` passed for new routes; `git diff --check` passed for touched files; `JWT_SECRET=local_build_verification_secret_32_chars_minimum npm run build` succeeded with existing Turbopack/VAPID warnings.
- Patch generated: `_hermes_patches/support_wallet_v2_skeleton_full_20260605_191558.patch`.


## 2026-06-05 19:27:43 - Wallet support screenshot entry UI (B)
- User selected B: update user wallet page only, remove legacy amount / bank last-5 submission form, and replace with support screenshot reporting guidance.
- Added RED static test: tests/wallet-support-entry-ui.test.mjs.
- Updated wallet transaction hardening test so wallet UI now asserts no legacy topup POST/form while API route still keeps strict bank-last-5 validation for backward/admin compatibility.
- Modified app/dashboard/user/wallet/page.js: keeps balance card and bank account copy, removes local topup form state/submit, adds客服截圖回報 instructions and /chat contact CTA.
- Backup: _hermes_backups/wallet_support_entry_20260605_192041
- Verification: NODE_OPTIONS=--no-warnings node --test tests/wallet-support-entry-ui.test.mjs tests/wallet-points-transaction-hardening.test.mjs tests/support-wallet-v2-safety.test.mjs => 12/12 pass.
- Verification: node --check wallet page + touched tests, git diff --check, and JWT_SECRET=local_build_verification_secret_32_chars_minimum npm run build => pass. Existing build warnings remain from imgbb dynamic fs tracing, VAPID keys, and edge runtime static generation.


## 2026-06-05 19:46:44 - SupportChatWidget global screenshot support entry (C)
- User selected C: add global support widget / screenshot upload entry.
- Added RED static test: tests/support-chat-widget-ui.test.mjs; verified it failed because layout/widget/upload route were missing.
- Added components/SupportChatWidget.js: authenticated floating客服中心 widget, hidden on auth/task-flow routes, loads /api/support/history, uploads PNG/JPG/WebP screenshots up to 5MB to /api/support/upload, then posts message/imagePath to /api/support/send.
- Added app/api/support/upload/route.js: nodejs dynamic route, requireAuth(), validates image MIME/size, writes user-owned `${auth.user.id}/support-...` paths to private support_images bucket with upsert:false, returns imagePath only (no public URL).
- Mounted <SupportChatWidget /> inside AuthProvider in app/layout.js without replacing ConditionalShell/navigation.
- Backup: _hermes_backups/support_chat_widget_20260605_194001
- Verification: NODE_OPTIONS=--no-warnings node --test tests/support-chat-widget-ui.test.mjs tests/wallet-support-entry-ui.test.mjs tests/wallet-points-transaction-hardening.test.mjs tests/support-wallet-v2-safety.test.mjs tests/rate-limit-fail-closed.test.mjs => 18/18 pass.
- Verification: node --check components/SupportChatWidget.js app/api/support/upload/route.js app/layout.js tests/support-chat-widget-ui.test.mjs; git diff --check; JWT_SECRET=local_build_verification_secret_32_chars_minimum npm run build => pass. Existing warnings remain from imgbb dynamic fs tracing, missing VAPID keys, and edge runtime static generation.


## 2026-06-05 19:49:57 - Support Wallet V2 Supabase manual execution checklist (E)
- User selected E: review support wallet SQL and prepare Supabase manual execution checklist.
- Read AGENTS.md, supabase_migration_support_wallet_v2.sql, support safety tests, and support API routes.
- Created docs/plans/support-wallet-v2-supabase-manual-execution-checklist.md with preflight checks, manual execution steps, post-check SQL for bucket/tables/indexes/RLS/policies/RPC, runtime smoke tests, idempotency checks, and recovery notes.
- Review finding before production execution: recommend tightening support_images bucket to match app upload constraints by removing image/gif and changing file_size_limit from 10MB to 5MB; also fix comment path wording from support-images/{user_id}/... to {user_id}/...
- Verification: NODE_OPTIONS=--no-warnings node --test tests/support-wallet-v2-safety.test.mjs tests/support-chat-widget-ui.test.mjs tests/wallet-support-entry-ui.test.mjs => 8/8 pass.
- Verification: git diff --check on the new checklist/session paths => pass.


## 2026-06-05 19:53:21 - Tighten Support Wallet V2 SQL bucket constraints (A)
- User selected A: tighten `supabase_migration_support_wallet_v2.sql` before Supabase manual execution.
- Added RED assertions to `tests/support-wallet-v2-safety.test.mjs` requiring support_images bucket to match app upload constraints: 5MB, PNG/JPG/WebP only, no GIF, and corrected `{user_id}/...` path wording.
- Verified RED failed against old SQL (`10485760`, `image/gif`, `support-images/{user_id}/...`).
- Backup: `_hermes_backups/support_wallet_v2_sql_tighten_20260605_195147`.
- Updated `supabase_migration_support_wallet_v2.sql`: `file_size_limit` from `10485760` to `5242880`, removed `image/gif`, corrected bucket path comment.
- Updated `docs/plans/support-wallet-v2-supabase-manual-execution-checklist.md` to reflect P1 tightening is now already applied.
- Verification: `NODE_OPTIONS=--no-warnings node --test tests/support-wallet-v2-safety.test.mjs tests/support-chat-widget-ui.test.mjs tests/wallet-support-entry-ui.test.mjs` => 8/8 pass.
- Verification: `node --check tests/support-wallet-v2-safety.test.mjs` and `git diff --check` for touched SQL/test/checklist paths => pass.


## 2026-06-05 20:08 CST — Support Wallet V2 SQL Editor final package
- User authorized writing the Supabase SQL Editor final execution package.
- Created `docs/plans/support-wallet-v2-sql-editor-final-package.md` containing Block A preflight, full `supabase_migration_support_wallet_v2.sql`, Block C post-check SQL, runtime smoke steps, idempotency check, and rollback notes.
- Backups before write: `_hermes_backups/support_wallet_v2_final_package_20260605_200807/`.
- Scope remains documentation/runbook only; Supabase production migration was not executed by Hermes.

## 2026-06-06 — Home task-first course finder (P0 intuitive UX)

- Scope: Implemented P0 homepage first-screen change so first-time students start from a concrete task rather than learning app structure.
- Files changed:
  - `app/page.js`
  - `tests/home-task-entry-ui.test.mjs`
  - `tests/home-guest-coach-discovery-register-cta.test.mjs`
- Backup: `_hermes_backups/home_task_entry_20260606_175031/`
- Patch: `_hermes_patches/home_task_entry_code_only_20260606_175900.patch`
- UI changes:
  - Hero asks `你想找哪一種課？`
  - Adds course chips: 籃球、英文、健身、數學、羽球、我不確定
  - Replaces generic `先看看教練` CTA with `幫我找適合的教練`
  - Shows the path: 選課程 → 看教練 → 先聊聊 → 約第一堂
  - Keeps browse-before-register behavior for public coach discovery.
- Verification:
  - RED confirmed: `node --test tests/home-task-entry-ui.test.mjs` failed before implementation on missing task-first hero copy.
  - PASS: `node --test tests/home-task-entry-ui.test.mjs tests/home-guest-coach-discovery-register-cta.test.mjs tests/theme-variables.test.mjs && node --check app/page.js` (6/6 pass).
  - PASS: `npm run build` completed successfully.
  - Smoke: production server started on `127.0.0.1:4010`; `/coaches` returned HTTP 200. `/` returned HTTP 200 via Node fetch, but task copy is client-rendered and not present in raw HTML. Browser visual smoke was blocked by missing Playwright Chromium system library `libnspr4.so` in WSL.
- Known warnings: build still warns that VAPID keys are not configured and edge runtime disables static generation for edge pages; not blocking this UI change.
- Out-of-scope/pre-existing: broader `product-realism-ui-density` test still has unrelated failures around chat copy and radius token expectations; not changed in this pass.

## 2026-06-06 — Coach card intuitive decision info (P1)

- Scope: Implemented the recommended P1 coach discovery card improvement so students can decide faster without learning the app or opening every profile.
- Files changed:
  - `app/coaches/page.js`
  - `tests/coach-card-intuitive-decision-info.test.mjs`
  - `tests/phase2-real-user-validation.test.mjs`
- Backup: `_hermes_backups/coach_card_intuitive_info_20260606_180702/`
- Patch: `_hermes_patches/coach_card_intuitive_info_code_only_20260606_181300.patch`
- UI changes:
  - Added decision cards to each discovery coach/service card:
    - `適合你如果` derived from `target_students` or existing subject/sport fallback.
    - `最快可約` derived from existing `available_times`, with safe fallback to asking first.
    - `第一堂` price derived from existing `price`, with safe price-pending fallback.
    - `可以先聊` guidance to ask about level, location, equipment, and lesson style before booking.
  - Changed primary CTA copy from `先聊聊` to `先問教練` for clearer first-use intent.
  - Kept routing/API/business logic unchanged; no DB/payment/booking changes.
- Verification:
  - RED confirmed: `node --test tests/coach-card-intuitive-decision-info.test.mjs` failed before implementation on missing fit/availability/price/ask-first card logic.
  - PASS: `node --test tests/coach-card-intuitive-decision-info.test.mjs tests/phase2-real-user-validation.test.mjs tests/real-platform-p0.test.mjs tests/home-task-entry-ui.test.mjs tests/theme-variables.test.mjs && node --check app/coaches/page.js` (14/14 pass).
  - PASS: `npm run build` completed successfully.
  - PASS smoke: `next start --hostname 127.0.0.1 -p 4011`, `/coaches` returned HTTP 200 and included the decision-card marker in rendered HTML.
  - API smoke: `/api/services` returned HTTP 503 in local smoke, likely due local service/env/database availability; page route still rendered and this pass did not change the API.
- Known warnings: build still warns that VAPID keys are not configured and edge runtime disables static generation for edge pages; not blocking this UI change.
- Visual QA limitation: Browser screenshot smoke remains blocked by missing Playwright Chromium system library `libnspr4.so` in WSL.

## 2026-06-06 18:51 CST — P2 coach detail ask-first CTA and pre-booking guidance
- Scope: UI/UX-only optimization for `/coaches/[id]`; no DB schema, booking API, payment, wallet, chat backend, or auth logic changes.
- Added strict TDD regression `tests/coach-detail-ask-first-booking-guidance.test.mjs`; verified RED before implementation, then GREEN after changes.
- Updated `app/coaches/[id]/page.js`: made sticky primary CTA `先問教練`, changed secondary action to `查看可預約時間`, and removed the broken direct route to `/coaches/${id}/booking`.
- Added `handleViewAvailability()` to scroll to an in-page `booking-guidance` card instead of sending users to a missing booking route.
- Added pre-booking guidance card: `預約前先確認` with degree/fit, time/location, equipment/lesson-mode, and clear copy that asking the coach does not directly charge the user.
- Backup: `_hermes_backups/coach_detail_ask_first_booking_guidance_20260606_184342`.
- Patch: `_hermes_patches/coach_detail_ask_first_booking_guidance_code_only_20260606_185059.patch`.
- Verification: focused/adjacent Node tests passed 16/16; `node --check app/coaches/[id]/page.js` passed; `npm run build` passed with existing VAPID/edge-runtime warnings; HTTP smoke `/coaches` and `/coaches/test-coach-id` returned 200 on local `next start` port 4013.

## 2026-06-06 19:11 CST — P3 booking page 3-step mobile stepper
- Scope: UI/UX-only optimization for `/book/[id]`; no DB schema, booking API, payment/wallet route, auth flow, or Supabase RPC changes.
- Added strict TDD regression `tests/booking-stepper-ui.test.mjs`; verified RED before implementation, then GREEN after changes.
- Updated `app/book/[id]/page.js` to replace the single long booking form with a 3-step mobile flow: `你想什麼時候上？` → `你的程度 / 需求是什麼？` → `確認點數與保障後送出`.
- Added `bookingSteps`, `currentStep`, `goNextStep`, and `goPrevStep`, plus a visible `booking-stepper` and `booking-step-card` card layout.
- Preserved existing submission payload and safeguards: `/api/bookings`, `coachId`, `serviceId`, `expectedTime`, `customPrice: pointsToPay`, wallet-balance guard, platform escrow copy, and cancellation/refund rules.
- Backup: `_hermes_backups/booking_stepper_ui_20260606_185825`.
- Patch: `_hermes_patches/booking_stepper_ui_code_only_20260606_191122.patch`.
- Verification: focused/adjacent Node tests passed 31/31; `node --check app/book/[id]/page.js` passed; `npm run build` passed with existing VAPID/edge-runtime warnings; local `next start` smoke returned HTTP 200 for `/book/test-coach?service=test-service`.

## 2026-06-06 19:23 CST — P4 bottom navigation task-path simplification
- Scope: UI/UX-only bottom navigation task-path pass. No DB schema, auth API, booking/payment route, wallet, chat backend, or permission logic was changed.
- Read `AGENTS.md`, inspected `components/Navigation.js`, `components/ConditionalShell.js`, existing nav tests, and global nav CSS.
- Added focused RED test `tests/bottom-nav-task-path-ui.test.mjs` requiring the student-facing dock to map to the core task path: `首頁 → 找教練 → 預約 → 聊天 → 我的`, demoting vague/excess slots like `探索`, `收藏`, and `錢包` from the five-slot bottom nav.
- Backed up target files under `_hermes_backups/bottom_nav_task_path_20260606_191908`.
- Updated `components/Navigation.js`: guest and student nav now route through real task destinations (`/coaches`, `/bookings`, `/chat`, profile/login), guest booking uses `/login?redirect=/bookings`, and booking nav active-state covers both `/bookings` and `/book/[id]` via `matchPaths`.
- Coach/admin nav labels and destinations were intentionally left unchanged.
- Verification: initial P4 focused test failed as expected; focused nav tests passed (10/10); adjacent P0-P3 UI tests passed (16/16); `npm run build` passed; `git diff --check` passed for touched files; HTTP smoke passed on `/`, `/coaches`, `/bookings`, `/chat`, and `/dashboard/user` via `localhost`/`[::1]` on port 4015, then temporary server was stopped.
- Known non-blocking warnings remain: VAPID keys not configured; edge runtime disables static generation for that page. 127.0.0.1 smoke was intermittently slow for `/` and `/coaches`, but `[::1]`/`localhost` returned HTTP 200 for all checked routes.
- Patch written: `_hermes_patches/bottom_nav_task_path_code_only_20260606_192346.patch`.

## 2026-06-06 19:40 CST — P5 student bookings task-center optimization
- Scope: UI/UX-only `/bookings` student course task-center pass. No DB schema, booking/payment route, wallet, review API, refund/settlement logic, chat backend, or permission logic was changed.
- Read `AGENTS.md`, inspected `app/bookings/page.js`, existing `/api/bookings` DTO fields, and adjacent booking/workbench tests.
- Added focused RED test `tests/student-bookings-task-center.test.mjs` requiring student bookings to become a course task center with `STUDENT_TASK_GROUPS`, `studentTaskCounts`, `studentNextBooking`, visible `student-next-step-card`, and guards against new course/refund/settlement APIs.
- Backed up target files under `_hermes_backups/student_bookings_task_center_20260606_193348`.
- Updated `app/bookings/page.js`: student title changed to `我的課程`; added next-course hero card, task count cards, student task filter chips, per-status next-step copy, and task-language CTAs (`完成付款`, `前往聊天`, `查看課程`) while preserving existing payment modal, review flow, chat route, expandable details, and coach workbench behavior.
- Verification: initial P5 focused test failed as expected; `node --check app/bookings/page.js` passed; focused P5 + coach bookings tests passed (7/7); adjacent UI/booking/auth/transaction tests passed (41/41); `npm run build` passed; `git diff --check` passed for touched files; HTTP smoke passed on `/bookings`, `/coaches`, and `/chat` via port 4016, then temporary server was stopped.
- Known non-blocking warnings remain: VAPID keys not configured; edge runtime disables static generation for that page; Node module-type warnings in pure Node tests for existing ESM-style libs. Localhost smoke had one transient `/bookings` timeout, but 127.0.0.1 and `[::1]` returned HTTP 200.
- Patch written: `_hermes_patches/student_bookings_task_center_code_only_20260606_193956.patch`.


## 2026-06-08 14:49 CST — Hermes read-only UniCoach audit

- Scope: read-only review requested via Telegram (「幫我審查 UniCoach」). No formal source files modified.
- Verified: `node --test` focused transaction/security subset passed 25/25; `npx next build --experimental-build-mode compile` exited 0.
- Full suite snapshot: `node --test tests/*.test.mjs` reported 229 tests, 208 pass, 21 fail.
- Key findings captured for user: production rate limiter still fails open when Redis env is missing; 8 API routes missing `runtime = nodejs` / `dynamic = force-dynamic`; wallet/points UI and task-path regressions remain.


## 2026-06-08 15:?? CST — Hermes new-model re-audit (wallet/referral/commission)

- Scope: read-only recheck after user clarified UniCoach business model changed around promotion/commission/coupons/wallet points.
- Verified: focused new-model tests (`wallet-points-transaction-hardening`, support wallet phase3a/3b, booking completion, deep hygiene, booking security/performance, settlement) reported 48 tests, 42 pass, 6 fail.
- Verified: `npx next build --experimental-build-mode compile` exited 0.
- High-risk findings: SECURITY DEFINER wallet/topup/booking RPCs lack explicit REVOKE/GRANT and search_path; Phase 3C completion RPC conflicts with hardened completion RPC and drops payment/report/end-time checks; new referral_rewards release path is not wired to cron/release RPC; referral_reward_windows is defined but not written by registration/bind route.

## 2026-06-08 15:52 CST — Wallet RPC permission hardening (A)

- Scope: implemented option A only: SQL-level hardening for wallet/top-up/booking money RPC permissions, search_path pinning, and in-DB admin validation for top-up approve/reject. Did not change UI, referral percentages, completion/referral reward business logic, or original app routes.
- Added test: tests/wallet-rpc-permissions-hardening.test.mjs. RED observed before implementation: missing _hermes_patches/supabase_migration_wallet_rpc_permissions_20260608.sql caused 4/4 failures.
- Added SQL patch: _hermes_patches/supabase_migration_wallet_rpc_permissions_20260608.sql. It applies after wallet_points_hardening_20260604, sets search_path=public on deduct_wallet_balance/approve_point_topup_request/reject_point_topup_request/create_wallet_booking_safe, recreates approve/reject RPCs with p_admin_id users.role=admin check and admin_required failure, revokes PUBLIC/anon/authenticated execute, and grants execute to service_role.
- Verification: new focused test passed 3/3; node --check passed; git diff --check for touched files passed; Next compile build passed. Adjacent wallet/security run passed 15/16 with the pre-existing wallet UI shape/copy failure still present in tests/wallet-points-transaction-hardening.test.mjs.
- Backup: platform-session.md copied to _hermes_backups/20260608_154739/platform-session.md.bak before session-log append.
- Remaining risks: SQL was statically verified only because psql is not installed in this WSL session; must be applied/tested against Supabase staging before production. Next priorities remain B complete_booking_with_referral safety merge and C referral_reward_windows/referral_rewards/cron wiring.

## 2026-06-08 15:58 CST — Phase 3C completion/referral hardening (B)

- Scope: implemented option B as a forward-only SQL patch and focused static test. Did not modify app routes, UI, reward-window creation, or cron release wiring.
- Added test: tests/phase3c-completion-rpc-hardening.test.mjs. RED observed before implementation: missing _hermes_patches/supabase_migration_phase3c_completion_hardening_20260608.sql caused 4/4 failures.
- Added SQL patch: _hermes_patches/supabase_migration_phase3c_completion_hardening_20260608.sql. It applies after booking_completion, phase3c_rewards, and phase3c_rpc migrations; creates unique index idx_referral_rewards_booking_role_unique on referral_rewards(booking_id, role_type); redefines 3-arg complete_booking_with_referral with FOR UPDATE row lock, previous-status conflict check, idempotent already-completed return, valid transition check, payment_status=paid guard, expected_time+duration_minutes end-time guard, formal non-AI-draft learning report guard, and Phase 3C 90-day referral_rewards insertion.
- Business logic preserved: single active referrer side earns 3
## 2026-06-08 15:58 CST — Phase 3C completion/referral hardening (B)

- Scope: implemented option B as a forward-only SQL patch and focused static test. Did not modify app routes, UI, reward-window creation, or cron release wiring.
- Added test: tests/phase3c-completion-rpc-hardening.test.mjs. RED observed before implementation: missing _hermes_patches/supabase_migration_phase3c_completion_hardening_20260608.sql caused 4/4 failures.
- Added SQL patch: _hermes_patches/supabase_migration_phase3c_completion_hardening_20260608.sql. It applies after booking_completion, phase3c_rewards, and phase3c_rpc migrations; creates unique index idx_referral_rewards_booking_role_unique on referral_rewards(booking_id, role_type); redefines 3-arg complete_booking_with_referral with FOR UPDATE row lock, previous-status conflict check, idempotent already-completed return, valid transition check, payment_status=paid guard, expected_time+duration_minutes end-time guard, formal non-AI-draft learning report guard, and Phase 3C 90-day referral_rewards insertion.
- Business logic preserved: single active referrer side earns 3%; dual active student+coach sides earn 2.5% each; rewards are pending with release_at = NOW() + INTERVAL 24 hours; duplicate same booking/role rewards use ON CONFLICT DO NOTHING.
- Safety change: removed the Phase 3C dependency on undefined public.process_booking_settlement_v2 from the latest completion RPC. The existing settlement pipeline remains separate and should be reviewed under the next settlement/cron scope if needed.
- Permissions: latest 3-arg RPC is SECURITY DEFINER SET search_path=public, revokes PUBLIC/anon/authenticated execute, and grants execute to service_role for the existing adminSupabase route call.
- Verification: new focused test passed 4/4; booking/security/settlement related run passed 20/20; wallet+phase3c RPC tests passed 7/7; node --check and scoped git diff --check passed; Next compile build passed.
- Backup: platform-session.md and supabase_migration_phase3c_rpc.sql copied to _hermes_backups/20260608_155500/ before work.
- Remaining risks: SQL was statically verified only because psql is not installed in this WSL session; apply/test on Supabase staging before production. Next priority is C: referral_reward_windows creation and referral_rewards release cron wiring, because rewards can now be inserted safely but may still lack upstream windows or downstream release handling.

## 2026-06-08 16:08 CST — Phase 3C referral window/release wiring (C)

- Scope: implemented option C to connect referral_reward_windows creation and new referral_rewards release flow. Did not modify UI, reward percentage rules, booking completion route, or legacy reward_logs release RPC.
- Added test: tests/phase3c-referral-reward-flow.test.mjs. RED observed before implementation: bind/register routes did not write referral_reward_windows; cron only scanned reward_logs; release SQL patch was missing (4/4 failures).
- Route changes: app/api/user/referral/bind/route.js now creates/upserts a 90-day referral_reward_windows row for the authenticated user after successful referral binding. app/api/auth/register/route.js now creates/upserts a 90-day referral_reward_windows row for newly registered users when referralCode resolves to a referrer.
- Cron change: app/api/cron/release-rewards/route.js now scans public.referral_rewards pending rows with release_at <= now, then calls release_phase3c_referral_reward via adminSupabase/service role. It no longer only processes legacy reward_logs.
- Added SQL patch: _hermes_patches/supabase_migration_phase3c_reward_release_20260608.sql. It creates SECURITY DEFINER SET search_path=public release_phase3c_referral_reward(UUID), locks referral_rewards FOR UPDATE, skips non-pending or unreached release_at rows, credits users.wallet_balance, writes wallet_transactions audit row when that table exists, marks referral_rewards.status='released', revokes PUBLIC/anon/authenticated, and grants service_role.
- Verification: phase3c referral flow focused test passed 4/4; auth/completion/referral related run passed 14/14; A+B+C RPC/flow tests passed 11/11; node --check on touched JS/MJS files passed; scoped git diff --check passed; Next compile build passed.
- Backup: platform-session.md, app/api/user/referral/bind/route.js, app/api/auth/register/route.js, and app/api/cron/release-rewards/route.js copied to _hermes_backups/20260608_160059/ before edits.
- Remaining risks: SQL still statically verified only (psql unavailable in WSL). Register/bind window creation is implemented in route-level operations, not a single DB transaction RPC; if the window write fails after users.referred_by is set, the route returns an error but may need manual reconciliation. Consider a future bind_referral_with_window RPC for full atomicity if this flow becomes high-volume.

## 2026-06-08 16:22 CST — Phase 3C transactional referral binding (D)

- Scope: implemented option D to remove the C-stage route-level partial-write risk for referral binding/window creation. Did not change reward percentages, completion rules, cron release cadence, UI, or settlement logic.
- Added RED/GREEN test: tests/phase3c-referral-transactional-rpc.test.mjs. RED observed before implementation: bind route did not call bind_referral_with_window, register route did not call attach_registered_referral_with_window, and the transactional SQL patch file was missing (0/3 pass).
- Added SQL patch: _hermes_patches/supabase_migration_phase3c_referral_transactional_binding_20260608.sql. It creates bind_referral_with_window(p_user_id, p_code) and attach_registered_referral_with_window(p_user_id, p_referrer_id), both SECURITY DEFINER SET search_path=public, row-lock users/referrer rows with FOR UPDATE, update users.referred_by, insert referrals audit rows, and upsert 90-day referral_reward_windows inside one DB transaction. PUBLIC/anon/authenticated execute is revoked; service_role is granted.
- Route changes: app/api/user/referral/bind/route.js now only validates input/auth then calls bind_referral_with_window; it no longer directly updates users, inserts referrals, or upserts referral_reward_windows. app/api/auth/register/route.js no longer writes referred_by in the initial profile insert/update and instead calls attach_registered_referral_with_window after profile creation when referralCode resolves.
- Updated C regression test: tests/phase3c-referral-reward-flow.test.mjs now verifies reward-window creation through the transactional RPC migration rather than route-level upsert code.
- Verification: D focused test passed 3/3; C+D referral tests passed 7/7; A+B+C+D plus adjacent auth/booking tests passed 20/20; node --check passed for touched JS/MJS files; Next compile build passed. Scoped git diff --check for touched files passed. Full git diff --check still reports pre-existing trailing whitespace in app/dashboard/user/wallet/page.js, which was not touched in this D patch.
- Backup: touched source/test/session files were copied to _hermes_backups/20260608_161445_phase3c_d/ before edits.
- Remaining risks: SQL is still statically verified only because psql is unavailable in this WSL session. Supabase Auth user creation and public.users profile creation cannot be part of the same Postgres transaction from this route; D specifically makes referred_by + referrals + reward window atomic after the profile row exists. Apply SQL patches to staging before deploying routes.

## 2026-06-08 16:29 CST — Production rate-limit fail-closed hardening (E)

- Scope: implemented option E to harden lib/rateLimit.js and proxy.js so production API traffic no longer fails open when Redis config is missing or Redis limit calls throw. Did not modify auth business logic, referral SQL, UI, or database migrations.
- Added/strengthened RED/GREEN test: tests/rate-limit-fail-closed.test.mjs. RED observed before final implementation: production missing Redis returned success=true and static source still returned createAllowLimiter inside the !redis branch.
- lib/rateLimit.js changes: added shouldFailClosed(), createFailClosedLimiter(), safe logging via safeErrorDetails, production missing-Redis branch now logs RATE_LIMIT_CONFIG_MISSING and returns a denial limiter, while non-production still uses createAllowLimiter for local MVP/dev. Redis runtime errors now return fail-closed in production and allow-only in non-production.
- proxy.js changes: applies strictLimiter to /api/auth/login and /api/auth/register, passwordResetLimiter to /api/auth/forgot-password and /api/auth/reset-password, generalLimiter to other API routes, returns 429 for quota exceeded and 503 for limiter infrastructure unavailable, with x-ratelimit headers.
- Verification: rate-limit focused test passed 4/4 including runtime production missing-Redis assertion; adjacent auth/referral run passed 13/13; node --check passed for lib/rateLimit.js, proxy.js, and the test; Next compile build passed. Scoped git diff --check for touched files passed. Full git diff --check still reports pre-existing trailing whitespace in app/dashboard/user/wallet/page.js, not introduced by E.
- Backup: lib/rateLimit.js, tests/rate-limit-fail-closed.test.mjs, proxy.js, and platform-session.md copied to _hermes_backups/20260608_162637_rate_limit_e/ before edits.
- Deployment caution: production now requires valid UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN; without them API requests through proxy return 503 rather than silently allowing traffic. Set/verify Redis env vars in Vercel before deploying this change to production.


## 2026-06-08 16:45 CST — API route runtime/dynamic deployment hygiene (F)

- Scope: implemented option F to make App Router API deployment behavior explicit. Did not change business logic, SQL reward rules, booking/payment logic, or route handlers beyond runtime/dynamic declarations.
- Added RED/GREEN test: tests/api-route-runtime-dynamic-hygiene.test.mjs. RED observed before implementation: 8 API routes were missing runtime and/or dynamic exports, including admin analytics, AI parse, cron social routes, payment settings, social test connection, favorites, and user tasks.
- Route changes: added exactly one `export const runtime = 'nodejs';` and exactly one `export const dynamic = 'force-dynamic';` where missing in app/api/admin/analytics/route.js, app/api/ai/parse-fb-post/route.js, app/api/cron/auto-post/route.js, app/api/cron/renew-meta-token/route.js, app/api/settings/payment/route.js, app/api/social/test-connection/route.js, app/api/user/favorites/route.js, and app/api/user/tasks/route.js.
- Hygiene cleanup: removed pre-existing trailing whitespace in app/dashboard/user/wallet/page.js so full `git diff --check` is now clean. This was formatting-only; existing wallet page behavior was not changed.
- Added helper script for traceability: _hermes_patches/scripts/add_api_route_runtime_dynamic.py documents the one-time insertion logic used for F.
- Verification: F focused test passed 1/1; adjacent auth/rate-limit/Phase3C tests passed 14/14; node --check passed for touched route/test/wallet files; full `git diff --check` passed; Next compile build passed and shows all /api routes as dynamic server-rendered functions.
- Backups: API route/test/session files copied to _hermes_backups/20260608_164005_api_route_runtime_f/ before F edits; wallet whitespace cleanup backed up to _hermes_backups/20260608_164242_wallet_whitespace/.
- Remaining risks: full production deploy still needs Vercel env readiness from E, especially UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN; SQL patches remain statically verified only because psql is unavailable in this WSL session.


## 2026-06-10 01:17 — Coach pages read-only audit
- Scope: inspected coach dashboard/profile/plans/schedule pages and related APIs. No source edits.
- Verified: `npm run build` currently fails during page data collection because `sharp` cannot load linux-x64 optional dependency; also logs missing Upstash rate-limit config and VAPID warning.
- Findings queued for user: dashboard today count uses `booking_date` while booking API DTO returns `expected_time`; onboarding/API approval circularity for plans/availability; AI FB parser auth mismatch; profile checklist/video proxy issues; schedule save wording/destructive replacement risk.


## 2026-06-10 01:22 — Coach dashboard expected_time fix
- User selected A; changed `app/dashboard/coach/page.js` read-only finding into code fix.
- Backup: `_hermes_patches/backups/20260610_011917_app_dashboard_coach_page.js.bak`.
- Diff: `_hermes_patches/diffs/20260610_011917_coach_dashboard_expected_time.diff`.
- Change: added `getBookingScheduleTime()` and made today bookings use `expected_time` first, with `booking_date`/`scheduled_at` fallback.
- Verification: `node --check app/dashboard/coach/page.js` passed; `npm run build` compiles but still fails at page-data collection for `/api/files/upload` because `sharp` cannot load linux-x64 runtime optional dependency.


## 2026-06-10 01:51:34 Hermes read-only coach pages re-audit
- Scope: app/dashboard/coach/page.js, app/bookings/page.js, app/coach/profile/edit/page.js, app/coach/plans/page.js, app/coach/schedule/page.js, related coach APIs.
- Verification run: node --check passed for inspected pages/routes. Focused tests run: coach-plans-service-semantics passed; coach-dashboard-p1a-today-workbench failed 2 assertions; coach-schedule-weekly-summary failed 1 assertion.
- Findings: dashboard query filter links are currently not consumed by /bookings; unapproved coach onboarding is circularly gated by requireApprovedCoach on plans/availability APIs; dashboard larger unapproved state copy may overclaim public listing readiness; checklist/test contract drift after dashboard redesign; schedule test CTA copy drift after safer overwrite wording; AI parse route uses SSR getSession rather than project-standard auth helper.
- No source changes made during this re-audit.


## 2026-06-10 Ollama local connection retest
- Started WSL-local Ollama proxy on `127.0.0.1:11434` forwarding to Windows Ollama via PowerShell/.NET HttpClient.
- Verified `/api/tags` lists `gemma4:e4b` and `qwen3:8b`.
- Updated `.env.local` with `OLLAMA_BASE_URL=http://127.0.0.1:11434` and `OLLAMA_MODEL=qwen3:8b` after backing up the env file under `_hermes_patches/backups/`.

- Retested WSL proxy after fixing POST forwarding through a temp body file + Windows `curl.exe`; `/api/generate` returned `{"ok":true}` from `qwen3:8b`.
- Live helper smoke test `parseFbPostWithOllama()` returned structured profile JSON from Windows Ollama via WSL proxy.
- Dev server restarted on port 4000; unauthenticated `/api/ai/parse-fb-post` returned expected `401 Unauthorized`, confirming the route is mounted and protected.
- Focused parser tests passed with `node --test tests/ollama-fb-post-parser.test.mjs` (3/3).


## 2026-06-10 Coach profile checklist navigation
- Changed public coach profile checklist items into navigable buttons on `/coach/profile/edit`.
- Each checklist button now scrolls/focuses the related section: avatar, experience, philosophy, teaching features, location, service areas, media/avatar, identity verification.
- Added `tests/coach-profile-checklist-navigation.test.mjs` to assert button navigation mappings.
- Verification: `node --test tests/coach-profile-checklist-navigation.test.mjs`, `node --test tests/ollama-fb-post-parser.test.mjs`, and HTTP smoke check for `/coach/profile/edit` all passed.
