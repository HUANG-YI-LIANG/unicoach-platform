'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Settings, Save, Clock, Info, 
  ArrowLeft, Loader2, CheckCircle2 
} from 'lucide-react';

const BLUE  = '#2563EB';
const DARK  = '#0F172A';
const MUTED = '#94A3B8';
const WHITE = '#FFFFFF';
const BG    = '#F8FAFC';

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    no_show_threshold: '15'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.settings) setSettings(data.settings);
      } else if (res.status === 403) {
        router.push('/dashboard/admin');
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (key, value, description) => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value, description })
      });
      if (res.ok) {
        setSettings(prev => ({ ...prev, [key]: value }));
        setMessage({ type: 'success', text: '設定已更新' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: '更新失敗' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: '發生錯誤' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0f] text-[#888899]">
      <Loader2 className="animate-spin mb-4" size={40} />
      <p>正在載入全域設定...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-6 text-[#e8e8f0] font-sans">
      <div className="max-w-2xl mx-auto">
        
        {/* Header */}
        <header className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/dashboard/admin')}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-2xl font-black text-white flex items-center gap-2">
                <Settings className="text-blue-400" />
                全域參數管理
              </h1>
              <p className="text-sm text-[#888899]">調整平台運行規則與認定門檻</p>
            </div>
          </div>
        </header>

        {/* Success/Error Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 ${
            message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
            {message.type === 'success' ? <CheckCircle2 size={18} /> : <Info size={18} />}
            <span className="text-sm font-bold">{message.text}</span>
          </div>
        )}

        <div className="space-y-6">
          
          {/* Setting: No-show Threshold */}
          <div className="bg-[#111118] border border-[#2a2a35] rounded-3xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
                <Clock size={20} />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">曠課認定時間門檻</h3>
                <p className="text-xs text-[#888899]">學員於開課後指定分鐘內未到，教練可標記為曠課</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <input 
                  type="number"
                  value={settings.no_show_threshold}
                  onChange={(e) => setSettings({ ...settings, no_show_threshold: e.target.value })}
                  className="w-full bg-[#0a0a0f] border border-[#2a2a35] rounded-xl px-4 py-3 text-lg font-black text-blue-400 focus:outline-none focus:border-blue-500/50 transition-colors"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#888899]">
                  分鐘
                </span>
              </div>
              <button 
                onClick={() => handleSave('no_show_threshold', settings.no_show_threshold, '曠課認定時間門檻')}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                儲存
              </button>
            </div>

            <div className="mt-6 p-4 bg-white/5 rounded-2xl border border-white/5">
              <div className="flex items-start gap-3">
                <Info size={16} className="text-blue-400 mt-0.5" />
                <p className="text-xs text-[#888899] leading-relaxed">
                  此數值會直接影響教練與學員端顯示的「曠課提醒」文字。
                  預設為 <span className="text-white font-bold">15 分鐘</span>。
                </p>
              </div>
            </div>
          </div>

          {/* Additional Settings */}
          <div className="p-8 border-2 border-dashed border-[#2a2a35] rounded-3xl text-center">
             <p className="text-sm text-[#888899] font-medium italic">
               佣金與支付門檻目前由結算與教練設定流程管理；此頁僅保留全域營運門檻。
             </p>
          </div>

        </div>

      </div>
    </div>
  );
}
