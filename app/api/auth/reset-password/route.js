import { getAdminSupabase } from "@/lib/supabase";
import { sendPasswordUpdateNotification } from "@/lib/email";
import crypto from "crypto";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { token, newPassword } = await request.json();
    
    // ✅ 驗證輸入
    if (!token || !newPassword) {
      return NextResponse.json(
        { error: "重設 Token 與新密碼為必填項目。" },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "新密碼長度至少需要 8 個字符。" },
        { status: 400 }
      );
    }

    const adminSupabase = getAdminSupabase();
    
    // ✅ 雜湊輸入 Token 進行查詢
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // ✅ 查詢 Token 資料
    const { data: tokenData, error: tokenError } = await adminSupabase
      .from("password_reset_tokens")
      .select("user_id, token, expires_at, used_at")
      .eq("token", hashedToken)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { error: "無效或已過期的重設連結。" },
        { status: 400 }
      );
    }

    // ✅ 檢查是否已使用
    if (tokenData.used_at) {
      return NextResponse.json(
        { error: "此重設連結已經被使用過，請重新申請。" },
        { status: 400 }
      );
    }

    // ✅ 檢查是否過期
    if (new Date() > new Date(tokenData.expires_at)) {
      return NextResponse.json(
        { error: "重設連結已過期，請重新申請密碼重設。" },
        { status: 400 }
      );
    }

    // ✅ 取得用戶資訊（用於郵件通知）
    const { data: userProfile, error: profileError } = await adminSupabase
      .from("users")
      .select("email, name")
      .eq("id", tokenData.user_id)
      .single();

    if (profileError || !userProfile) {
      console.error("[PROFILE ERROR]", profileError);
      return NextResponse.json(
        { error: "無法找到用戶資料，請聯繫客服。" },
        { status: 500 }
      );
    }

    // ✅ 更新用戶密碼（使用 Supabase Auth Admin API）
    const { error: passwordError } = await adminSupabase.auth.admin.updateUserById(
      tokenData.user_id,
      { password: newPassword }
    );

    if (passwordError) {
      console.error("[PASSWORD UPDATE ERROR]", passwordError);
      return NextResponse.json(
        { error: "密碼更新失敗，請稍後再試。" },
        { status: 500 }
      );
    }

    // ✅ 標記 Token 為已使用（防重複使用）
    const { error: markUsedError } = await adminSupabase
      .from("password_reset_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("user_id", tokenData.user_id);

    if (markUsedError) {
      console.error("[TOKEN MARK ERROR]", markUsedError);
      // 不中斷流程，僅記錄錯誤
    }

    // ✅ 發送密碼更新確認郵件（雙重安全通知）
    try {
      await sendPasswordUpdateNotification(userProfile.email, userProfile.name);
      console.log(`[SECURITY] 密碼更新確認郵件已發送: ${userProfile.email}`);
    } catch (emailError) {
      console.error("[NOTIFICATION EMAIL ERROR]", emailError);
      // 不中斷主流程
    }

    console.log(`[SUCCESS] 用戶密碼重設成功: ${userProfile.email}`);

    return NextResponse.json(
      { message: "密碼重設成功！您現在可以使用新密碼登入。" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[RESET PASSWORD ERROR]", error);
    return NextResponse.json(
      { error: "伺服器內部錯誤，請稍後再試。" },
      { status: 500 }
    );
  }
}
