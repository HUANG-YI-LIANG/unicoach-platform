export async function sendDiscordAlert(title, description, color = 16711680) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title,
          description,
          color,
          timestamp: new Date().toISOString()
        }]
      })
    });
  } catch (err) {
    console.error('[Discord Notifier] 警告發送失敗:', err);
  }
}

export async function sendMetaRateLimitWarning(usage) {
  await sendDiscordAlert(
    '⚠️ Meta API Rate Limit 警告',
    `API 使用率即將達標！\n\n**Call Count**: ${usage.call_count}%\n**Total Time**: ${usage.total_time}%\n**CPU Time**: ${usage.total_cputime}%`,
    16776960 // Yellow
  );
}

export async function sendMetaTokenError(code, message) {
  await sendDiscordAlert(
    '🚨 Meta API Token 死亡警告',
    `發文系統已停擺，請立即更新 Token！\n\n**Error Code**: ${code}\n**Message**: ${message}`,
    16711680 // Red
  );
}
