'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function MatchForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const audience = searchParams.get('audience') || 'student'; // 'student', 'parent', or 'coach'

  // 'sports' or 'tutor'
  const [category, setCategory] = useState('');

  // 統一表單狀態 (將原本的 sport 改稱 item，但在送出時仍以 sport 參數傳遞以相容舊版)
  const [formData, setFormData] = useState({
    item: '', // 運動項目或家教科目
    role: audience === 'parent' ? '家長幫小孩找' : '學生自己找', // for student
    targetAudience: '皆可', // for coach
    levelOrGrade: '', // 目前程度(sports) 或 年級(tutor)
    experience: '', // for coach
    region: '',
    format: '',
    goalOrPhilosophy: '' // 想達成的目標(student) 或 教學理念(coach)
  });

  const [utmParams, setUtmParams] = useState({});

  useEffect(() => {
    const utm = {};
    if (searchParams.get('utm_source')) utm.utm_source = searchParams.get('utm_source');
    if (searchParams.get('utm_medium')) utm.utm_medium = searchParams.get('utm_medium');
    if (searchParams.get('utm_campaign')) utm.utm_campaign = searchParams.get('utm_campaign');
    
    if (!utm.utm_source) {
      if (audience === 'parent') utm.utm_source = 'facebook';
      else if (audience === 'coach') utm.utm_source = 'instagram_coach';
      else utm.utm_source = 'instagram';
    }
    if (!utm.utm_medium) utm.utm_medium = 'match_form';
    
    setUtmParams(utm);
  }, [searchParams, audience]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (audience === 'coach') {
      const coachData = {
        sport: formData.item,
        targetAudience: formData.targetAudience,
        experience: formData.experience,
        region: formData.region,
        format: formData.format,
        philosophy: formData.goalOrPhilosophy,
        category // 紀錄是 sports 還是 tutor
      };
      try {
        localStorage.setItem('unicoach_coach_apply_v1', JSON.stringify({
          ...coachData, submittedAt: new Date().toISOString()
        }));
      } catch (err) {}

      const query = new URLSearchParams();
      query.set('role', 'coach');
      Object.entries(utmParams).forEach(([key, value]) => query.set(key, value));
      router.push(`/register?${query.toString()}`);
    } else {
      const studentData = {
        sport: formData.item,
        role: formData.role,
        level: formData.levelOrGrade,
        region: formData.region,
        format: formData.format,
        goal: formData.goalOrPhilosophy,
        category
      };
      try {
        localStorage.setItem('unicoach_match_request_v1', JSON.stringify({
          ...studentData, submittedAt: new Date().toISOString(), audience
        }));
      } catch (err) {}

      const query = new URLSearchParams();
      if (studentData.sport) query.set('sport', studentData.sport);
      if (studentData.region) query.set('region', studentData.region);
      Object.entries(utmParams).forEach(([key, value]) => query.set(key, value));
      router.push(`/coaches?${query.toString()}`);
    }
  };

  const inputStyle = {
    width: '100%', padding: '14px', borderRadius: '12px',
    border: '1px solid var(--border-main)', background: 'var(--bg-input)',
    color: 'var(--text-main)', fontSize: '15px', outline: 'none'
  };

  const labelStyle = {
    display: 'block', fontSize: '14px', fontWeight: 800,
    color: 'var(--text-main)', marginBottom: '8px'
  };

  // 分流選擇畫面
  if (!category) {
    const isCoach = audience === 'coach';
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-page)', padding: '40px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: '500px', width: '100%', textAlign: 'center' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '16px', color: 'var(--primary)' }}>
            {isCoach ? '你想教授哪種類型？' : '你想找哪種類型的老師？'}
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--text-muted)', marginBottom: '40px' }}>
            {isCoach ? 'UniCoach 支援運動教練與學科家教，請選擇你的專長領域。' : 'UniCoach 支援運動教練與學科家教，請選擇你的學習目標。'}
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <button 
              onClick={() => setCategory('sports')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                padding: '24px', background: 'var(--bg-surface)', border: '2px solid var(--border-main)',
                borderRadius: '24px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: 'var(--shadow-sm)'
              }}
              onMouseOver={e => e.currentTarget.style.borderColor = 'var(--primary)'}
              onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border-main)'}
            >
              <span style={{ fontSize: '32px' }}>🏀</span>
              <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)' }}>
                {isCoach ? '我要當運動教練' : '我要找運動教練'}
              </span>
            </button>
            
            <button 
              onClick={() => setCategory('tutor')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                padding: '24px', background: 'var(--bg-surface)', border: '2px solid var(--border-main)',
                borderRadius: '24px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: 'var(--shadow-sm)'
              }}
              onMouseOver={e => e.currentTarget.style.borderColor = 'var(--color-accent)'}
              onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border-main)'}
            >
              <span style={{ fontSize: '32px' }}>📚</span>
              <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)' }}>
                {isCoach ? '我要當學科家教' : '我要找學科家教'}
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 根據身份與類別設定文案與選項
  const isCoach = audience === 'coach';
  const isSports = category === 'sports';

  const itemOptions = isSports ? (
    <>
      <option value="籃球">籃球</option>
      <option value="網球">網球</option>
      <option value="羽球">羽球</option>
      <option value="健身">健身</option>
      <option value="游泳">游泳</option>
      <option value="瑜珈">瑜珈</option>
      <option value="桌球">桌球</option>
      <option value="排球">排球</option>
    </>
  ) : (
    <>
      <option value="數學">數學</option>
      <option value="英文">英文</option>
      <option value="國文">國文</option>
      <option value="理化">理化 / 自然</option>
      <option value="全科伴讀">全科伴讀</option>
      <option value="程式設計">程式設計</option>
      <option value="其他才藝">其他才藝</option>
    </>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', padding: '40px 20px', color: 'var(--text-main)' }}>
      <div style={{ maxWidth: '500px', margin: '0 auto' }}>
        
        {/* 返回按鈕 */}
        <button 
          onClick={() => setCategory('')} 
          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: '16px', fontSize: '14px', fontWeight: 700 }}
        >
          ← 返回重選類別
        </button>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 900, marginBottom: '8px', color: 'var(--primary)' }}>
            {isCoach ? '1 分鐘建立履歷' : '1 分鐘快速媒合'}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            {isCoach 
              ? `告訴我們你想教什麼${isSports ? '運動' : '科目'}，我們幫你媒合學生！` 
              : `告訴我們你的學習需求，系統會自動推薦最適合的${isSports ? '教練' : '老師'}！`}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', background: 'var(--bg-surface)', padding: '24px', borderRadius: '24px', boxShadow: 'var(--shadow-md)' }}>
          
          <div>
            <label style={labelStyle}>{isCoach ? `你想教什麼${isSports ? '運動' : '科目'}？` : `你想學什麼${isSports ? '運動' : '科目'}？`}</label>
            <select required value={formData.item} onChange={e => setFormData({...formData, item: e.target.value})} style={inputStyle}>
              <option value="" disabled>請選擇{isSports ? '項目' : '科目'}</option>
              {itemOptions}
            </select>
          </div>

          {!isCoach && (
            <div>
              <label style={labelStyle}>學員身份</label>
              <select required value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} style={inputStyle}>
                <option value="學生自己找">學生自己找</option>
                <option value="家長幫小孩找">家長幫小孩找</option>
                <option value="上班族/成人">上班族/成人</option>
              </select>
            </div>
          )}

          {isCoach && (
            <div>
              <label style={labelStyle}>你想教哪種學生？</label>
              <select required value={formData.targetAudience} onChange={e => setFormData({...formData, targetAudience: e.target.value})} style={inputStyle}>
                <option value="皆可">皆可 (兒童/學生/成人)</option>
                <option value="兒童/國小生">兒童/國小生</option>
                <option value="國高中/大學生">國高中/大學生</option>
                <option value="成人/社會人士">成人/社會人士</option>
              </select>
            </div>
          )}

          {!isCoach && (
            <div>
              <label style={labelStyle}>{isSports ? '目前程度' : '學生年級 / 程度'}</label>
              <select required value={formData.levelOrGrade} onChange={e => setFormData({...formData, levelOrGrade: e.target.value})} style={inputStyle}>
                <option value="" disabled>請選擇{isSports ? '程度' : '年級'}</option>
                {isSports ? (
                  <>
                    <option value="完全新手 (0基礎)">完全新手 (0基礎)</option>
                    <option value="初學 (懂一點規則/碰過幾次)">初學 (懂一點規則/碰過幾次)</option>
                    <option value="進階 (有校隊/系隊經驗想精進)">進階 (有校隊/系隊經驗想精進)</option>
                  </>
                ) : (
                  <>
                    <option value="國小/幼兒">國小/幼兒</option>
                    <option value="國中">國中</option>
                    <option value="高中/職">高中/職</option>
                    <option value="大學/成人">大學/成人</option>
                  </>
                )}
              </select>
            </div>
          )}

          {isCoach && (
            <div>
              <label style={labelStyle}>你的教學經驗 / 程度</label>
              <select required value={formData.experience} onChange={e => setFormData({...formData, experience: e.target.value})} style={inputStyle}>
                <option value="" disabled>請選擇教學經驗</option>
                <option value="無經驗，但對本科/本科系有自信">無經驗，但對本科/本科系有自信</option>
                <option value="有少數指導學弟妹或新手的經驗">有少數指導學弟妹或新手的經驗</option>
                <option value="豐富教學經驗 (接過家教/助教)">豐富教學經驗 (接過家教/助教)</option>
                <option value="專業教練/名師 (具備相關證照)">專業教練/老師 (具備相關證照)</option>
              </select>
            </div>
          )}

          <div>
            <label style={labelStyle}>想在哪裡上課？ (可填寫縣市或行政區)</label>
            <input 
              required type="text" placeholder="例如：台北市 大安區" 
              value={formData.region} onChange={e => setFormData({...formData, region: e.target.value})} 
              style={inputStyle} 
            />
          </div>

          <div>
            <label style={labelStyle}>偏好的課程形式</label>
            <select required value={formData.format} onChange={e => setFormData({...formData, format: e.target.value})} style={inputStyle}>
              <option value="" disabled>請選擇課程形式</option>
              <option value="實體一對一指導">實體一對一指導</option>
              <option value="線上視訊教學">線上視訊教學</option>
              <option value="實體小班制 (可找朋友一起)">實體小班制 (可找朋友一起)</option>
              {isCoach && <option value="皆可配合">皆可配合</option>}
            </select>
          </div>

          <div>
            <label style={labelStyle}>{isCoach ? '想要教學的內容、理念是？' : '最想達成的目標是？'}</label>
            <textarea 
              required 
              placeholder={isCoach 
                ? (isSports ? "例如：希望能從基礎帶起，注重不受傷的正確姿勢..." : "例如：希望能引導學生找到讀書方法，不只是死背公式...") 
                : (isSports ? "例如：想學會基礎運球、想減肥、想培養運動習慣..." : "例如：準備會考、希望段考進步、培養學習興趣...")
              }
              value={formData.goalOrPhilosophy} onChange={e => setFormData({...formData, goalOrPhilosophy: e.target.value})} 
              style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} 
            />
          </div>

          <button type="submit" style={{
            width: '100%', padding: '16px', marginTop: '8px',
            background: 'var(--color-accent)', color: 'var(--text-light)',
            border: 'none', borderRadius: '16px', fontSize: '16px', fontWeight: 900,
            cursor: 'pointer', boxShadow: '0 8px 24px rgba(245, 158, 11, 0.3)'
          }}>
            {isCoach ? '下一步：註冊帳號' : '送出需求，查看推薦名單'}
          </button>
        </form>

      </div>
    </div>
  );
}

export default function MatchPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>載入中...</div>}>
      <MatchForm />
    </Suspense>
  );
}
