import React, { useState } from 'react';
import { Calculator, AlertTriangle, CheckCircle, TrendingDown } from 'lucide-react';

export default function ProfitSimulator({ settings }) {
  const [inputs, setInputs] = useState({
    course_price: 1000,
    coach_tier_rate: settings.commission_rate || 45, // default basic coach
    is_pioneer: false,
    student_discount: settings.base_discount_percent || 0,
    referral_bonus: settings.referral_commission_rate || 3,
    rebate_cost: settings.user_rebate_discount || 5, // point cost for future
  });

  const [result, setResult] = useState(null);

  const handleInputChange = (k, v) => {
    setInputs(prev => ({ ...prev, [k]: Number(v) || 0 }));
  };
  const handleCheckboxChange = (k, v) => {
    setInputs(prev => ({ ...prev, [k]: v }));
  };

  const calculateProfit = () => {
    const price = inputs.course_price;
    // 1. 學生實際付款 = 原價 * (1 - 學生折扣)
    const studentPayment = price * (1 - (inputs.student_discount / 100));
    
    // 2. 教練實拿 = 原價 * (1 - 教練被抽成比例)
    // 如果是創始教練，套用創始教練抽成，否則套用選擇的等級抽成
    const actualCommissionRate = inputs.is_pioneer 
      ? Number(settings.pioneer_commission_rate || 30) 
      : inputs.coach_tier_rate;
    
    const coachPayout = price * (1 - (actualCommissionRate / 100));

    // 3. 推薦人分潤 = 學生實付款 * 推薦比例
    const referralCost = studentPayment * (inputs.referral_bonus / 100);

    // 4. 點數回饋成本 = 學生實付款 * 回饋比例 (視為未來負債)
    const rebateCost = studentPayment * (inputs.rebate_cost / 100);

    // 5. 平台最終毛利 = 學生實付款 - 教練實拿 - 推薦人分潤 - 點數回饋成本
    const netProfit = studentPayment - coachPayout - referralCost - rebateCost;
    
    // 6. 平台毛利率 = (平台毛利 / 學生實付款)
    const profitMargin = studentPayment > 0 ? (netProfit / studentPayment) * 100 : 0;

    setResult({
      studentPayment,
      coachPayout,
      referralCost,
      rebateCost,
      netProfit,
      profitMargin
    });
  };

  const minMarginAlert = Number(settings.min_profit_margin_alert || 20);

  return (
    <div className="simulator-panel">
      <div className="panel-header">
        <h2>收益模擬器 (Profit Simulator)</h2>
        <p>在此模擬各種折扣與抽成疊加後的平台最終毛利，防止虧損設定。</p>
      </div>

      <div className="simulator-layout">
        {/* Input Form */}
        <div className="input-section">
          <h3>輸入模擬條件</h3>
          
          <div className="form-group">
            <label>課程原價 (TWD)</label>
            <input type="number" value={inputs.course_price} onChange={e => handleInputChange('course_price', e.target.value)} />
          </div>

          <div className="form-group">
            <label>教練設定抽成 (%)</label>
            <select value={inputs.coach_tier_rate} onChange={e => handleInputChange('coach_tier_rate', e.target.value)}>
              <option value={settings.commission_rate || 45}>一般教練 ({settings.commission_rate || 45}%)</option>
              {/* Parse dynamic coach tiers if available */}
              {(() => {
                try {
                  const tiers = JSON.parse(settings.coach_tier_rates || '[]');
                  return tiers.map(t => (
                    <option key={t.level} value={t.rate}>LV{t.level} 教練 ({t.rate}%)</option>
                  ));
                } catch(e) { return null; }
              })()}
            </select>
          </div>

          <label className="checkbox-label">
            <input type="checkbox" checked={inputs.is_pioneer} onChange={e => handleCheckboxChange('is_pioneer', e.target.checked)} />
            此為創始教練 (強制套用創始抽成 {settings.pioneer_commission_rate || 30}%)
          </label>

          <div className="form-group mt-4">
            <label>學生享有折扣 (%)</label>
            <input type="number" value={inputs.student_discount} onChange={e => handleInputChange('student_discount', e.target.value)} />
          </div>

          <div className="form-group">
            <label>推薦人分潤比例 (%)</label>
            <input type="number" value={inputs.referral_bonus} onChange={e => handleInputChange('referral_bonus', e.target.value)} />
          </div>

          <div className="form-group">
            <label>購課贈點回饋成本 (%)</label>
            <input type="number" value={inputs.rebate_cost} onChange={e => handleInputChange('rebate_cost', e.target.value)} />
          </div>

          <button className="calc-btn" onClick={calculateProfit}>
            <Calculator className="w-5 h-5" /> 立即試算
          </button>
        </div>

        {/* Output Result */}
        <div className="result-section">
          {result ? (
            <div className="result-card">
              <h3>試算結果分析</h3>
              
              <div className="result-row">
                <span>學生實際付款</span>
                <span className="value text-blue-400">NT$ {Math.round(result.studentPayment)}</span>
              </div>
              
              <div className="result-row">
                <span>教練實拿金額</span>
                <span className="value text-green-400">- NT$ {Math.round(result.coachPayout)}</span>
              </div>
              
              <div className="result-row">
                <span>推薦人分潤支出</span>
                <span className="value text-orange-400">- NT$ {Math.round(result.referralCost)}</span>
              </div>

              <div className="result-row">
                <span>點數回饋成本預留</span>
                <span className="value text-purple-400">- NT$ {Math.round(result.rebateCost)}</span>
              </div>

              <hr className="divider" />

              <div className="result-row total">
                <span>平台最終毛利</span>
                <span className={`value ${result.netProfit >= 0 ? 'text-white' : 'text-red-500'}`}>
                  NT$ {Math.round(result.netProfit)}
                </span>
              </div>

              <div className="result-row margin">
                <span>最終毛利率</span>
                <span className={`value ${result.profitMargin >= minMarginAlert ? 'text-green-500' : 'text-red-500'}`}>
                  {result.profitMargin.toFixed(1)}%
                </span>
              </div>

              {/* Alert Logic */}
              {result.profitMargin < minMarginAlert && (
                <div className="alert-box danger">
                  <AlertTriangle className="w-6 h-6 shrink-0" />
                  <div>
                    <strong>此組合會造成平台利潤不足！</strong>
                    <p>目前毛利率 {result.profitMargin.toFixed(1)}% 低於警戒值 ({minMarginAlert}%)，可能的元凶：</p>
                    <ul className="alert-reasons">
                      {inputs.student_discount > 10 && <li>- 學生折扣過高 ({inputs.student_discount}%)</li>}
                      {inputs.is_pioneer && <li>- 創始教練免抽成/低抽成導致獲利壓縮</li>}
                      {inputs.referral_bonus > 5 && <li>- 推薦人分潤支出過高</li>}
                      {result.netProfit < 0 && <li>- 嚴重警告：這筆訂單平台會倒貼錢！</li>}
                    </ul>
                  </div>
                </div>
              )}

              {result.profitMargin >= minMarginAlert && (
                <div className="alert-box success">
                  <CheckCircle className="w-6 h-6 shrink-0" />
                  <div>
                    <strong>利潤健康</strong>
                    <p>此規則組合符合商業邏輯，平台擁有合理現金流。</p>
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="empty-result">
              <TrendingDown className="w-16 h-16 text-gray-600 mb-4" />
              <p>請輸入左側參數並點擊「立即試算」</p>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .simulator-panel {
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
        .simulator-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
        }
        @media (max-width: 800px) {
          .simulator-layout {
            grid-template-columns: 1fr;
          }
        }
        .input-section {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 16px;
          padding: 24px;
        }
        .input-section h3 {
          margin: 0 0 20px 0;
          color: #fff;
          font-size: 18px;
        }
        .form-group {
          margin-bottom: 16px;
        }
        .form-group label {
          display: block;
          font-weight: 600;
          margin-bottom: 6px;
          color: #cbd5e1;
          font-size: 14px;
        }
        .form-group input, .form-group select {
          width: 100%;
          background: rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.1);
          color: #fff;
          padding: 10px 16px;
          border-radius: 8px;
          outline: none;
        }
        .form-group input:focus, .form-group select:focus {
          border-color: #f59e0b;
        }
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
          color: #f59e0b;
          cursor: pointer;
        }
        .calc-btn {
          width: 100%;
          padding: 14px;
          margin-top: 24px;
          background: #f59e0b;
          color: #000;
          font-weight: bold;
          font-size: 16px;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: 0.2s;
        }
        .calc-btn:hover {
          background: #d97706;
        }

        .result-section {
          display: flex;
          flex-direction: column;
        }
        .empty-result {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(0,0,0,0.2);
          border: 1px dashed rgba(255,255,255,0.1);
          border-radius: 16px;
          min-height: 300px;
        }
        .result-card {
          background: #1e1b4b; /* dark indigo */
          border: 1px solid #3730a3;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.5);
        }
        .result-card h3 {
          margin: 0 0 20px 0;
          color: #fff;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          padding-bottom: 12px;
        }
        .result-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          color: #cbd5e1;
          font-size: 15px;
        }
        .result-row .value {
          font-weight: 700;
          font-family: monospace;
          font-size: 16px;
        }
        .divider {
          border: none;
          border-top: 1px dashed rgba(255,255,255,0.2);
          margin: 20px 0;
        }
        .result-row.total {
          font-size: 18px;
          color: #fff;
        }
        .result-row.total .value {
          font-size: 24px;
        }
        .result-row.margin {
          font-size: 16px;
        }
        
        .alert-box {
          margin-top: 24px;
          padding: 16px;
          border-radius: 12px;
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }
        .alert-box.danger {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #fca5a5;
        }
        .alert-box.success {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #6ee7b7;
        }
        .alert-box strong {
          display: block;
          margin-bottom: 4px;
          color: #fff;
          font-size: 16px;
        }
        .alert-box p {
          margin: 0;
          font-size: 14px;
        }
        .alert-reasons {
          margin: 10px 0 0 0;
          padding-left: 0;
          list-style: none;
          font-size: 13px;
          color: #f87171;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
