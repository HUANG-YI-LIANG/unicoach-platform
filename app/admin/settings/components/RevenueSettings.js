import React from 'react';
import { Save, AlertCircle } from 'lucide-react';

export default function RevenueSettings({ settings, onSave, saving }) {
  // Local state to manage inputs before saving
  const [localSettings, setLocalSettings] = React.useState({
    commission_rate: settings.commission_rate || '45',
    pioneer_commission_rate: settings.pioneer_commission_rate || '30',
    base_discount_percent: settings.base_discount_percent || '0',
    refund_fee_percent: settings.refund_fee_percent || '5',
    min_profit_margin_alert: settings.min_profit_margin_alert || '20',
  });

  const handleChange = (k, v) => setLocalSettings(prev => ({ ...prev, [k]: v }));

  return (
    <div className="settings-panel">
      <div className="panel-header">
        <h2>收入與利潤 (Revenue)</h2>
        <p>管理平台所有收入來源與抽成基數。</p>
      </div>

      <div className="setting-group">
        <h3>教練基礎抽成與優惠</h3>
        
        <div className="setting-item">
          <label>教練基礎抽成比例 (%)</label>
          <p className="desc">平台向一般教練收取的手續費比例。</p>
          <div className="input-with-btn">
            <input 
              type="number" 
              value={localSettings.commission_rate}
              onChange={e => handleChange('commission_rate', e.target.value)}
            />
            <button 
              onClick={() => onSave('commission_rate', localSettings.commission_rate, '教練基礎抽成比例')}
              disabled={saving}
            >
              <Save className="w-4 h-4" /> 儲存
            </button>
          </div>
        </div>

        <div className="setting-item">
          <label>創始教練專屬抽成比例 (%)</label>
          <p className="desc">針對創始教練的特殊低抽成優惠。</p>
          <div className="input-with-btn">
            <input 
              type="number" 
              value={localSettings.pioneer_commission_rate}
              onChange={e => handleChange('pioneer_commission_rate', e.target.value)}
            />
            <button 
              onClick={() => onSave('pioneer_commission_rate', localSettings.pioneer_commission_rate, '創始教練專屬抽成比例')}
              disabled={saving}
            >
              <Save className="w-4 h-4" /> 儲存
            </button>
          </div>
        </div>
      </div>

      <div className="setting-group">
        <h3>全站折扣與手續費</h3>

        <div className="setting-item">
          <label>學生全站基礎折扣 (%)</label>
          <p className="desc">例如全館 9 折活動，請輸入 10 (表示 10% off)。</p>
          <div className="input-with-btn">
            <input 
              type="number" 
              value={localSettings.base_discount_percent}
              onChange={e => handleChange('base_discount_percent', e.target.value)}
            />
            <button 
              onClick={() => onSave('base_discount_percent', localSettings.base_discount_percent, '學生全站基礎折扣')}
              disabled={saving}
            >
              <Save className="w-4 h-4" /> 儲存
            </button>
          </div>
        </div>

        <div className="setting-item">
          <label>退款手續費 (%)</label>
          <p className="desc">學生申請退款時，平台收取的手續費比例。</p>
          <div className="input-with-btn">
            <input 
              type="number" 
              value={localSettings.refund_fee_percent}
              onChange={e => handleChange('refund_fee_percent', e.target.value)}
            />
            <button 
              onClick={() => onSave('refund_fee_percent', localSettings.refund_fee_percent, '退款手續費')}
              disabled={saving}
            >
              <Save className="w-4 h-4" /> 儲存
            </button>
          </div>
        </div>
      </div>

      <div className="setting-group critical-group">
        <h3><AlertCircle className="w-5 h-5 text-red-500 inline-block mr-2" />利潤防護網</h3>
        
        <div className="setting-item">
          <label>平台最低利潤警戒值 (%)</label>
          <p className="desc">此數值用於「收益模擬器」，當多重折扣疊加導致毛利率低於此數值時，系統會強制警示。</p>
          <div className="input-with-btn">
            <input 
              type="number" 
              value={localSettings.min_profit_margin_alert}
              onChange={e => handleChange('min_profit_margin_alert', e.target.value)}
            />
            <button 
              onClick={() => onSave('min_profit_margin_alert', localSettings.min_profit_margin_alert, '平台最低利潤警戒值')}
              disabled={saving}
            >
              <Save className="w-4 h-4" /> 儲存
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .settings-panel {
          animation: fadeIn 0.3s ease;
        }
        .panel-header {
          margin-bottom: 30px;
        }
        .panel-header h2 {
          font-size: 22px;
          margin: 0 0 8px 0;
        }
        .panel-header p {
          color: var(--color-text-muted);
          margin: 0;
        }
        .setting-group {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
        }
        .critical-group {
          border-color: rgba(239, 68, 68, 0.3);
          background: rgba(239, 68, 68, 0.05);
        }
        .setting-group h3 {
          margin: 0 0 20px 0;
          font-size: 16px;
          color: #60a5fa;
          display: flex;
          align-items: center;
        }
        .critical-group h3 {
          color: #ef4444;
        }
        .setting-item {
          margin-bottom: 20px;
        }
        .setting-item:last-child {
          margin-bottom: 0;
        }
        label {
          display: block;
          font-weight: 600;
          margin-bottom: 4px;
        }
        .desc {
          font-size: 13px;
          color: #94a3b8;
          margin-bottom: 12px;
        }
        .input-with-btn {
          display: flex;
          gap: 12px;
        }
        input {
          background: rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.1);
          color: #fff;
          padding: 10px 16px;
          border-radius: 8px;
          flex: 1;
          max-width: 200px;
          outline: none;
        }
        input:focus {
          border-color: #60a5fa;
        }
        button {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #4f46e5;
          color: white;
          border: none;
          padding: 0 20px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.2s;
        }
        button:hover:not(:disabled) {
          background: #4338ca;
        }
        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
