'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  Info,
  Loader2,
  Save,
  Target,
  Gift
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

const BLUE = 'var(--color-primary)';
const DARK = 'var(--color-text)';
const MUTED = 'var(--color-text-muted)';
const BG = 'var(--color-bg)';

const DEFAULT_SETTINGS = {
  task_lv1_t3_target: 1,
  task_lv1_t4_target: 3,
  task_lv1_t11_target: 2,
  task_lv1_t12_target: 2,

  task_lv2_t1_target: 2,
  task_lv2_t2_target: 2,
  task_lv2_t3_target: 2,
  task_lv2_t4_target: 3,
  task_lv2_t5_target: 3,
  task_lv2_t6_target: 3,

  task_lv3_t1_target: 10,
  task_lv3_t2_target: 5,
  task_lv3_t3_target: 5,
  task_lv3_t4_target: 3,
  task_lv3_t5_target: 10000,

  reward_lv2_type: 'amount',
  reward_lv2_value: 50,
  reward_lv3_type: 'percent',
  reward_lv3_value: 20,
  reward_lv4_type: 'none',
  reward_lv4_value: 0
};

export default function TasksAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState('lv1');

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
          body: JSON.stringify({ key, value: settings[key], description: '任務目標與獎勵參數' })
        })
      );
      
      await Promise.all(promises);
      setMessage('設定已成功儲存！前台學員畫面已同步更新。');
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

  const renderRewardConfig = (lv) => {
    const typeKey = `reward_lv${lv}_type`;
    const valKey = `reward_lv${lv}_value`;
    return (
      <div style={{ background: 'var(--color-surface-soft)', padding: 16, borderRadius: 12, marginTop: 16, border: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Gift size={18} color="#10B981" />
          <strong style={{ color: '#10B981', fontSize: 15 }}>升級至等級 {lv} 時的自動獎勵</strong>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, color: MUTED, marginBottom: 6 }}>獎勵類型</label>
            <select
              value={settings[typeKey]}
              onChange={(e) => handleChange(typeKey, e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: DARK, fontSize: 14 }}
            >
              <option value="amount">定額抵扣金 ($)</option>
              <option value="percent">折扣券 (折數, 例如 20 = 8折)</option>
              <option value="none">不發送獎勵</option>
            </select>
          </div>
          {settings[typeKey] !== 'none' && (
            <div>
              <label style={{ display: 'block', fontSize: 13, color: MUTED, marginBottom: 6 }}>
                {settings[typeKey] === 'amount' ? '折扣金額 ($)' : '折數 (輸入 20 代表 8 折)'}
              </label>
              <input
                type="number"
                min="0"
                value={settings[valKey]}
                onChange={(e) => handleChange(valKey, Number(e.target.value))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: DARK, fontSize: 14 }}
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderInput = (label, key, placeholder, isCurrency = false) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--color-surface)', borderRadius: 12, border: '1px solid var(--color-border)', marginBottom: 8 }}>
      <span style={{ fontSize: 15, color: DARK, fontWeight: 500 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {isCurrency && <span style={{ color: MUTED, fontSize: 14 }}>NT$</span>}
        <input
          type="number"
          min="1"
          value={settings[key]}
          onChange={(e) => handleChange(key, Number(e.target.value))}
          style={{ width: 100, textAlign: 'right', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--color-surface-soft)', color: BLUE, fontSize: 16, fontWeight: 700 }}
        />
        {!isCurrency && <span style={{ color: MUTED, fontSize: 14, width: 24 }}>次</span>}
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
              <Target size={28} color={BLUE} />
              任務目標與獎勵管理
            </h1>
            <p style={{ color: MUTED, marginTop: 8, fontSize: 14 }}>
              調整各等級任務過關門檻。這些設定會即時反映在學員的畫面上。
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

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
          {['lv1', 'lv2', 'lv3'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: activeTab === tab ? BLUE : 'var(--color-surface)',
                color: activeTab === tab ? '#fff' : MUTED,
                border: activeTab === tab ? 'none' : '1px solid var(--color-border)',
                padding: '8px 24px',
                borderRadius: 100,
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {tab.toUpperCase()} 任務設定
            </button>
          ))}
        </div>

        {/* Form Body */}
        {activeTab === 'lv1' && (
          <div className="fade-in">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Info size={16} color={MUTED} />
              <span style={{ fontSize: 13, color: MUTED }}>這四個項目是等級一中，系統允許動態修改門檻的進階任務。其餘皆為固定（如：完善個人資料、第一則評價等）。</span>
            </div>
            {renderInput('收藏教練次數', 'task_lv1_t3_target')}
            {renderInput('按讚不同教練影片次數', 'task_lv1_t4_target')}
            {renderInput('累積預約堂數 (再預約)', 'task_lv1_t11_target')}
            {renderInput('累積邀請朋友註冊人數', 'task_lv1_t12_target')}
            {renderRewardConfig(2)}
          </div>
        )}

        {activeTab === 'lv2' && (
          <div className="fade-in">
            {renderInput('累積完成課堂數', 'task_lv2_t1_target')}
            {renderInput('累積留下評價數', 'task_lv2_t2_target')}
            {renderInput('查看學習紀錄次數', 'task_lv2_t3_target')}
            {renderInput('累積預約堂數', 'task_lv2_t4_target')}
            {renderInput('與教練完成對話數', 'task_lv2_t5_target')}
            {renderInput('累積邀請朋友註冊人數', 'task_lv2_t6_target')}
            {renderRewardConfig(3)}
          </div>
        )}

        {activeTab === 'lv3' && (
          <div className="fade-in">
            {renderInput('累積完成課堂數', 'task_lv3_t1_target')}
            {renderInput('累積留下評價數', 'task_lv3_t2_target')}
            {renderInput('查看學習紀錄次數', 'task_lv3_t3_target')}
            
            <div style={{ marginTop: 24, marginBottom: 12, fontSize: 14, fontWeight: 800, color: BLUE }}>「二選一」進階條件設定</div>
            {renderInput('推薦朋友完成第一堂課人數', 'task_lv3_t4_target')}
            {renderInput('累積消費滿額', 'task_lv3_t5_target', '累積消費達標', true)}
            {renderRewardConfig(4)}
          </div>
        )}

      </div>
      <style>{`
        .spinner { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .fade-in { animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
