'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Settings, Save, Clock, Info, 
  ArrowLeft, Loader2, CheckCircle2, Percent
} from 'lucide-react';

const BLUE  = '#2563EB';
const DARK  = '#0F172A';
const MUTED = '#64748B';
const WHITE = '#FFFFFF';
const BG    = '#F8FAFC';

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    no_show_threshold: '15',
    commission_rate: '20',
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
        if (data.settings) {
          setSettings({
            no_show_threshold: data.settings.no_show_threshold || '15',
            commission_rate: data.settings.commission_rate || '20',
          });
        }
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: BG, color: MUTED }}>
      <Loader2 className="animate-spin" size={40} style={{ marginBottom: 16 }} />
      <p>正在載入全域設定...</p>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: BG, padding: 24, fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        
        {/* Header */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button 
              onClick={() => router.push('/dashboard/admin')}
              style={{ padding: 8, background: WHITE, border: 'none', borderRadius: 12, cursor: 'pointer', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}
            >
              <ArrowLeft size={24} color={DARK} />
            </button>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: DARK, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Settings color={BLUE} />
                全域參數管理
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: 14, color: MUTED }}>調整平台運行規則與認定門檻</p>
            </div>
          </div>
        </header>

        {/* Success/Error Message */}
        {message && (
          <div style={{ 
            marginBottom: 24, padding: 16, borderRadius: 16, display: 'flex', alignItems: 'center', gap: 12,
            background: message.type === 'success' ? '#D1FAE5' : '#FEE2E2',
            color: message.type === 'success' ? '#065F46' : '#991B1B',
            fontWeight: 800
          }}>
            {message.type === 'success' ? <CheckCircle2 size={20} /> : <Info size={20} />}
            <span>{message.text}</span>
          </div>
        )}

        <div style={{ display: 'grid', gap: 24 }}>
          
          {/* Setting: No-show Threshold */}
          <div style={{ background: WHITE, border: '1px solid #E2E8F0', borderRadius: 24, padding: 24, boxShadow: '0 4px 16px rgba(15,23,42,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ padding: 10, background: '#EFF6FF', borderRadius: 12, color: BLUE }}>
                <Clock size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontWeight: 900, color: DARK, fontSize: 18 }}>曠課認定時間門檻</h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: MUTED }}>學員於開課後指定分鐘內未到，教練可標記為曠課</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
                <input 
                  type="number"
                  value={settings.no_show_threshold}
                  onChange={(e) => setSettings({ ...settings, no_show_threshold: e.target.value })}
                  style={{ width: '100%', background: BG, border: '1px solid #CBD5E1', borderRadius: 12, padding: '12px 16px', fontSize: 16, fontWeight: 800, color: DARK, boxSizing: 'border-box' }}
                />
                <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 14, fontWeight: 800, color: MUTED }}>
                  分鐘
                </span>
              </div>
              <button 
                onClick={() => handleSave('no_show_threshold', settings.no_show_threshold, '曠課認定時間門檻')}
                disabled={saving}
                style={{ background: BLUE, color: WHITE, border: 'none', padding: '12px 24px', borderRadius: 12, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, opacity: saving ? 0.7 : 1 }}
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                儲存
              </button>
            </div>

            <div style={{ marginTop: 20, padding: 16, background: '#F8FAFC', borderRadius: 16, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <Info size={16} color={BLUE} style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ margin: 0, fontSize: 13, color: MUTED, lineHeight: 1.5 }}>
                此數值會直接影響教練與學員端顯示的「曠課提醒」文字。
                預設為 <strong style={{ color: DARK }}>15 分鐘</strong>。
              </p>
            </div>
          </div>

          {/* Setting: Commission Rate */}
          <div style={{ background: WHITE, border: '1px solid #E2E8F0', borderRadius: 24, padding: 24, boxShadow: '0 4px 16px rgba(15,23,42,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ padding: 10, background: '#ECFDF5', borderRadius: 12, color: '#059669' }}>
                <Percent size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontWeight: 900, color: DARK, fontSize: 18 }}>教練抽成管理</h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: MUTED }}>設定平台向教練收取的訂單抽成比例（%）</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
                <input 
                  type="number"
                  value={settings.commission_rate}
                  onChange={(e) => setSettings({ ...settings, commission_rate: e.target.value })}
                  style={{ width: '100%', background: BG, border: '1px solid #CBD5E1', borderRadius: 12, padding: '12px 16px', fontSize: 16, fontWeight: 800, color: DARK, boxSizing: 'border-box' }}
                />
                <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 14, fontWeight: 800, color: MUTED }}>
                  %
                </span>
              </div>
              <button 
                onClick={() => handleSave('commission_rate', settings.commission_rate, '教練訂單抽成比例')}
                disabled={saving}
                style={{ background: '#059669', color: WHITE, border: 'none', padding: '12px 24px', borderRadius: 12, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, opacity: saving ? 0.7 : 1 }}
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                儲存比例
              </button>
            </div>

            <div style={{ marginTop: 20, padding: 16, background: '#F8FAFC', borderRadius: 16, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <Info size={16} color={'#059669'} style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ margin: 0, fontSize: 13, color: MUTED, lineHeight: 1.5 }}>
                學員付款後，系統在計算教練撥款時會自動扣除此比例的平台服務費。
                預設為 <strong style={{ color: DARK }}>20%</strong>。
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
