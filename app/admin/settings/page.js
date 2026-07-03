'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Settings, Loader2, DollarSign, Shield, Star, 
  TrendingUp, Eye, FileText, Calculator
} from 'lucide-react';

// We will import these components once created
import RevenueSettings from './components/RevenueSettings';
import MembershipSettings from './components/MembershipSettings';
import PointsSettings from './components/PointsSettings';
import PromotionSettings from './components/PromotionSettings';
import ExposureSettings from './components/ExposureSettings';
import PolicySettings from './components/PolicySettings';
import ProfitSimulator from './components/ProfitSimulator';

const TABS = [
  { id: 'revenue', label: '收入與利潤 (Revenue)', icon: DollarSign },
  { id: 'membership', label: '會員制度 (Membership)', icon: Shield },
  { id: 'points', label: '點數經濟 (Points)', icon: Star },
  { id: 'promotion', label: '推廣與推薦 (Promotion)', icon: TrendingUp },
  { id: 'exposure', label: '曝光與排名 (Exposure)', icon: Eye },
  { id: 'policy', label: '平台政策 (Policy)', icon: FileText },
  { id: 'simulator', label: '收益模擬器 (Simulator)', icon: Calculator, isSpecial: true },
];

export default function BusinessRuleEngine() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('revenue');
  const router = useRouter();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          const parseJSON = (str, fallback) => {
            try { return str ? JSON.parse(str) : fallback; } catch(e) { return fallback; }
          };
          
          // Parse complex settings or set defaults
          setSettings({
            ...data.settings,
            coach_tier_rates: parseJSON(data.settings.coach_tier_rates, [{ level: 1, rate: 45, requirement: {} }]),
            user_tier_discounts: parseJSON(data.settings.user_tier_discounts, [{ level: 1, discount: 5, requirement: {} }]),
            top_coach_settings: parseJSON(data.settings.top_coach_settings, { enabled: true, top_n: 50, bonus_discount: 5 }),
            deposit_bonus_tiers: parseJSON(data.settings.deposit_bonus_tiers, [{ deposit: 10000, bonus: 1000 }]),
            coach_review_titles: parseJSON(data.settings.coach_review_titles, ['優良教師', '細心指導', '幽默風趣']),
            student_review_titles: parseJSON(data.settings.student_review_titles, ['優質學生', '準時出席', '認真學習']),
          });
        }
      } else if (res.status === 403) {
        router.push('/dashboard/admin');
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (key, value, description = '') => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value, description })
      });
      if (res.ok) {
        setSettings(prev => ({ ...prev, [key]: typeof value === 'object' ? JSON.stringify(value) : value }));
        setMessage({ type: 'success', text: '設定已更新，全平台即刻生效' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: '更新失敗' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: '系統錯誤' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0f111a] text-white">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-3 text-lg">載入商業規則中...</span>
      </div>
    );
  }

  return (
    <div className="bre-container">
      {/* Toast Notification */}
      {message && (
        <div className={`toast-message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="bre-header">
        <div className="header-left">
          <div className="icon-badge"><Settings className="w-8 h-8 text-blue-400" /></div>
          <div>
            <h1>Business Rule Engine</h1>
            <p>商業規則中心：在此修改的所有參數將「即刻生效」，請謹慎操作。</p>
          </div>
        </div>
      </div>

      <div className="bre-layout">
        {/* Sidebar */}
        <aside className="bre-sidebar">
          <nav>
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  className={`tab-btn ${activeTab === tab.id ? 'active' : ''} ${tab.isSpecial ? 'special-tab' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="bre-main">
          <div className="tab-content">
            {activeTab === 'revenue' && <RevenueSettings settings={settings} onSave={handleSave} saving={saving} />}
            {activeTab === 'membership' && <MembershipSettings settings={settings} onSave={handleSave} saving={saving} />}
            {activeTab === 'points' && <PointsSettings settings={settings} onSave={handleSave} saving={saving} />}
            {activeTab === 'promotion' && <PromotionSettings settings={settings} onSave={handleSave} saving={saving} />}
            {activeTab === 'exposure' && <ExposureSettings settings={settings} onSave={handleSave} saving={saving} />}
            {activeTab === 'policy' && <PolicySettings settings={settings} onSave={handleSave} saving={saving} />}
            {activeTab === 'simulator' && <ProfitSimulator settings={settings} />}
          </div>
        </main>
      </div>

      <style jsx>{`
        .bre-container {
          min-height: 100vh;
          background: var(--color-bg, #0f111a);
          color: var(--text-light, #e2e8f0);
          padding: 30px;
          font-family: 'Noto Sans TC', sans-serif;
        }
        .bre-header {
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .icon-badge {
          width: 56px;
          height: 56px;
          background: rgba(96, 165, 250, 0.1);
          border: 1px solid rgba(96, 165, 250, 0.2);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        h1 {
          font-size: 28px;
          font-weight: 800;
          margin: 0 0 4px 0;
          color: #fff;
        }
        p {
          margin: 0;
          color: #94a3b8;
          font-size: 14px;
        }
        
        .bre-layout {
          display: grid;
          grid-template-columns: 260px 1fr;
          gap: 30px;
          align-items: start;
        }

        .bre-sidebar {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 20px;
          padding: 16px;
          position: sticky;
          top: 30px;
        }
        .bre-sidebar nav {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .tab-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 14px 16px;
          background: transparent;
          border: none;
          border-radius: 12px;
          color: #94a3b8;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }
        .tab-btn:hover {
          background: rgba(255,255,255,0.05);
          color: #e2e8f0;
        }
        .tab-btn.active {
          background: #4f46e5;
          color: #fff;
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
        }
        .tab-btn.special-tab {
          margin-top: 20px;
          border: 1px solid rgba(244, 114, 182, 0.3);
          color: #f472b6;
        }
        .tab-btn.special-tab:hover {
          background: rgba(244, 114, 182, 0.1);
        }
        .tab-btn.special-tab.active {
          background: #db2777;
          color: #fff;
          border-color: #db2777;
          box-shadow: 0 4px 12px rgba(219, 39, 119, 0.3);
        }

        .bre-main {
          background: var(--color-surface, #1e212b);
          border: 1px solid var(--color-border, #2d303b);
          border-radius: 24px;
          padding: 30px;
          min-height: 70vh;
        }

        .toast-message {
          position: fixed;
          top: 24px;
          right: 24px;
          padding: 16px 24px;
          border-radius: 12px;
          color: white;
          font-weight: bold;
          z-index: 1000;
          animation: slideIn 0.3s ease-out forwards;
          box-shadow: 0 10px 25px rgba(0,0,0,0.3);
        }
        .toast-message.success {
          background: #10b981;
        }
        .toast-message.error {
          background: #ef4444;
        }

        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        
        @media (max-width: 1024px) {
          .bre-layout {
            grid-template-columns: 1fr;
          }
          .bre-sidebar {
            position: static;
          }
        }
      `}</style>
    </div>
  );
}
