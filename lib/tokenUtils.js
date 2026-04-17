import crypto from "crypto";

/**
 * 產生安全的密碼重設 Token
 * @returns {{ token: string, hashedToken: string, expiresAt: Date }}
 */
export function generatePasswordResetToken() {
  // 產生隨機 Token（32 位元組 = 256 位元強度）
  const token = crypto.randomBytes(32).toString("hex");
    
  // 雜湊化儲存（SHA-256）
  const hashedToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  // Token 有效期：1 小時
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  return {
    token,        // 明文 Token（用於郵件連結）
    hashedToken,  // 雜湊 Token（儲存至資料庫）
    expiresAt,
  };
}

/**
 * 驗證 Token 有效性
 * @param {string} inputToken - 用戶提供的明文 Token
 * @param {string} storedHashedToken - 資料庫中的雜湊 Token
 * @param {Date} tokenExpiry - Token 到期時間
 * @returns {boolean}
 */
export function verifyPasswordResetToken(inputToken, storedHashedToken, tokenExpiry) {
  // 檢查是否過期
  if (new Date() > new Date(tokenExpiry)) {
    return false;
  }

  // 雜湊輸入 Token 並比對
  const hashedInputToken = crypto
    .createHash("sha256")
    .update(inputToken)
    .digest("hex");

  return hashedInputToken === storedHashedToken;
}
