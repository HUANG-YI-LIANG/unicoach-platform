import nodemailer from "nodemailer";

// ============================================================
// Gmail 郵件發送器設定
// ============================================================
let transporter;

function getEmailTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD,
      },
    });
  }
  return transporter;
}

/**
 * 發送密碼重設郵件
 * @param {string} userEmail - 收件者信箱
 * @param {string} resetToken - 重設 Token
 * @param {string} userName - 用戶姓名
 */
export async function sendPasswordResetEmail(userEmail, resetToken, userName = "用戶") {
  const transporter = getEmailTransporter();
  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}`;
  
  const mailOptions = {
    from: `"健身教練平台" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: "🔐 密碼重設要求",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333; margin-bottom: 10px;">🔐 密碼重設要求</h1>
          <p style="color: #666; font-size: 14px;">健身教練平台</p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p>親愛的 <strong>${userName}</strong>，</p>
          <p>我們收到了您的密碼重設要求。如果這是您本人的操作，請點擊以下按鈕來重設您的密碼：</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
              style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                     color: white; padding: 15px 35px; text-decoration: none; 
                     border-radius: 8px; font-weight: bold; font-size: 16px;
                    display: inline-block; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
            🔑 重設我的密碼
          </a>
        </div>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="color: #856404; margin: 0; font-size: 14px;">
            <strong>⏰ 重要提醒：</strong><br>
            • 此連結將在 <strong>1 小時後失效</strong><br>
            • 如果您並未要求重設密碼，請<strong>立即忽略此郵件</strong><br>
            • 為了您的安全，請勿將此連結分享給任何人
          </p>
        </div>
        
        <div style="color: #999; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
          <p><strong>無法點擊按鈕？</strong>請複製以下連結到瀏覽器：</p>
          <p style="word-break: break-all; background-color: #f1f1f1; padding: 10px; border-radius: 4px;">
            <code>${resetUrl}</code>
          </p>
          <p style="margin-top: 15px; color: #666;">
            此郵件來自健身教練平台自動發送系統，請勿直接回覆。<br>
            如有疑問，請聯繫客服團隊。
          </p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] 密碼重設郵件已發送至：${userEmail}`);
    return { success: true };
  } catch (error) {
    console.error("[EMAIL ERROR] 重設郵件發送失敗：", error);
    throw new Error("郵件發送失敗，請稍後再試。");
  }
}

/**
 * 發送密碼更新確認郵件（安全通知）
 * @param {string} userEmail - 收件者信箱
 * @param {string} userName - 用戶姓名
 */
export async function sendPasswordUpdateNotification(userEmail, userName = "用戶") {
  const transporter = getEmailTransporter();
  const currentTime = new Date().toLocaleString('zh-TW', { 
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  const mailOptions = {
    from: `"健身教練平台安全中心" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: "✅ 密碼更新確認通知",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #28a745; margin-bottom: 10px;">✅ 密碼更新成功</h1>
          <p style="color: #666; font-size: 14px;">健身教練平台 - 安全中心</p>
        </div>
        
        <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p style="color: #155724; margin: 0; font-size: 16px;">
            <strong>親愛的 ${userName}，</strong><br><br>
            您的帳戶密碼已於 <strong>${currentTime}</strong> 成功更新。
          </p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #333; margin-top: 0;">🔒 安全資訊</h3>
          <ul style="color: #555; line-height: 1.6;">
            <li>您現在可以使用新密碼登入平台</li>
            <li>舊密碼已失效，無法再次使用</li>
            <li>所有裝置將需要重新登入</li>
          </ul>
        </div>
        
        <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="color: #721c24; margin: 0; font-size: 14px;">
            <strong>🚨 如果這不是您的操作：</strong><br>
            請<strong>立即</strong>聯繫我們的客服團隊，您的帳戶可能存在安全風險。<br>
            同時建議您檢查其他相關帳戶的安全狀態。
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXTAUTH_URL}/login" 
              style="background-color: #28a745; color: white; padding: 12px 30px; 
                     text-decoration: none; border-radius: 5px; font-weight: bold;
                    display: inline-block;">
            🚪 立即登入
          </a>
        </div>
        
        <div style="color: #999; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
          <p>此郵件來自健身教練平台安全監控系統，請勿直接回覆。</p>
          <p>如有疑問或需要協助，請聯繫客服團隊。</p>
          <p style="margin-top: 10px;">
            <strong>平台網址：</strong> ${process.env.NEXTAUTH_URL}<br>
            <strong>發送時間：</strong> ${currentTime}
          </p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] 密碼更新確認郵件已發送至：${userEmail}`);
    return { success: true };
  } catch (error) {
    console.error("[EMAIL ERROR] 確認郵件發送失敗：", error);
    return { success: false, error: error.message };
  }
}
