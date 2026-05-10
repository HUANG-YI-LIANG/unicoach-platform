'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function MatchForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const audience = searchParams.get('audience') || 'student'; // 'student', 'parent', or 'coach'

  // 學員端欄位
  const [studentForm, setStudentForm] = useState({
    sport: '',
    role: audience === 'parent' ? '家長幫小孩找' : '學生自己找',
    level: '',
    region: '',
    format: '',
    goal: ''
  });

  // 教練端欄位
  const [coachForm, setCoachForm] = useState({
    sport: '',
    targetAudience: '皆可',
    experience: '',
    region: '',
    format: '',
    philosophy: ''
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

  const handleStudentSubmit = (e) => {
    e.preventDefault();
    try {
      localStorage.setItem('unicoach_match_request_v1', JSON.stringify({
        ...studentForm, submittedAt: new Date().toISOString(), audience
      }));
    } catch (err) {}

    const query = new URLSearchParams();
    if (studentForm.sport) query.set('sport', studentForm.sport);
    if (studentForm.region) query.set('region', studentForm.region);
    Object.entries(utmParams).forEach(([key, value]) => query.set(key, value));

    router.push(`/coaches?${query.toString()}`);
  };

  const handleCoachSubmit = (e) => {
    e.preventDefault();
    try {
      localStorage.setItem('unicoach_coach_apply_v1', JSON.stringify({
        ...coachForm, submittedAt: new Date().toISOString()
      }));
    } catch (err) {}

    // 導向註冊頁面，並帶上 role=coach
    const query = new URLSearchParams();
    query.set('role', 'coach');
    Object.entries(utmParams).forEach(([key, value]) => query.set(key, value));

    router.push(`/register?${query.toString()}`);
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

  if (audience === 'coach') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-page)', padding: '40px 20px', color: 'var(--text-main)' }}>
        <div style={{ maxWidth: '500px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 900, marginBottom: '8px', color: 'var(--primary)' }}>
              1 分鐘建立教練檔案
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              告訴我們你想教什麼，我們幫你媒合附近的學生！
            </p>
          </div>

          <form onSubmit={handleCoachSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', background: 'var(--bg-surface)', padding: '24px', borderRadius: '24px', boxShadow: 'var(--shadow-md)' }}>
            
            <div>
              <label style={labelStyle}>你想教什麼運動？</label>
              <select required value={coachForm.sport} onChange={e => setCoachForm({...coachForm, sport: e.target.value})} style={inputStyle}>
                <option value="" disabled>請選擇運動項目</option>
                <option value="籃球">籃球</option>
                <option value="網球">網球</option>
                <option value="羽球">羽球</option>
                <option value="健身">健身</option>
                <option value="游泳">游泳</option>
                <option value="瑜珈">瑜珈</option>
                <option value="桌球">桌球</option>
                <option value="排球">排球</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>你想教哪種學員？</label>
              <select required value={coachForm.targetAudience} onChange={e => setCoachForm({...coachForm, targetAudience: e.target.value})} style={inputStyle}>
                <option value="皆可">皆可 (兒童/學生/成人)</option>
                <option value="兒童/國小生">兒童/國小生</option>
                <option value="國高中/大學生">國高中/大學生</option>
                <option value="成人/上班族">成人/上班族</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>你的教學經驗 / 程度</label>
              <select required value={coachForm.experience} onChange={e => setCoachForm({...coachForm, experience: e.target.value})} style={inputStyle}>
                <option value="" disabled>請選擇教學經驗</option>
                <option value="無教學經驗，但有系隊/校隊底子">無教學經驗，但有系隊/校隊底子</option>
                <option value="有少數指導學弟妹或新手的經驗">有少數指導學弟妹或新手的經驗</option>
                <option value="豐富教學經驗 (接過家教/助教)">豐富教學經驗 (接過家教/助教)</option>
                <option value="專業教練 (具備證照)">專業教練 (具備證照)</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>想在哪裡上課？ (可填寫縣市或行政區)</label>
              <input 
                required type="text" placeholder="例如：台北市 大安區" 
                value={coachForm.region} onChange={e => setCoachForm({...coachForm, region: e.target.value})} 
                style={inputStyle} 
              />
            </div>

            <div>
              <label style={labelStyle}>偏好的課程形式</label>
              <select required value={coachForm.format} onChange={e => setCoachForm({...coachForm, format: e.target.value})} style={inputStyle}>
                <option value="" disabled>請選擇課程形式</option>
                <option value="一對一專屬指導">一對一專屬指導</option>
                <option value="一對二 (或小班制)">一對二 (或小班制)</option>
                <option value="皆可配合">皆可配合</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>想要教學的內容、理念是？</label>
              <textarea 
                required placeholder="例如：希望能從基礎帶起，注重不受傷的正確姿勢，並且讓學生在快樂中學習..." 
                value={coachForm.philosophy} onChange={e => setCoachForm({...coachForm, philosophy: e.target.value})} 
                style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} 
              />
            </div>

            <button type="submit" style={{
              width: '100%', padding: '16px', marginTop: '8px',
              background: 'var(--color-accent)', color: 'var(--text-light)',
              border: 'none', borderRadius: '16px', fontSize: '16px', fontWeight: 900,
              cursor: 'pointer', boxShadow: '0 8px 24px rgba(245, 158, 11, 0.3)'
            }}>
              下一步：註冊教練帳號
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 學員/家長端
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', padding: '40px 20px', color: 'var(--text-main)' }}>
      <div style={{ maxWidth: '500px', margin: '0 auto' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 900, marginBottom: '8px', color: 'var(--primary)' }}>
            1 分鐘快速媒合教練
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            {audience === 'parent' 
              ? '告訴我們孩子的學習需求，系統會自動推薦最適合的教練給您！' 
              : '告訴我們你的學習需求，系統會自動推薦最適合的教練！'}
          </p>
        </div>

        <form onSubmit={handleStudentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', background: 'var(--bg-surface)', padding: '24px', borderRadius: '24px', boxShadow: 'var(--shadow-md)' }}>
          
          <div>
            <label style={labelStyle}>你想學什麼運動？</label>
            <select required value={studentForm.sport} onChange={e => setStudentForm({...studentForm, sport: e.target.value})} style={inputStyle}>
              <option value="" disabled>請選擇運動項目</option>
              <option value="籃球">籃球</option>
              <option value="網球">網球</option>
              <option value="羽球">羽球</option>
              <option value="健身">健身</option>
              <option value="游泳">游泳</option>
              <option value="瑜珈">瑜珈</option>
              <option value="桌球">桌球</option>
              <option value="排球">排球</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>學員身份</label>
            <select required value={studentForm.role} onChange={e => setStudentForm({...studentForm, role: e.target.value})} style={inputStyle}>
              <option value="學生自己找">學生自己找</option>
              <option value="家長幫小孩找">家長幫小孩找</option>
              <option value="上班族/成人">上班族/成人</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>目前程度</label>
            <select required value={studentForm.level} onChange={e => setStudentForm({...studentForm, level: e.target.value})} style={inputStyle}>
              <option value="" disabled>請選擇目前程度</option>
              <option value="完全新手 (0基礎)">完全新手 (0基礎)</option>
              <option value="初學 (懂一點規則/碰過幾次)">初學 (懂一點規則/碰過幾次)</option>
              <option value="進階 (有校隊/系隊經驗想精進)">進階 (有校隊/系隊經驗想精進)</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>想上課的地區 (可填寫縣市或行政區)</label>
            <input 
              required type="text" placeholder="例如：台北市 大安區" 
              value={studentForm.region} onChange={e => setStudentForm({...studentForm, region: e.target.value})} 
              style={inputStyle} 
            />
          </div>

          <div>
            <label style={labelStyle}>偏好的課程形式</label>
            <select required value={studentForm.format} onChange={e => setStudentForm({...studentForm, format: e.target.value})} style={inputStyle}>
              <option value="" disabled>請選擇課程形式</option>
              <option value="一對一專屬指導">一對一專屬指導</option>
              <option value="一對二 (找朋友一起)">一對二 (找朋友一起)</option>
              <option value="團體班">團體班</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>最想達成的目標是？</label>
            <textarea 
              required placeholder="例如：想學會基礎運球、想減肥、想培養運動習慣..." 
              value={studentForm.goal} onChange={e => setStudentForm({...studentForm, goal: e.target.value})} 
              style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} 
            />
          </div>

          <button type="submit" style={{
            width: '100%', padding: '16px', marginTop: '8px',
            background: 'var(--color-accent)', color: 'var(--text-light)',
            border: 'none', borderRadius: '16px', fontSize: '16px', fontWeight: 900,
            cursor: 'pointer', boxShadow: '0 8px 24px rgba(245, 158, 11, 0.3)'
          }}>
            送出需求，查看推薦教練
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
