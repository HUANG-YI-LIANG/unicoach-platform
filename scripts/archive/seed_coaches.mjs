import { createClient } from '@supabase/supabase-js';

// 使用環境變數
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const coaches = [
  {
    email: 'wang@test.com',
    password: 'Test1234!',
    name: '王大明',
    university: '國立體育大學',
    service_areas: '籃球', // ✅ 改為 text 格式
    location: '台北市',
    base_price: 800,
    philosophy: '擁有10年籃球教學經驗，曾任高中校隊總教練，專精於基本功訓練與戰術指導。', // ✅ 用 philosophy 存放簡介
    experience: '10年教學經驗 / 前校隊教練'
  },
  {
    email: 'lee@test.com',
    password: 'Test1234!',
    name: '李小梅',
    university: '台灣師範大學',
    service_areas: '桌球, 籃球', // ✅ 用逗號分隔的 text 格式
    location: '新北市',
    base_price: 600,
    philosophy: '桌球國家級裁判，具備豐富的青少年運動教學經驗，課程生動有趣。',
    experience: '5年青少年教學經驗 / 國家級裁判'
  },
  {
    email: 'chang@test.com',
    password: 'Test1234!',
    name: '張阿家',
    university: '國立台灣藝術大學',
    service_areas: '吉他',
    location: '台中市',
    base_price: 1000,
    philosophy: '職業吉他手，擅長民謠吉他與電吉他，曾參與多次商業錄音與演出。',
    experience: '8年職業演出與教學經驗'
  },
  {
    email: 'chen@test.com',
    password: 'Test1234!',
    name: '陳建州',
    university: '輔仁大學',
    service_areas: '籃球',
    location: '台北市',
    base_price: 900,
    philosophy: '專注於進階體能訓練與爆發力開發，適合想在場上尋求突破的球員。',
    experience: '6年體能訓練專家'
  }
];

async function seedCoaches() {
  console.log('🚀 開始建立教練種子資料...');

  for (const c of coaches) {
    // 1. 嘗試建立 Auth 使用者
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: c.email,
      password: c.password,
      email_confirm: true
    });

    let userId;

    if (authErr) {
      if (authErr.message.includes('already been registered')) {
        console.log(`ℹ️ 使用者已存在 (${c.name})，正在從 users 表取得用戶 ID...`);
        
        // ✅ 使用 users 表而不是 profiles 表
        const { data: existingUser, error: userErr } = await supabase
          .from('users')
          .select('id')
          .eq('email', c.email)
          .single();

        if (userErr) {
          console.error(`❌ 無法從 users 表找到現有用戶 (${c.name}):`, userErr.message);
          continue;
        }

        userId = existingUser.id;
        console.log(`✅ 找到現有用戶 ID: ${userId}`);

        // 更新 users 表中的名稱（以防不一致）
        const { error: updateUserErr } = await supabase
          .from('users')
          .update({ name: c.name })
          .eq('id', userId);

        if (updateUserErr) {
          console.error(`⚠️ 更新 users 表失敗 (${c.name}):`, updateUserErr.message);
        }

      } else {
        console.error(`❌ Auth 建立失敗 (${c.name}):`, authErr.message);
        continue;
      }
    } else {
      // 新用戶成功建立
      userId = authData.user.id;
      console.log(`✅ 成功建立新用戶：${c.name}`);

      // 建立對應的 users 記錄
      const { error: userErr } = await supabase.from('users').insert({
        id: userId,
        email: c.email,
        name: c.name,
        role: 'coach',
        password: '' // 密鑰已存在 auth 系統中
      });

      if (userErr) {
        console.error(`❌ Users 記錄建立失敗 (${c.name}):`, userErr.message);
      } else {
        console.log(`✅ 成功建立 users 記錄：${c.name}`);
      }
    }

    // 檢查是否已有教練記錄存在
    const { data: existingCoach } = await supabase
      .from('coaches')
      .select('user_id')
      .eq('user_id', userId)
      .single();

    if (existingCoach) {
      // 更新現有教練記錄
      const { error: updateErr } = await supabase
        .from('coaches')
        .update({
          university: c.university,
          service_areas: c.service_areas,
          location: c.location,
          base_price: c.base_price,
          commission_rate: 45,
          philosophy: c.philosophy, // ✅ 使用正確的欄位名稱
          experience: c.experience
        })
        .eq('user_id', userId);

      if (updateErr) {
        console.error(`❌ 教練資料更新失敗 (${c.name}):`, updateErr.message);
      } else {
        console.log(`✅ 成功更新教練資料：${c.name}`);
      }
    } else {
      // 建立新的教練記錄
      const { error: coachErr } = await supabase.from('coaches').insert({
        user_id: userId,
        university: c.university,
        service_areas: c.service_areas,
        location: c.location,
        base_price: c.base_price,
        commission_rate: 45,
        philosophy: c.philosophy, // ✅ 使用正確的欄位名稱
        experience: c.experience
      });

      if (coachErr) {
        console.error(`❌ 教練記錄建立失敗 (${c.name}):`, coachErr.message);
      } else {
        console.log(`✅ 成功建立教練記錄：${c.name}`);
      }
    }
  }

  console.log('✨ 種子資料建立完成！');
}

seedCoaches();
