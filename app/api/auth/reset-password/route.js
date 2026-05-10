export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { getAdminSupabase } from "@/lib/supabase";
import { sendPasswordUpdateNotification } from "@/lib/email";
import { maskEmail, safeErrorDetails } from "@/lib/safeLogging";
import { passwordResetLimiter, getClientIp } from "@/lib/rateLimit";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const ip = getClientIp(request);
    const rateLimit = await passwordResetLimiter.limit(ip);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "請求過於頻繁，請稍後再試。" },
        { status: 429 }
      );
    }

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
      console.error("[PROFILE ERROR]", safeErrorDetails(profileError));
      return NextResponse.json(
        { error: "無法找到用戶資料，請聯繫客服。" },
        { status: 500 }
      );
    }

    // ✅ 先以條件更新消耗 Token，避免並發請求同時重設密碼
    const { data: consumedToken, error: markUsedError } = await adminSupabase
      .from("password_reset_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("token", hashedToken)
      .is("used_at", null)
      .select("token")
      .maybeSingle();

    if (markUsedError) {
      console.error("[TOKEN MARK ERROR]", safeErrorDetails(markUsedError));
      throw markUsedError;
    }

    if (!consumedToken) {
      throw new Error("Password reset token was not consumed");
    }

    // ✅ 更新用戶密碼（使用 Supabase Auth Admin API）
    const { error: passwordError } = await adminSupabase.auth.admin.updateUserById(
      tokenData.user_id,
      { password: newPassword }
    );

    if (passwordError) {
      console.error("[PASSWORD UPDATE ERROR]", safeErrorDetails(passwordError));
      return NextResponse.json(
        { error: "密碼更新失敗，請稍後再試。" },
        { status: 500 }
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const { error: profilePasswordError } = await adminSupabase
      .from("users")
      .update({ password: hashedPassword })
      .eq("id", tokenData.user_id);

    if (profilePasswordError) {
      console.error("[PROFILE PASSWORD UPDATE ERROR]", safeErrorDetails(profilePasswordError));
      return NextResponse.json(
        { error: "密碼更新失敗，請稍後再試。" },
        { status: 500 }
      );
    }

    // ✅ 發送密碼更新確認郵件（雙重安全通知）
    try {
      await sendPasswordUpdateNotification(userProfile.email, userProfile.name);
      console.log(`[SECURITY] 密碼更新確認郵件已發送: ${maskEmail(userProfile.email)}`);
    } catch (emailError) {
      console.error("[NOTIFICATION EMAIL ERROR]", safeErrorDetails(emailError));
      // 不中斷主流程
    }

    console.log(`[SUCCESS] 用戶密碼重設成功: ${maskEmail(userProfile.email)}`);

    return NextResponse.json(
      { message: "密碼重設成功！您現在可以使用新密碼登入。" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[RESET PASSWORD ERROR]", safeErrorDetails(error));
    return NextResponse.json(
      { error: "伺服器內部錯誤，請稍後再試。" },
      { status: 500 }
    );
  }
}
