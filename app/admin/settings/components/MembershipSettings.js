import React, { useState } from 'react';
import { Save, Shield, Star, Award, Smartphone } from 'lucide-react';

export default function MembershipSettings({ settings, onSave, saving }) {
  const [coachTiers, setCoachTiers] = useState(() => {
    try { return JSON.parse(settings.coach_tier_rates || '[]'); } catch(e) { return []; }
  });
  const [userTiers, setUserTiers] = useState(() => {
    try { return JSON.parse(settings.user_tier_discounts || '[]'); } catch(e) { return []; }
  });

  const handleSaveCoachTiers = () => onSave('coach_tier_rates', coachTiers, '教練等級抽成與門檻');
  const handleSaveUserTiers = () => onSave('user_tier_discounts', userTiers, '學生等級優惠與門檻');

  const updateCoachTier = (idx, field, val) => {
    const newTiers = [...coachTiers];
    newTiers[idx] = { ...newTiers[idx], [field]: val };
    setCoachTiers(newTiers);
  };

  const updateUserTier = (idx, field, val) => {
    const newTiers = [...userTiers];
    newTiers[idx] = { ...newTiers[idx], [field]: val };
    setUserTiers(newTiers);
  };

  return (
    <div className="settings-panel">
      <div className="panel-header">
        <h2>會員制度 (Membership)</h2>
        <p>管理教練與學生的升級門檻與對應權益。</p>
      </div>

      <div className="membership-layout">
        {/* Settings Area */}
        <div className="settings-area">
          
          <div className="setting-group">
            <h3><Shield className="w-5 h-5 text-green-400 inline-block mr-2" />教練等級設定 (Coach Tiers)</h3>
            <p className="desc">等級越高，平台抽成應越低，以此鼓勵教練多開課。</p>
            {coachTiers.map((tier, i) => (
              <div key={i} className="tier-card">
                <div className="tier-header">LV {tier.level} 教練</div>
                <div className="tier-inputs">
                  <div>
                    <label>平台抽成 (%)</label>
                    <input type="number" value={tier.rate} onChange={e => updateCoachTier(i, 'rate', Number(e.target.value))} />
                  </div>
                  <div>
                    <label>升級門檻 (累計完課數)</label>
                    <input 
                      type="number" 
                      value={tier.requirement?.completed_sessions || 0} 
                      onChange={e => {
                        const newTiers = [...coachTiers];
                        newTiers[i].requirement = { ...newTiers[i].requirement, completed_sessions: Number(e.target.value) };
                        setCoachTiers(newTiers);
                      }} 
                    />
                  </div>
                </div>
              </div>
            ))}
            <button className="save-btn" onClick={handleSaveCoachTiers} disabled={saving}>
              <Save className="w-4 h-4" /> 儲存教練等級
            </button>
          </div>

          <div className="setting-group">
            <h3><Star className="w-5 h-5 text-blue-400 inline-block mr-2" />學員等級設定 (Student Tiers)</h3>
            <p className="desc">學生消費越多，享有越高的全館購課折扣。</p>
            {userTiers.map((tier, i) => (
              <div key={i} className="tier-card">
                <div className="tier-header">LV {tier.level} 學生</div>
                <div className="tier-inputs">
                  <div>
                    <label>專屬折扣 (%)</label>
                    <input type="number" value={tier.discount} onChange={e => updateUserTier(i, 'discount', Number(e.target.value))} />
                  </div>
                  <div>
                    <label>升級門檻 (累計消費點數)</label>
                    <input 
                      type="number" 
                      value={tier.requirement?.spent_points || 0} 
                      onChange={e => {
                        const newTiers = [...userTiers];
                        newTiers[i].requirement = { ...newTiers[i].requirement, spent_points: Number(e.target.value) };
                        setUserTiers(newTiers);
                      }} 
                    />
                  </div>
                </div>
              </div>
            ))}
            <button className="save-btn" onClick={handleSaveUserTiers} disabled={saving}>
              <Save className="w-4 h-4" /> 儲存學員等級
            </button>
          </div>

        </div>

        {/* Preview Area (Mockup) */}
        <div className="preview-area">
          <h3><Smartphone className="w-5 h-5 inline-block mr-2" />App 端預覽 (Mockup)</h3>
          
          <div className="mockup-phone">
            <div className="mockup-screen">
              <div className="mockup-header">UniCoach App</div>
              <div className="mockup-content">
                <div className="mockup-card user">
                  <div className="mc-header">
                    <img src="https://ui-avatars.com/api/?name=Student&background=random" alt="Avatar" />
                    <div>
                      <h4>王小明</h4>
                      <span className="badge user">LV 2 學生</span>
                    </div>
                  </div>
                  <div className="mc-body">
                    <p>目前享有 <strong>{userTiers[1]?.discount || 0}%</strong> 購課折扣優惠！</p>
                    <p className="sm-text">距離下一級還差 {userTiers[2]?.requirement?.spent_points || 50000} 點</p>
                  </div>
                </div>

                <div className="mockup-card coach mt-4">
                  <div className="mc-header">
                    <img src="https://ui-avatars.com/api/?name=Coach&background=random" alt="Avatar" />
                    <div>
                      <h4>李教練</h4>
                      <span className="badge coach">LV {coachTiers[0]?.level || 1} 教練</span>
                    </div>
                  </div>
                  <div className="mc-body">
                    <p>目前平台抽成比例為 <strong>{coachTiers[0]?.rate || 45}%</strong>。</p>
                    <p className="sm-text">只要再完成 {coachTiers[1]?.requirement?.completed_sessions || 10} 堂課即可降抽成至 {coachTiers[1]?.rate || 37}%！</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <style jsx>{`
        .settings-panel { animation: fadeIn 0.3s ease; }
        .panel-header { margin-bottom: 30px; }
        .panel-header h2 { font-size: 22px; margin: 0 0 8px 0; }
        .panel-header p { color: var(--color-text-muted); margin: 0; }
        
        .membership-layout {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 30px;
        }
        @media (max-width: 1024px) {
          .membership-layout { grid-template-columns: 1fr; }
        }

        .setting-group {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
        }
        .setting-group h3 {
          margin: 0 0 8px 0;
          font-size: 18px;
          color: #fff;
        }
        .desc {
          font-size: 13px;
          color: #94a3b8;
          margin-bottom: 20px;
        }

        .tier-card {
          background: rgba(0,0,0,0.2);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
        }
        .tier-header {
          font-weight: bold;
          color: #fff;
          margin-bottom: 12px;
          border-bottom: 1px dashed rgba(255,255,255,0.1);
          padding-bottom: 8px;
        }
        .tier-inputs {
          display: flex;
          gap: 16px;
        }
        .tier-inputs > div {
          flex: 1;
        }
        .tier-inputs label {
          display: block;
          font-size: 13px;
          color: #94a3b8;
          margin-bottom: 6px;
        }
        .tier-inputs input {
          width: 100%;
          background: rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.1);
          color: #fff;
          padding: 8px 12px;
          border-radius: 8px;
          outline: none;
        }
        .tier-inputs input:focus { border-color: #4f46e5; }

        .save-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #4f46e5;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.2s;
        }
        .save-btn:hover:not(:disabled) { background: #4338ca; }
        .save-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Mockup iPhone */
        .preview-area h3 {
          color: #e2e8f0;
          margin: 0 0 16px 0;
          font-size: 18px;
        }
        .mockup-phone {
          width: 320px;
          height: 650px;
          background: #111;
          border-radius: 40px;
          border: 12px solid #333;
          position: relative;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        }
        .mockup-phone::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 140px;
          height: 25px;
          background: #333;
          border-bottom-left-radius: 20px;
          border-bottom-right-radius: 20px;
          z-index: 10;
        }
        .mockup-screen {
          background: #0f111a;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        .mockup-header {
          padding: 40px 20px 20px 20px;
          text-align: center;
          font-weight: bold;
          font-size: 18px;
          color: #fff;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .mockup-content {
          padding: 20px;
          flex: 1;
        }
        .mockup-card {
          background: #1e212b;
          border-radius: 16px;
          padding: 16px;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .mockup-card.user { border-left: 4px solid #60a5fa; }
        .mockup-card.coach { border-left: 4px solid #4ade80; }
        .mc-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }
        .mc-header img {
          width: 48px;
          height: 48px;
          border-radius: 50%;
        }
        .mc-header h4 {
          margin: 0 0 4px 0;
          color: #fff;
          font-size: 16px;
        }
        .badge {
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 20px;
          font-weight: bold;
        }
        .badge.user { background: rgba(96, 165, 250, 0.2); color: #60a5fa; }
        .badge.coach { background: rgba(74, 222, 128, 0.2); color: #4ade80; }
        
        .mc-body p {
          margin: 0 0 6px 0;
          color: #cbd5e1;
          font-size: 13px;
          line-height: 1.5;
        }
        .mc-body strong { color: #fff; }
        .sm-text {
          font-size: 12px !important;
          color: #64748b !important;
        }
        .mt-4 { margin-top: 16px; }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
