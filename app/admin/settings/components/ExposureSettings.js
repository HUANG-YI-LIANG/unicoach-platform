import React, { useState } from 'react';
import { Save, Eye, Search, TrendingUp } from 'lucide-react';

export default function ExposureSettings({ settings, onSave, saving }) {
  const [topCoach, setTopCoach] = useState(() => {
    try { return JSON.parse(settings.top_coach_settings || '{}'); } catch(e) { return {}; }
  });

  const handleSaveTopCoach = () => {
    onSave('top_coach_settings', topCoach, '百大教練曝光權重設定');
  };

  const updateTopCoach = (k, v) => setTopCoach(prev => ({ ...prev, [k]: v }));

  return (
    <div className="settings-panel">
      <div className="panel-header">
        <h2>曝光與排名 (Exposure)</h2>
        <p>調整首頁與搜尋結果的排序權重，決定誰能獲得更多流量。</p>
      </div>

      <div className="setting-group">
        <h3><TrendingUp className="w-5 h-5 text-purple-400 inline-block mr-2" />熱門教練推薦機制 (Top Coaches)</h3>
        <p className="desc">系統會自動篩選表現優異的教練，在首頁賦予更高的曝光度。</p>
        
        <div className="setting-item">
          <label>是否啟用首頁熱門推薦區塊</label>
          <div className="toggle-switch">
            <input 
              type="checkbox" 
              id="top-enabled"
              checked={topCoach.enabled ?? true}
              onChange={e => updateTopCoach('enabled', e.target.checked)}
            />
            <label htmlFor="top-enabled">啟用</label>
          </div>
        </div>

        <div className="setting-item">
          <label>擷取前 N 名教練 (Top N)</label>
          <p className="desc">首頁輪播圖最多展示幾位熱門教練。</p>
          <input 
            type="number" 
            value={topCoach.top_n || 50}
            onChange={e => updateTopCoach('top_n', Number(e.target.value))}
          />
        </div>

        <div className="setting-item">
          <label>百大教練專屬加碼折扣 (%)</label>
          <p className="desc">為上榜的教練自動掛上促銷標籤，刺激學生購買。</p>
          <input 
            type="number" 
            value={topCoach.bonus_discount || 5}
            onChange={e => updateTopCoach('bonus_discount', Number(e.target.value))}
          />
        </div>

        <button className="save-btn" onClick={handleSaveTopCoach} disabled={saving}>
          <Save className="w-4 h-4" /> 儲存排名設定
        </button>
      </div>

      <div className="setting-group blur-layer">
        <h3><Search className="w-5 h-5 text-gray-400 inline-block mr-2" />搜尋演算法權重 (即將推出)</h3>
        <p className="desc">未來可調整：評價分數佔比、回覆率加權、新手扶持曝光係數等。</p>
        <button disabled>建置中...</button>
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
          max-width: 600px;
        }
        .setting-group h3 { margin: 0 0 8px 0; font-size: 18px; color: #fff; }
        .setting-item { margin-bottom: 20px; }
        label { display: block; font-weight: 600; margin-bottom: 6px; }
        .desc { font-size: 13px; color: #94a3b8; margin-bottom: 12px; }
        
        input[type="number"] {
          background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1);
          color: #fff; padding: 10px 16px; border-radius: 8px; width: 100%; max-width: 200px;
          outline: none;
        }
        input[type="number"]:focus { border-color: #a855f7; }

        .toggle-switch {
          display: flex; align-items: center; gap: 8px;
        }

        .save-btn {
          display: flex; align-items: center; gap: 8px;
          background: #4f46e5; color: white; border: none; padding: 10px 20px;
          border-radius: 8px; font-weight: 600; cursor: pointer; transition: 0.2s;
          margin-top: 10px;
        }
        .save-btn:hover:not(:disabled) { background: #4338ca; }
        
        .blur-layer { opacity: 0.5; cursor: not-allowed; }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
