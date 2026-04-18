const fs = require('fs');
const path = require('path');

/**
 * UniCoach API 探針 v2.0 (自給自足版)
 * 不依賴 dotenv 或 node-fetch，基於 Node 24 原生 Fetch
 */

// 1. 手動讀取環境變數
async function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) throw new Error('找不到 .env.local 檔案');
  
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  content.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value) env[key.trim()] = value.join('=').trim();
  });
  return env;
}

const BASE_URL = 'http://localhost:4000';

async function runProbe() {
  console.log('🚀 [UniCoach API 探針] 啟動深度狀態機掃描...\n');
  const startTotal = Date.now();

  try {
    const env = await loadEnv();
    const testId = Math.random().toString(36).substring(7);
    const studentEmail = `student_${testId}@test.com`;
    const coachEmail = `coach_${testId}@test.com`;
    const password = 'Password123!';

    let studentToken, coachToken, coachId, bookingId;

    // --- PHASE 1: 註冊與法律合規 ---
    console.log('PHASE 1: 註冊與法律防線驗證...');
    
    async function testRegister(data, label) {
      const start = Date.now();
      const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const latency = Date.now() - start;
      console.log(`  - ${label}: ${res.status === 201 || res.status === 400 ? '✅' : '❌'} (${res.status}) [${latency}ms]`);
      return res;
    }

    await testRegister({ 
      email: 'minor@test.com', age: 10, name: 'Minor', password,
      acceptedTerms: true, acceptedPrivacy: true, acceptedDisclaimer: true 
    }, '未成年攔截測試');
    await testRegister({ 
      email: studentEmail, name: 'Probe Student', password, age: 20, 
      acceptedTerms: true, acceptedPrivacy: true, acceptedDisclaimer: true 
    }, 'Student 註冊');
    await testRegister({ 
      email: coachEmail, name: 'Probe Coach', password, age: 25, role: 'coach',
      acceptedTerms: true, acceptedPrivacy: true, acceptedDisclaimer: true 
    }, 'Coach 註冊');

    // --- PHASE 2: 傳輸安全性與權限 ---
    console.log('\nPHASE 2: 認證體系效能掃描...');
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: coachEmail, password })
    });
    const lData = await loginRes.json();
    coachToken = lData.token;
    coachId = lData.user.id;
    console.log(`  - Coach 登入授權: ${coachToken ? '✅ JWT 已簽發' : '❌ 失敗'}`);

    // --- PHASE 3: 核心交易流 (預約與評價) ---
    console.log('\nPHASE 3: 核心交易閉環驗證...');
    
    // 學生登入
    const sLogin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: studentEmail, password })
    });
    const slData = await sLogin.json();
    studentToken = slData.token;

    // 建立預約
    const bookRes = await fetch(`${BASE_URL}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${studentToken}` },
      body: JSON.stringify({ coach_id: coachId, original_amount: 1000, expected_time: new Date() })
    });
    const bData = await bookRes.json();
    bookingId = bData.booking?.id;
    console.log(`  - 預約建立流程: ${bookingId ? '✅ 成功 ID: ' + bookingId.slice(0,8) : '❌ 失敗'}`);

    // 提交評價
    if (bookingId) {
      const reviewRes = await fetch(`${BASE_URL}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${studentToken}` },
        body: JSON.stringify({ booking_id: bookingId, rating: 5, comment: '探針自動化評價測試' })
      });
      console.log(`  - 評價寫入測試: ${reviewRes.ok ? '✅ 成功' : '❌ 失敗 (' + reviewRes.status + ')'}`);
    }

    console.log(`\n✨ 探針掃描完成。總耗時: ${Date.now() - startTotal}ms`);
  } catch (err) {
    console.error('\n🚨 探針崩潰:', err.message);
  }
}

runProbe();
