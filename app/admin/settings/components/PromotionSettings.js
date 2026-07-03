import React, { useState } from 'react';
import { Save, Users, Tag } from 'lucide-react';

export default function PromotionSettings({ settings, onSave, saving }) {
  const [localSettings, setLocalSettings] = useState({
    referral_commission_rate: settings.referral_commission_rate || '3',
    double_referral_commission_rate: settings.double_referral_commission_rate || '2.5',
    pioneer_promo_code: settings.pioneer_promo_code || 'UNIPIONEER',
  });

  const handleChange = (k, v) => setLocalSettings(prev => ({ ...prev, [k]: v }));

  return (
    <div className="settings-panel">
      <div className="panel-header">
        <h2>推廣與推薦 (Promotion)</h2>
        <p>管理雙邊推薦比例與全站統一推廣碼。</p>
      </div>

      <div className="setting-group">
        <h3><Users className="w-5 h-5 text-blue-400 inline-block mr-2" />雙邊推薦分潤機制</h3>
        
        <div className="setting-item">
          <label>單向推薦人抽成比例 (%)</label>
          <p className="desc">A 邀請 B，當 B 消費時，A 可獲得的點數回饋比例。</p>
          <div className="input-with-btn">
            <input 
              type="number" 
              value={localSettings.referral_commission_rate}
              onChange={e => handleChange('referral_commission_rate', e.target.value)}
            />
            <button onClick={() => onSave('referral_commission_rate', localSettings.referral_commission_rate, '單向推薦分潤')} disabled={saving}>
              儲存
            </button>
          </div>
        </div>

        <div className="setting-item">
          <label>雙向推薦（互相綁定）分潤比例 (%)</label>
          <p className="desc">當 A 推薦 B，且 B 也推薦 A 時，雙方能獲得的特惠分潤比例。</p>
          <div className="input-with-btn">
            <input 
              type="number" 
              value={localSettings.double_referral_commission_rate}
              onChange={e => handleChange('double_referral_commission_rate', e.target.value)}
            />
            <button onClick={() => onSave('double_referral_commission_rate', localSettings.double_referral_commission_rate, '雙向推薦分潤')} disabled={saving}>
              儲存
            </button>
          </div>
        </div>
      </div>

      <div className="setting-group">
        <h3><Tag className="w-5 h-5 text-green-400 inline-block mr-2" />活動推廣碼</h3>
        
        <div className="setting-item">
          <label>創始教練註冊邀請碼</label>
          <p className="desc">教練在註冊時輸入此代碼，可自動升級為「創始教練」享有低抽成特權。</p>
          <div className="input-with-btn">
            <input 
              type="text" 
              value={localSettings.pioneer_promo_code}
              onChange={e => handleChange('pioneer_promo_code', e.target.value)}
            />
            <button onClick={() => onSave('pioneer_promo_code', localSettings.pioneer_promo_code, '創始教練邀請碼')} disabled={saving}>
              儲存
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .settings-panel { animation: fadeIn 0.3s ease; }
        .panel-header { margin-bottom: 30px; }
        .panel-header h2 { font-size: 22px; margin: 0 0 8px 0; }
        .panel-header p { color: var(--color-text-muted); margin: 0; }
        
        .setting-group {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
          max-width: 800px;
        }
        .setting-group h3 { margin: 0 0 20px 0; font-size: 18px; color: #fff; }
        .setting-item { margin-bottom: 20px; }
        label { display: block; font-weight: 600; margin-bottom: 4px; }
        .desc { font-size: 13px; color: #94a3b8; margin-bottom: 12px; }
        
        .input-with-btn { display: flex; gap: 12px; }
        input {
          background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1);
          color: #fff; padding: 10px 16px; border-radius: 8px; flex: 1; max-width: 300px;
          outline: none;
        }
        input:focus { border-color: #60a5fa; }
        button {
          background: #4f46e5; color: white; border: none; padding: 0 20px;
          border-radius: 8px; font-weight: 600; cursor: pointer; transition: 0.2s;
        }
        button:hover:not(:disabled) { background: #4338ca; }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
