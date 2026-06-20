'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  Info,
  Loader2,
  Save,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

const BLUE = 'var(--color-primary)';
const DARK = 'var(--color-text)';
const MUTED = 'var(--color-text-muted)';
const BG = 'var(--color-bg)';

const DEFAULT_SETTINGS = {
  coach_lv2_lessons: 2,
  coach_lv3_lessons: 4,
  coach_lv4_lessons: 6,

  coach_lv1_commission: 45,
  coach_lv2_commission: 35,
  coach_lv3_commission: 25,
  coach_lv4_commission: 20,
};

export default function CoachPerformanceAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    if (!authLoading && user) {
      if (user.role !== 'admin') {
        window.location.href = '/dashboard/user';
        return;
      }
      fetchSettings();
    }
  }, [user, authLoading]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      if (!res.ok) throw new Error('Failed to fetch settings');
      const data = await res.json();
      if (data.settings) {
        setSettings(prev => ({
          ...prev,
          ...data.settings
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const keysToSave = Object.keys(settings);
      const promises = keysToSave.map(key => 
        fetch('/api/admin/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, value: settings[key], description: '動態教練績效參數' })
        }).then(res => {
          if (!res.ok) throw new Error(`Failed to save ${key}`);
          return res;
        })
      );
      
      await Promise.all(promises);
      setMessage('設定已成功儲存！教練端績效面板與結帳抽成將立即生效。');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error(err);
      setMessage('儲存失敗，請重試。');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (authLoading || loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: BG }}>
        <Loader2 className="spinner" size={24} color={BLUE} />
      </div>
    );
  }

  const renderInput = (label, key, unit, min = 0) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--color-surface)', borderRadius: 12, border: '1px solid var(--color-border)', marginBottom: 8 }}>
      <span style={{ fontSize: 15, color: DARK, fontWeight: 500 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="number"
          min={min}
          value={settings[key]}
          onChange={(e) => handleChange(key, Number(e.target.value))}
          style={{ width: 100, textAlign: 'right', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--color-surface-soft)', color: BLUE, fontSize: 16, fontWeight: 700 }}
        />
        <span style={{ color: MUTED, fontSize: 14, width: 24 }}>{unit}</span>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: BG, padding: '40px 20px' }}>
      <div className="content-wrapper" style={{ width: '100%' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <Link href="/dashboard/admin" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: MUTED, textDecoration: 'none', fontSize: 14, marginBottom: 12, fontWeight: 500 }}>
              <ArrowLeft size={16} /> 返回主控台
            </Link>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: DARK, margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
              <TrendingUp size={28} color={BLUE} />
              動態教練績效門檻與抽成設定
            </h1>
            <p style={{ color: MUTED, marginTop: 8, fontSize: 14 }}>
              調整各教練等級的「近30天動態完課門檻」與對應的「平台抽成比例」。
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: BLUE, color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 100, fontWeight: 700, fontSize: 15, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
          >
            {saving ? <Loader2 size={18} className="spinner" /> : <Save size={18} />}
            儲存所有變更
          </button>
        </div>

        {message && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', padding: '12px 16px', borderRadius: 12, marginBottom: 24, fontSize: 14, fontWeight: 500 }}>
            <CheckCircle2 size={18} /> {message}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 24, background: 'var(--color-surface-soft)', padding: 16, borderRadius: 12 }}>
          <Info size={20} color={MUTED} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 14, color: MUTED, lineHeight: 1.6 }}>
            <strong style={{ color: DARK }}>【運作規則說明】</strong><br/>
            教練的等級將根據「過去 30 天的表現」每天動態運算。如果教練 30 天內的完課數未達標，或出現惡意取消，將被系統自動降級，並立刻適用較高的平台抽成率。
            這裡您可以動態調整「每月完課要求」與「各階級抽成」，其餘品質指標（如評分 ≥ 4.7、回覆率等）為系統固定核心邏輯。
          </div>
        </div>

        {/* Section 1: 平台抽成比例 */}
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: DARK, marginBottom: 16 }}>💰 平台抽成比例設定 (Platform Commission)</h2>
          {renderInput('Lv.1 新手教練抽成', 'coach_lv1_commission', '%')}
          {renderInput('Lv.2 進階教練抽成', 'coach_lv2_commission', '%')}
          {renderInput('Lv.3 專業教練抽成', 'coach_lv3_commission', '%')}
          {renderInput('Lv.4 頂級教練抽成', 'coach_lv4_commission', '%')}
        </div>

        {/* Section 2: 近30天動態完課門檻 */}
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: DARK, marginBottom: 16 }}>📊 近 30 天完課要求 (Monthly Targets)</h2>
          {renderInput('維持 Lv.2 所需近30天完課', 'coach_lv2_lessons', '堂')}
          {renderInput('維持 Lv.3 所需近30天完課', 'coach_lv3_lessons', '堂')}
          {renderInput('維持 Lv.4 所需近30天完課', 'coach_lv4_lessons', '堂')}
          <div style={{ padding: '0 16px', fontSize: 13, color: MUTED }}>*Lv.1 為基礎預設等級，無需完課門檻。</div>
        </div>

      </div>
      <style>{`
        .spinner { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
