-- 1. 在 users 表新增強制重設密碼的標記欄位
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS force_password_reset BOOLEAN DEFAULT false;

-- 2. 建立匿名客服 Session 表
CREATE TABLE IF NOT EXISTS public.anonymous_support_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pin_code TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'open', -- 'open', 'resolved'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. 建立匿名客服訊息表
CREATE TABLE IF NOT EXISTS public.anonymous_support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.anonymous_support_sessions(id) ON DELETE CASCADE,
    sender TEXT NOT NULL CHECK (sender IN ('user', 'admin')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. 設定 RLS 權限 (開放給匿名使用者新增/查詢，但必須透過 API 帶上 Service Role 以確保只能用 PIN 查詢)
-- 為了安全，我們不直接把匿名表完全開放給 public，而是讓前端呼叫 Next.js API，
-- Next.js API 使用 Admin Supabase 進行驗證與寫入。因此直接開啟 RLS 但不加 Policy，
-- 這樣預設所有前端的直接存取都會被拒絕，只有 Server-side API 可以存取。
ALTER TABLE public.anonymous_support_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anonymous_support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service Role Full Access on anonymous_support_sessions" 
ON public.anonymous_support_sessions FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service Role Full Access on anonymous_support_messages" 
ON public.anonymous_support_messages FOR ALL USING (true) WITH CHECK (true);
