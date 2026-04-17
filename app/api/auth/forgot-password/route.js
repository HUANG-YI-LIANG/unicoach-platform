import { getAdminSupabase } from "@/lib/supabase";
import { sendPasswordResetEmail } from "@/lib/email";
import { generatePasswordResetToken } from "@/lib/tokenUtils";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { email } = await request.json();
    
    // ✅ 驗證輸入
    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "請提供有效的電子郵件地址。" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const adminSupabase = getAdminSupabase();
    
    // ✅ 查詢用戶
    const { data: user, error: userError } = await adminSupabase
      .from("users")
      .select("id, name, email")
      .eq("email", normalizedEmail)
      .single();
    
    // ★ 安全機制：防 Email 枚舉攻擊
    const standardMessage = "如果該電子郵件地址存在於我們的系統中，您將收到密碼重設指示。";
    
    if (userError || !user) {
      // 僅在伺服器端記錄，不告知請求者用戶不存在
      console.log(`[SECURITY] 未知郵件嘗試重設密碼: ${normalizedEmail}`);
      return NextResponse.json(
        { message: standardMessage },
        { status: 200 }
      );
    }

    // ✅ 產生安全 Token
    const { token, hashedToken, expiresAt } = generatePasswordResetToken();

    // ✅ 儲存 Token 至資料庫（UPSERT 覆蓋舊 Token）
    const { error: tokenError } = await adminSupabase
      .from("password_reset_tokens")
      .upsert({
        user_id: user.id,
        token: hashedToken, // 儲存雜湊後的版本
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
        used_at: null,
      }, {
        onConflict: "user_id",
      });

    if (tokenError) {
      console.error("[TOKEN ERROR]", tokenError);
      return NextResponse.json(
        { error: "系統暫時無法處理您的要求，請稍後再試。" },
        { status: 500 }
      );
    }

    // ✅ 發送重設郵件
    try {
      await sendPasswordResetEmail(user.email, token, user.name);
      console.log(`[SUCCESS] 密碼重設郵件已發送: ${user.email}`);
    } catch (emailError) {
      console.error("[EMAIL ERROR]", emailError);
      return NextResponse.json(
        { error: "郵件發送失敗，請檢查您的電子郵件地址或稍後再試。" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: standardMessage },
      { status: 200 }
    );
  } catch (error) {
    console.error("[FORGOT PASSWORD ERROR]", error);
    return NextResponse.json(
      { error: "伺服器內部錯誤，請稍後再試。" },
      { status: 500 }
    );
  }
}
