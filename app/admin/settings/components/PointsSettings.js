import React, { useState } from 'react';
import { Save, Gift, Coins, CalendarDays } from 'lucide-react';

export default function PointsSettings({ settings, onSave, saving }) {
  const [localSettings, setLocalSettings] = useState({
    rebate_percent: settings.user_rebate_discount || '5',
    max_point_discount_percent: settings.max_point_discount_percent || '100',
    points_expire_days: settings.points_expire_days || '365',
  });

  const [depositBonusTiers, setDepositBonusTiers] = useState(() => {
    try { return JSON.parse(settings.deposit_bonus_tiers || '[]'); } catch(e) { return []; }
  });

  const handleChange = (k, v) => setLocalSettings(prev => ({ ...prev, [k]: v }));

  const handleSaveBonusTiers = () => onSave('deposit_bonus_tiers', depositBonusTiers, '儲值贈點級距');

  const updateBonusTier = (idx, field, val) => {
    const newTiers = [...depositBonusTiers];
    newTiers[idx] = { ...newTiers[idx], [field]: val };
    setDepositBonusTiers(newTiers);
  };

  const addBonusTier = () => {
    setDepositBonusTiers([...depositBonusTiers, { deposit: 0, bonus: 0 }]);
  };

  const removeBonusTier = (idx) => {
    setDepositBonusTiers(depositBonusTiers.filter((_, i) => i !== idx));
  };

  return (
    <div className="settings-panel">
      <div className="panel-header">
        <h2>點數經濟 (Points)</h2>
        <p>管理平台點數的儲值贈點、消費回饋與折抵上限。</p>
      </div>

      <div className="points-layout">
        <div className="left-col">
          <div className="setting-group">
            <h3><Coins className="w-5 h-5 text-yellow-400 inline-block mr-2" />消費回饋與折抵</h3>
            
            <div className="setting-item">
              <label>全站基礎消費回饋 (%)</label>
              <p className="desc">學生購課後，系統回饋點數的比例 (1點 = 1元)。</p>
              <div className="input-with-btn">
                <input 
                  type="number" 
                  value={localSettings.rebate_percent}
                  onChange={e => handleChange('rebate_percent', e.target.value)}
                />
                <button onClick={() => onSave('user_rebate_discount', localSettings.rebate_percent, '消費回饋比例')} disabled={saving}>
                  儲存
                </button>
              </div>
            </div>

            <div className="setting-item">
              <label>最高折抵上限 (%)</label>
              <p className="desc">每筆訂單，點數最多可以折抵課程原價的百分比 (例如設為 50，則 1000 元課程最多只能用 500 點)。</p>
              <div className="input-with-btn">
                <input 
                  type="number" 
                  value={localSettings.max_point_discount_percent}
                  onChange={e => handleChange('max_point_discount_percent', e.target.value)}
                />
                <button onClick={() => onSave('max_point_discount_percent', localSettings.max_point_discount_percent, '最高折抵上限')} disabled={saving}>
                  儲存
                </button>
              </div>
            </div>
          </div>

          <div className="setting-group">
            <h3><CalendarDays className="w-5 h-5 text-purple-400 inline-block mr-2" />點數效期</h3>
            
            <div className="setting-item">
              <label>一般點數有效期限 (天)</label>
              <p className="desc">從獲得點數當天算起，多久後會過期失效。</p>
              <div className="input-with-btn">
                <input 
                  type="number" 
                  value={localSettings.points_expire_days}
                  onChange={e => handleChange('points_expire_days', e.target.value)}
                />
                <button onClick={() => onSave('points_expire_days', localSettings.points_expire_days, '點數有效期限')} disabled={saving}>
                  儲存
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="right-col">
          <div className="setting-group">
            <h3><Gift className="w-5 h-5 text-red-400 inline-block mr-2" />儲值贈點級距 (Deposit Bonus)</h3>
            <p className="desc">設定學生儲值點數時，額外贈送的紅利點數。</p>
            
            {depositBonusTiers.map((tier, i) => (
              <div key={i} className="bonus-row">
                <div className="input-box">
                  <label>儲值金額 (NT$)</label>
                  <input type="number" value={tier.deposit} onChange={e => updateBonusTier(i, 'deposit', Number(e.target.value))} />
                </div>
                <div className="plus-sign">+</div>
                <div className="input-box">
                  <label>贈送點數 (Points)</label>
                  <input type="number" value={tier.bonus} onChange={e => updateBonusTier(i, 'bonus', Number(e.target.value))} />
                </div>
                <button className="del-btn" onClick={() => removeBonusTier(i)}>X</button>
              </div>
            ))}
            
            <div className="bonus-actions">
              <button className="add-btn" onClick={addBonusTier}>+ 新增級距</button>
              <button className="save-btn" onClick={handleSaveBonusTiers} disabled={saving}>
                <Save className="w-4 h-4" /> 儲存級距表
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .settings-panel { animation: fadeIn 0.3s ease; }
        .panel-header { margin-bottom: 30px; }
        .panel-header h2 { font-size: 22px; margin: 0 0 8px 0; }
        .panel-header p { color: var(--color-text-muted); margin: 0; }
        
        .points-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
        }
        @media (max-width: 900px) {
          .points-layout { grid-template-columns: 1fr; }
        }

        .setting-group {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
        }
        .setting-group h3 {
          margin: 0 0 16px 0;
          font-size: 18px;
          color: #fff;
        }
        
        .setting-item { margin-bottom: 24px; }
        .setting-item:last-child { margin-bottom: 0; }
        label { display: block; font-weight: 600; margin-bottom: 6px; font-size: 14px; }
        .desc { font-size: 13px; color: #94a3b8; margin-bottom: 12px; }
        
        .input-with-btn { display: flex; gap: 12px; }
        input {
          background: rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.1);
          color: #fff;
          padding: 10px 16px;
          border-radius: 8px;
          flex: 1;
          outline: none;
        }
        input:focus { border-color: #eab308; }
        
        button {
          background: #4f46e5; color: white; border: none; padding: 0 16px;
          border-radius: 8px; font-weight: bold; cursor: pointer;
        }
        button:hover:not(:disabled) { background: #4338ca; }

        .bonus-row {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(0,0,0,0.2);
          padding: 16px;
          border-radius: 12px;
          margin-bottom: 12px;
        }
        .input-box { flex: 1; }
        .plus-sign { font-size: 24px; font-weight: bold; color: #94a3b8; margin-top: 20px; }
        .del-btn { background: #ef4444; padding: 0; width: 36px; height: 36px; border-radius: 8px; margin-top: 20px; }
        .del-btn:hover { background: #dc2626; }
        
        .bonus-actions {
          display: flex;
          justify-content: space-between;
          margin-top: 20px;
        }
        .add-btn { background: rgba(255,255,255,0.1); color: #fff; padding: 10px 16px; border-radius: 8px; }
        .add-btn:hover { background: rgba(255,255,255,0.2); }
        .save-btn { display: flex; align-items: center; gap: 8px; padding: 10px 20px; }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
