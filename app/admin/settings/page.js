'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Settings, Save, Clock, Info, 
  ArrowLeft, Loader2, CheckCircle2, Percent,
  Plus, Trash2, Trophy, Gift, Target, X, Award, Eye
} from 'lucide-react';
import { UserTiers, CoachTiers, AmbassadorTiers } from '@/app/levels/components/Tiers';

const BLUE  = '#4F46E5';
const DARK  = 'var(--text-light)';
const MUTED = 'var(--color-text-muted)';
const BG    = 'var(--color-bg)';
const CARD_BG = 'var(--color-surface)';
const INPUT_BG = 'rgba(0, 0, 0, 0.4)';

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    no_show_threshold: '15',
    commission_rate: '45',
    referral_commission_rate: '3',
    double_referral_commission_rate: '2.5',
    user_rebate_discount: '5',
    coach_tier_rates: [{ level: 1, rate: 45, requirement: {} }, { level: 2, rate: 37, requirement: { completed_sessions: 10 } }],
    user_tier_discounts: [{ level: 1, discount: 5, requirement: {} }, { level: 2, discount: 10, requirement: { spent_points: 10000 } }],
    top_coach_settings: { enabled: true, top_n: 50, bonus_discount: 5 },
    deposit_bonus_tiers: [{ deposit: 10000, bonus: 1000 }],
    coach_review_titles: ['優良教師', '細心指導', '幽默風趣'],
    student_review_titles: ['優質學生', '準時出席', '認真學習']
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [missionModal, setMissionModal] = useState({ isOpen: false, type: null, idx: null, data: {} });
  const [perksModal, setPerksModal] = useState({ isOpen: false, type: null, idx: null, data: [] });
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
          setSettings({
            no_show_threshold: data.settings.no_show_threshold || '15',
            commission_rate: data.settings.commission_rate || '45',
            referral_commission_rate: data.settings.referral_commission_rate || '3',
            double_referral_commission_rate: data.settings.double_referral_commission_rate || '2.5',
            user_rebate_discount: data.settings.user_rebate_discount || '5',
            coach_tier_rates: parseJSON(data.settings.coach_tier_rates, [{ level: 1, rate: 45, requirement: {} }, { level: 2, rate: 37, requirement: { completed_sessions: 10 } }]),
            user_tier_discounts: parseJSON(data.settings.user_tier_discounts, [{ level: 1, discount: 5, requirement: {} }, { level: 2, discount: 10, requirement: { spent_points: 10000 } }]),
            top_coach_settings: parseJSON(data.settings.top_coach_settings, { enabled: true, top_n: 50, bonus_discount: 5 }),
            deposit_bonus_tiers: parseJSON(data.settings.deposit_bonus_tiers, [{ deposit: 10000, bonus: 1000 }]),
            coach_review_titles: parseJSON(data.settings.coach_review_titles, ['優良教師', '細心指導', '幽默風趣']),
            student_review_titles: parseJSON(data.settings.student_review_titles, ['優質學生', '準時出席', '認真學習'])
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

  const handleSave = async (key, value, description) => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: typeof value === 'object' ? JSON.stringify(value) : value, description })
      });
      if (res.ok) {
        setSettings(prev => ({ ...prev, [key]: value }));
        setMessage({ type: 'success', text: '設定已更新' });
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

  const openMissionBuilder = (type, idx, currentReq) => {
    setMissionModal({
      isOpen: true,
      type,
      idx,
      data: typeof currentReq === 'object' && currentReq !== null ? { ...currentReq } : {}
    });
  };

  const saveMissionBuilder = () => {
    const { type, idx, data } = missionModal;
    const newSettings = { ...settings };
    if (type === 'coach') {
      newSettings.coach_tier_rates[idx].requirement = data;
    } else {
      newSettings.user_tier_discounts[idx].requirement = data;
    }
    setSettings(newSettings);
    setMissionModal({ isOpen: false, type: null, idx: null, data: {} });
  };

  const openPerksBuilder = (type, idx, currentPerks) => {
    setPerksModal({
      isOpen: true,
      type,
      idx,
      data: Array.isArray(currentPerks) ? [...currentPerks] : []
    });
  };

  const savePerksBuilder = () => {
    const { type, idx, data } = perksModal;
    const newSettings = { ...settings };
    if (type === 'coach') {
      newSettings.coach_tier_rates[idx].perks = data;
    } else {
      newSettings.user_tier_discounts[idx].perks = data;
    }
    setSettings(newSettings);
    setPerksModal({ isOpen: false, type: null, idx: null, data: [] });
  };

  const countConditions = (req) => {
    if (!req || typeof req !== 'object') return 0;
    return Object.keys(req).filter(k => req[k] !== undefined && req[k] !== null && req[k] !== '').length;
  };

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: BG, color: MUTED }}>
      <Loader2 className="animate-spin" size={40} style={{ marginBottom: 16 }} />
      載入中...
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: BG, padding: 24, fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        
        <header style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <button 
            onClick={() => router.push('/dashboard/admin')}
            style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: DARK, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: DARK }}>全域參數管理</h1>
            <p style={{ margin: '4px 0 0', color: MUTED, fontSize: 14 }}>設定平台的各項核心運作參數</p>
          </div>
        </header>

        {message && (
          <div style={{ 
            marginBottom: 24, padding: 16, borderRadius: 16, display: 'flex', alignItems: 'center', gap: 12,
            background: message.type === 'success' ? 'rgba(5, 150, 105, 0.1)' : 'rgba(220, 38, 38, 0.1)',
            color: message.type === 'success' ? '#10B981' : '#EF4444', border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
          }}>
            <CheckCircle2 size={20} />
            <span style={{ fontWeight: 800 }}>{message.text}</span>
          </div>
        )}

        <div style={{ display: 'grid', gap: 24 }}>
          
          <div style={{ background: CARD_BG, border: '1px solid rgba(255,255,255,0.05)', borderRadius: 24, padding: 24 }}>
            <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
              <div style={{ width: 48, height: 48, background: '#FFFFFF', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: BLUE, flexShrink: 0 }}>
                <Clock size={24} />
              </div>
              <div style={{ paddingTop: 4 }}>
                <h3 style={{ margin: 0, fontWeight: 900, color: DARK, fontSize: 18 }}>遲到 / 曠課寬限期</h3>
                <p style={{ margin: '6px 0 0', fontSize: 13, color: MUTED, lineHeight: 1.5 }}>設定課程開始後，雙方容許遲到的分鐘數。超過此時間即視為曠課。</p>
              </div>
            </div>

            <div style={{ background: INPUT_BG, borderRadius: 12, position: 'relative', display: 'flex', alignItems: 'center', marginBottom: 16 }}>
              <input 
                type="number"
                value={settings.no_show_threshold}
                onChange={(e) => setSettings({ ...settings, no_show_threshold: e.target.value })}
                style={{ flex: 1, background: 'transparent', border: 'none', padding: '16px 20px', fontSize: 20, fontWeight: 900, color: DARK, outline: 'none' }}
              />
              <span style={{ paddingRight: 20, fontSize: 16, fontWeight: 900, color: MUTED }}>
                分鐘
              </span>
            </div>
            <button 
              onClick={() => handleSave('no_show_threshold', settings.no_show_threshold, '遲到/曠課寬限期')}
              disabled={saving}
              style={{ background: BLUE, color: '#FFF', border: 'none', padding: '12px 24px', borderRadius: 12, fontWeight: 900, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, opacity: saving ? 0.7 : 1, fontSize: 16 }}
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              儲存
            </button>
          </div>

          <div style={{ background: CARD_BG, border: '1px solid rgba(255,255,255,0.05)', borderRadius: 24, padding: 24 }}>
            <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
              <div style={{ width: 48, height: 48, background: '#FFFFFF', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669', flexShrink: 0 }}>
                <Settings size={24} />
              </div>
              <div style={{ paddingTop: 4 }}>
                <h3 style={{ margin: 0, fontWeight: 900, color: DARK, fontSize: 18 }}>教練抽成管理</h3>
                <p style={{ margin: '6px 0 0', fontSize: 13, color: MUTED, lineHeight: 1.5 }}>設定教練的平台服務費（%），以及因應推廣、成就解鎖的浮動抽成。</p>
              </div>
            </div>

            <p style={{ fontSize: 14, fontWeight: 800, color: DARK, marginBottom: 8 }}>未分級 / 新手預設抽成</p>
            <div style={{ background: INPUT_BG, borderRadius: 12, position: 'relative', display: 'flex', alignItems: 'center', marginBottom: 24 }}>
              <input 
                type="number"
                value={settings.commission_rate}
                onChange={(e) => setSettings({ ...settings, commission_rate: e.target.value })}
                style={{ flex: 1, background: 'transparent', border: 'none', padding: '16px 20px', fontSize: 20, fontWeight: 900, color: DARK, outline: 'none' }}
              />
              <span style={{ paddingRight: 20, fontSize: 16, fontWeight: 900, color: MUTED }}>%</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: DARK }}>階梯式等級抽成表</p>
              <button 
                onClick={() => setSettings(prev => ({ 
                  ...prev, 
                  coach_tier_rates: [...prev.coach_tier_rates, { level: prev.coach_tier_rates.length + 1, rate: 30, requirement: {} }] 
                }))}
                style={{ background: 'rgba(5, 150, 105, 0.1)', color: '#059669', border: 'none', padding: '6px 12px', borderRadius: 8, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
              >
                <Plus size={14} /> 新增等級
              </button>
            </div>

            <div style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
              {settings.coach_tier_rates.map((tier, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ background: INPUT_BG, borderRadius: 12, display: 'flex', alignItems: 'center', width: 80 }}>
                    <input 
                      type="number" value={tier.level}
                      onChange={e => {
                        const newTiers = [...settings.coach_tier_rates];
                        newTiers[idx].level = Number(e.target.value);
                        setSettings({ ...settings, coach_tier_rates: newTiers });
                      }}
                      style={{ width: '100%', background: 'transparent', border: 'none', padding: '12px 8px', fontSize: 16, fontWeight: 900, color: DARK, outline: 'none', textAlign: 'center' }}
                    />
                  </div>
                  <div style={{ background: INPUT_BG, borderRadius: 12, flex: 1, display: 'flex', alignItems: 'center', minWidth: 120 }}>
                    <span style={{ paddingLeft: 16, color: MUTED, fontWeight: 800, fontSize: 14 }}>名稱</span>
                    <input 
                      type="text" value={tier.name || ''} placeholder="如: 見習教練"
                      onChange={e => {
                        const newTiers = [...settings.coach_tier_rates];
                        newTiers[idx].name = e.target.value;
                        setSettings({ ...settings, coach_tier_rates: newTiers });
                      }}
                      style={{ width: 100, background: 'transparent', border: 'none', padding: '12px 8px', fontSize: 16, fontWeight: 900, color: DARK, outline: 'none', textAlign: 'center' }}
                    />
                  </div>
                  <div style={{ background: INPUT_BG, borderRadius: 12, flex: 1, display: 'flex', alignItems: 'center', minWidth: 100 }}>
                    <input 
                      type="number" value={tier.rate} step="0.1"
                      onChange={e => {
                        const newTiers = [...settings.coach_tier_rates];
                        newTiers[idx].rate = Number(e.target.value);
                        setSettings({ ...settings, coach_tier_rates: newTiers });
                      }}
                      style={{ width: '100%', background: 'transparent', border: 'none', padding: '12px 8px', fontSize: 16, fontWeight: 900, color: DARK, outline: 'none', textAlign: 'center' }}
                    />
                    <span style={{ paddingRight: 16, color: MUTED, fontWeight: 800 }}>%</span>
                  </div>
                  <button
                    onClick={() => openMissionBuilder('coach', idx, tier.requirement)}
                    style={{ flex: 1, background: 'rgba(79, 70, 229, 0.15)', color: '#818CF8', border: 'none', padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, minWidth: 120 }}
                  >
                    <Target size={14} />
                    {countConditions(tier.requirement) > 0 ? `升級條件 (${countConditions(tier.requirement)})` : '設定條件'}
                  </button>
                  <button
                    onClick={() => openPerksBuilder('coach', idx, tier.perks)}
                    style={{ flex: 1, background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', border: 'none', padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, minWidth: 120 }}
                  >
                    <Gift size={14} />
                    {tier.perks && tier.perks.length > 0 ? `附帶權益 (${tier.perks.length})` : '設定附帶權益'}
                  </button>
                  <button 
                    onClick={() => setSettings(prev => ({ ...prev, coach_tier_rates: prev.coach_tier_rates.filter((_, i) => i !== idx) }))}
                    style={{ width: 48, background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: 'none', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 24, marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <Trophy size={18} color="#EAB308" />
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: DARK }}>創始教練 / 早鳥排行榜優惠</h4>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ background: INPUT_BG, borderRadius: 12, flex: 1, display: 'flex', alignItems: 'center' }}>
                  <span style={{ paddingLeft: 16, color: MUTED, fontWeight: 800, fontSize: 14 }}>前</span>
                  <input 
                    type="number" value={settings.top_coach_settings.top_n}
                    onChange={e => setSettings({ ...settings, top_coach_settings: { ...settings.top_coach_settings, top_n: Number(e.target.value) } })}
                    style={{ flex: 1, background: 'transparent', border: 'none', padding: '12px 8px', fontSize: 16, fontWeight: 900, color: DARK, outline: 'none', textAlign: 'center' }}
                  />
                  <span style={{ paddingRight: 16, color: MUTED, fontWeight: 800, fontSize: 14 }}>名註冊教練</span>
                </div>
                <div style={{ background: INPUT_BG, borderRadius: 12, flex: 1, display: 'flex', alignItems: 'center' }}>
                  <span style={{ paddingLeft: 16, color: MUTED, fontWeight: 800, fontSize: 14 }}>多折扣</span>
                  <input 
                    type="number" value={settings.top_coach_settings.bonus_discount}
                    onChange={e => setSettings({ ...settings, top_coach_settings: { ...settings.top_coach_settings, bonus_discount: Number(e.target.value) } })}
                    style={{ flex: 1, background: 'transparent', border: 'none', padding: '12px 8px', fontSize: 16, fontWeight: 900, color: DARK, outline: 'none', textAlign: 'center' }}
                  />
                  <span style={{ paddingRight: 16, color: MUTED, fontWeight: 800 }}>%</span>
                </div>
              </div>
            </div>

            <button 
              onClick={() => {
                handleSave('commission_rate', settings.commission_rate, '教練基準抽成');
                handleSave('coach_tier_rates', settings.coach_tier_rates, '教練階梯抽成表');
                handleSave('top_coach_settings', settings.top_coach_settings, '創始教練排行榜優惠');
              }}
              disabled={saving}
              style={{ background: '#059669', color: '#FFF', border: 'none', padding: '12px 24px', borderRadius: 12, fontWeight: 900, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, opacity: saving ? 0.7 : 1, fontSize: 16 }}
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              儲存抽成與早鳥設定
            </button>
          </div>

          <div style={{ background: CARD_BG, border: '1px solid rgba(255,255,255,0.05)', borderRadius: 24, padding: 24 }}>
            <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
              <div style={{ width: 48, height: 48, background: '#FFFFFF', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F97316', flexShrink: 0 }}>
                <Percent size={24} />
              </div>
              <div style={{ paddingTop: 4 }}>
                <h3 style={{ margin: 0, fontWeight: 900, color: DARK, fontSize: 18 }}>推廣抽成管理</h3>
                <p style={{ margin: '6px 0 0', fontSize: 13, color: MUTED, lineHeight: 1.5 }}>設定推廣人可以從訂單中抽取的比例（%）</p>
              </div>
            </div>

            <p style={{ fontSize: 14, fontWeight: 800, color: DARK, marginBottom: 8 }}>單邊推廣（僅一方有推廣人）</p>
            <div style={{ background: INPUT_BG, borderRadius: 12, position: 'relative', display: 'flex', alignItems: 'center', marginBottom: 16 }}>
              <input 
                type="number" step="0.1"
                value={settings.referral_commission_rate}
                onChange={(e) => setSettings({ ...settings, referral_commission_rate: e.target.value })}
                style={{ flex: 1, background: 'transparent', border: 'none', padding: '16px 20px', fontSize: 20, fontWeight: 900, color: DARK, outline: 'none' }}
              />
              <span style={{ paddingRight: 20, fontSize: 16, fontWeight: 900, color: MUTED }}>%</span>
            </div>

            <p style={{ fontSize: 14, fontWeight: 800, color: DARK, marginBottom: 8, marginTop: 16 }}>雙邊推廣（教練與學員皆有推廣人，單邊各抽）</p>
            <div style={{ background: INPUT_BG, borderRadius: 12, position: 'relative', display: 'flex', alignItems: 'center', marginBottom: 16 }}>
              <input 
                type="number" step="0.1"
                value={settings.double_referral_commission_rate}
                onChange={(e) => setSettings({ ...settings, double_referral_commission_rate: e.target.value })}
                style={{ flex: 1, background: 'transparent', border: 'none', padding: '16px 20px', fontSize: 20, fontWeight: 900, color: DARK, outline: 'none' }}
              />
              <span style={{ paddingRight: 20, fontSize: 16, fontWeight: 900, color: MUTED }}>%</span>
            </div>

            <button 
              onClick={() => {
                handleSave('referral_commission_rate', settings.referral_commission_rate, '單邊推廣抽成比例');
                handleSave('double_referral_commission_rate', settings.double_referral_commission_rate, '雙邊推廣抽成比例');
              }}
              disabled={saving}
              style={{ background: '#F97316', color: '#FFF', border: 'none', padding: '12px 24px', borderRadius: 12, fontWeight: 900, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, opacity: saving ? 0.7 : 1, fontSize: 16 }}
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              儲存推廣設定
            </button>
          </div>

          <div style={{ background: CARD_BG, border: '1px solid rgba(255,255,255,0.05)', borderRadius: 24, padding: 24 }}>
            <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
              <div style={{ width: 48, height: 48, background: '#FFFFFF', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8B5CF6', flexShrink: 0 }}>
                <Gift size={24} />
              </div>
              <div style={{ paddingTop: 4 }}>
                <h3 style={{ margin: 0, fontWeight: 900, color: DARK, fontSize: 18 }}>用戶儲值與回饋折價</h3>
                <p style={{ margin: '6px 0 0', fontSize: 13, color: MUTED, lineHeight: 1.5 }}>設定用戶買多送小等回饋比例，以及儲值階梯獎勵</p>
              </div>
            </div>

            <p style={{ fontSize: 14, fontWeight: 800, color: DARK, marginBottom: 8 }}>未分級 / 新手預設折價</p>
            <div style={{ background: INPUT_BG, borderRadius: 12, position: 'relative', display: 'flex', alignItems: 'center', marginBottom: 24 }}>
              <input 
                type="number"
                value={settings.user_rebate_discount}
                onChange={(e) => setSettings({ ...settings, user_rebate_discount: e.target.value })}
                style={{ flex: 1, background: 'transparent', border: 'none', padding: '16px 20px', fontSize: 20, fontWeight: 900, color: DARK, outline: 'none' }}
              />
              <span style={{ paddingRight: 20, fontSize: 16, fontWeight: 900, color: MUTED }}>%</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: DARK }}>學員階梯式折價表</p>
              <button 
                onClick={() => setSettings(prev => ({ 
                  ...prev, 
                  user_tier_discounts: [...prev.user_tier_discounts, { level: prev.user_tier_discounts.length + 1, discount: 15, requirement: {} }] 
                }))}
                style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8B5CF6', border: 'none', padding: '6px 12px', borderRadius: 8, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
              >
                <Plus size={14} /> 新增等級
              </button>
            </div>

            <div style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
              {settings.user_tier_discounts.map((tier, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16, background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}`, borderRadius: 16 }}>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ background: INPUT_BG, borderRadius: 12, flex: 1, display: 'flex', alignItems: 'center', minWidth: 100 }}>
                    <span style={{ paddingLeft: 16, color: MUTED, fontWeight: 800, fontSize: 14 }}>等級</span>
                    <input 
                      type="number" value={tier.level}
                      onChange={e => {
                        const newTiers = [...settings.user_tier_discounts];
                        newTiers[idx].level = Number(e.target.value);
                        setSettings({ ...settings, user_tier_discounts: newTiers });
                      }}
                      style={{ width: 60, background: 'transparent', border: 'none', padding: '12px 8px', fontSize: 16, fontWeight: 900, color: DARK, outline: 'none', textAlign: 'center' }}
                    />
                  </div>
                  <div style={{ background: INPUT_BG, borderRadius: 12, flex: 1, display: 'flex', alignItems: 'center', minWidth: 120 }}>
                    <span style={{ paddingLeft: 16, color: MUTED, fontWeight: 800, fontSize: 14 }}>名稱</span>
                    <input 
                      type="text" value={tier.name || ''} placeholder="如: 第一梯"
                      onChange={e => {
                        const newTiers = [...settings.user_tier_discounts];
                        newTiers[idx].name = e.target.value;
                        setSettings({ ...settings, user_tier_discounts: newTiers });
                      }}
                      style={{ width: 100, background: 'transparent', border: 'none', padding: '12px 8px', fontSize: 16, fontWeight: 900, color: DARK, outline: 'none', textAlign: 'center' }}
                    />
                  </div>
                  <div style={{ background: INPUT_BG, borderRadius: 12, flex: 1, display: 'flex', alignItems: 'center', minWidth: 100 }}>
                    <span style={{ paddingLeft: 16, color: MUTED, fontWeight: 800, fontSize: 14 }}>折價</span>
                    <input 
                      type="number" value={tier.discount} step="0.1"
                      onChange={e => {
                        const newTiers = [...settings.user_tier_discounts];
                        newTiers[idx].discount = Number(e.target.value);
                        setSettings({ ...settings, user_tier_discounts: newTiers });
                      }}
                      style={{ width: 60, background: 'transparent', border: 'none', padding: '12px 8px', fontSize: 16, fontWeight: 900, color: DARK, outline: 'none', textAlign: 'center' }}
                    />
                    <span style={{ paddingRight: 16, color: MUTED, fontWeight: 800 }}>%</span>
                  </div>
                  <div style={{ background: INPUT_BG, borderRadius: 12, flex: 1, display: 'flex', alignItems: 'center', minWidth: 120 }}>
                    <span style={{ paddingLeft: 16, color: MUTED, fontWeight: 800, fontSize: 14 }}>贈點倍率</span>
                    <input 
                      type="number" value={tier.bonus_multiplier ?? 1.0} step="0.1"
                      onChange={e => {
                        const newTiers = [...settings.user_tier_discounts];
                        newTiers[idx].bonus_multiplier = Number(e.target.value);
                        setSettings({ ...settings, user_tier_discounts: newTiers });
                      }}
                      style={{ width: 60, background: 'transparent', border: 'none', padding: '12px 8px', fontSize: 16, fontWeight: 900, color: DARK, outline: 'none', textAlign: 'center' }}
                    />
                    <span style={{ paddingRight: 16, color: MUTED, fontWeight: 800 }}>x</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
                  <div style={{ background: 'rgba(59, 130, 246, 0.1)', borderRadius: 12, flex: 1, display: 'flex', alignItems: 'center', minWidth: 150 }}>
                    <span style={{ paddingLeft: 16, color: '#3B82F6', fontWeight: 800, fontSize: 14 }}>每月發放紅利</span>
                    <input 
                      type="number" value={tier.monthly_bonus ?? 0}
                      onChange={e => {
                        const newTiers = [...settings.user_tier_discounts];
                        newTiers[idx].monthly_bonus = Number(e.target.value);
                        setSettings({ ...settings, user_tier_discounts: newTiers });
                      }}
                      style={{ width: 80, background: 'transparent', border: 'none', padding: '12px 8px', fontSize: 16, fontWeight: 900, color: '#3B82F6', outline: 'none', textAlign: 'center' }}
                    />
                    <span style={{ paddingRight: 16, color: '#3B82F6', fontWeight: 800 }}>點</span>
                  </div>
                  <div style={{ background: 'rgba(239, 68, 68, 0.1)', borderRadius: 12, flex: 1, display: 'flex', alignItems: 'center', minWidth: 150 }}>
                    <span style={{ paddingLeft: 16, color: '#EF4444', fontWeight: 800, fontSize: 14 }}>最高抵扣上限</span>
                    <input 
                      type="number" value={tier.monthly_bonus_max_percent ?? 0}
                      onChange={e => {
                        const newTiers = [...settings.user_tier_discounts];
                        newTiers[idx].monthly_bonus_max_percent = Number(e.target.value);
                        setSettings({ ...settings, user_tier_discounts: newTiers });
                      }}
                      style={{ width: 60, background: 'transparent', border: 'none', padding: '12px 8px', fontSize: 16, fontWeight: 900, color: '#EF4444', outline: 'none', textAlign: 'center' }}
                    />
                    <span style={{ paddingRight: 16, color: '#EF4444', fontWeight: 800 }}>%</span>
                  </div>
                  <button
                    onClick={() => openMissionBuilder('user', idx, tier.requirement)}
                    style={{ flex: 1, background: 'rgba(139, 92, 246, 0.15)', color: '#A78BFA', border: 'none', padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, minWidth: 120 }}
                  >
                    <Target size={14} />
                    {countConditions(tier.requirement) > 0 ? `升級條件 (${countConditions(tier.requirement)})` : '設定條件'}
                  </button>
                  <button
                    onClick={() => openPerksBuilder('user', idx, tier.perks)}
                    style={{ flex: 1, background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', border: 'none', padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, minWidth: 120 }}
                  >
                    <Gift size={14} />
                    {tier.perks && tier.perks.length > 0 ? `附帶權益 (${tier.perks.length})` : '設定附帶權益'}
                  </button>
                  <button 
                    onClick={() => setSettings(prev => ({ ...prev, user_tier_discounts: prev.user_tier_discounts.filter((_, i) => i !== idx) }))}
                    style={{ width: 48, background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: 'none', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: DARK }}>儲值滿額贈階梯表</p>
              <button 
                onClick={() => setSettings(prev => ({ 
                  ...prev, 
                  deposit_bonus_tiers: [...prev.deposit_bonus_tiers, { deposit: 5000, bonus: 500 }] 
                }))}
                style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8B5CF6', border: 'none', padding: '6px 12px', borderRadius: 8, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
              >
                <Plus size={14} /> 新增級距
              </button>
            </div>

            <div style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
              {settings.deposit_bonus_tiers.map((tier, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 12 }}>
                  <div style={{ background: INPUT_BG, borderRadius: 12, flex: 1, display: 'flex', alignItems: 'center' }}>
                    <span style={{ paddingLeft: 16, color: MUTED, fontWeight: 800, fontSize: 14 }}>滿</span>
                    <input 
                      type="number" value={tier.deposit}
                      onChange={e => {
                        const newTiers = [...settings.deposit_bonus_tiers];
                        newTiers[idx].deposit = Number(e.target.value);
                        setSettings({ ...settings, deposit_bonus_tiers: newTiers });
                      }}
                      style={{ flex: 1, minWidth: 80, background: 'transparent', border: 'none', padding: '12px 8px', fontSize: 16, fontWeight: 900, color: DARK, outline: 'none', textAlign: 'center' }}
                    />
                    <span style={{ paddingRight: 16, color: MUTED, fontWeight: 800, fontSize: 14 }}>元</span>
                  </div>
                  <div style={{ background: INPUT_BG, borderRadius: 12, flex: 1, display: 'flex', alignItems: 'center' }}>
                    <span style={{ paddingLeft: 16, color: MUTED, fontWeight: 800, fontSize: 14 }}>送</span>
                    <input 
                      type="number" value={tier.bonus}
                      onChange={e => {
                        const newTiers = [...settings.deposit_bonus_tiers];
                        newTiers[idx].bonus = Number(e.target.value);
                        setSettings({ ...settings, deposit_bonus_tiers: newTiers });
                      }}
                      style={{ flex: 1, minWidth: 80, background: 'transparent', border: 'none', padding: '12px 8px', fontSize: 16, fontWeight: 900, color: DARK, outline: 'none', textAlign: 'center' }}
                    />
                    <span style={{ paddingRight: 16, color: MUTED, fontWeight: 800, fontSize: 14 }}>點</span>
                  </div>
                  <button 
                    onClick={() => setSettings(prev => ({ ...prev, deposit_bonus_tiers: prev.deposit_bonus_tiers.filter((_, i) => i !== idx) }))}
                    style={{ width: 48, background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: 'none', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>

            <button 
              onClick={() => {
                handleSave('user_rebate_discount', settings.user_rebate_discount, '預設學員折價比例');
                handleSave('user_tier_discounts', settings.user_tier_discounts, '學員階梯式折價表');
                handleSave('deposit_bonus_tiers', settings.deposit_bonus_tiers, '儲值滿額贈階梯表');
              }}
              disabled={saving}
              style={{ background: '#8B5CF6', color: '#FFF', border: 'none', padding: '12px 24px', borderRadius: 12, fontWeight: 900, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, opacity: saving ? 0.7 : 1, fontSize: 16 }}
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              儲存用戶回饋設定
            </button>
          </div>

          <div style={{ background: CARD_BG, border: '1px solid rgba(255,255,255,0.05)', borderRadius: 24, padding: 24 }}>
            <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
              <div style={{ width: 48, height: 48, background: '#FFFFFF', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EC4899', flexShrink: 0 }}>
                <Award size={24} />
              </div>
              <div style={{ paddingTop: 4 }}>
                <h3 style={{ margin: 0, fontWeight: 900, color: DARK, fontSize: 18 }}>雙向特色稱號題庫</h3>
                <p style={{ margin: '6px 0 0', fontSize: 13, color: MUTED, lineHeight: 1.5 }}>設定課後評價時，學生與教練可互相給予的榮譽稱號。</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
              <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 16, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#38BDF8' }}>教練稱號</h4>
                  <button 
                    onClick={() => setSettings(prev => ({ ...prev, coach_review_titles: [...prev.coach_review_titles, '新稱號'] }))}
                    style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38BDF8', border: 'none', padding: '4px 10px', borderRadius: 6, fontWeight: 800, cursor: 'pointer', fontSize: 12 }}
                  >
                    + 新增
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {settings.coach_review_titles.map((title, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 8 }}>
                      <input 
                        type="text" value={title}
                        onChange={e => {
                          const newTitles = [...settings.coach_review_titles];
                          newTitles[idx] = e.target.value;
                          setSettings({ ...settings, coach_review_titles: newTitles });
                        }}
                        style={{ flex: 1, background: INPUT_BG, border: '1px solid rgba(255,255,255,0.05)', padding: '8px 12px', fontSize: 14, fontWeight: 800, color: DARK, borderRadius: 8 }}
                      />
                      <button 
                        onClick={() => setSettings(prev => ({ ...prev, coach_review_titles: prev.coach_review_titles.filter((_, i) => i !== idx) }))}
                        style={{ width: 36, background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: 'none', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 16, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#A78BFA' }}>學員稱號</h4>
                  <button 
                    onClick={() => setSettings(prev => ({ ...prev, student_review_titles: [...prev.student_review_titles, '新稱號'] }))}
                    style={{ background: 'rgba(167, 139, 250, 0.1)', color: '#A78BFA', border: 'none', padding: '4px 10px', borderRadius: 6, fontWeight: 800, cursor: 'pointer', fontSize: 12 }}
                  >
                    + 新增
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {settings.student_review_titles.map((title, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 8 }}>
                      <input 
                        type="text" value={title}
                        onChange={e => {
                          const newTitles = [...settings.student_review_titles];
                          newTitles[idx] = e.target.value;
                          setSettings({ ...settings, student_review_titles: newTitles });
                        }}
                        style={{ flex: 1, background: INPUT_BG, border: '1px solid rgba(255,255,255,0.05)', padding: '8px 12px', fontSize: 14, fontWeight: 800, color: DARK, borderRadius: 8 }}
                      />
                      <button 
                        onClick={() => setSettings(prev => ({ ...prev, student_review_titles: prev.student_review_titles.filter((_, i) => i !== idx) }))}
                        style={{ width: 36, background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: 'none', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button 
              onClick={() => {
                handleSave('coach_review_titles', settings.coach_review_titles, '教練互評特色稱號');
                handleSave('student_review_titles', settings.student_review_titles, '學員互評特色稱號');
              }}
              disabled={saving}
              style={{ background: '#EC4899', color: '#FFF', border: 'none', padding: '12px 24px', borderRadius: 12, fontWeight: 900, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, opacity: saving ? 0.7 : 1, fontSize: 16 }}
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              儲存稱號題庫
            </button>
          </div>

          <div style={{ background: CARD_BG, border: '1px solid rgba(255,255,255,0.05)', borderRadius: 24, padding: 24 }}>
            <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
              <div style={{ width: 48, height: 48, background: '#FFFFFF', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981', flexShrink: 0 }}>
                <Eye size={24} />
              </div>
              <div style={{ paddingTop: 4 }}>
                <h3 style={{ margin: 0, fontWeight: 900, color: DARK, fontSize: 18 }}>會員權益中心預覽</h3>
                <p style={{ margin: '6px 0 0', fontSize: 13, color: MUTED, lineHeight: 1.5 }}>即時預覽前台會員看到的等級與權益內容</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 16 }}>
              {['coach', 'user', 'ambassador'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setSettings(prev => ({ ...prev, _previewTab: tab }))}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: 'none',
                    background: (settings._previewTab || 'coach') === tab ? 'var(--color-primary)' : 'transparent',
                    color: (settings._previewTab || 'coach') === tab ? '#FFF' : MUTED,
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  {tab === 'coach' ? '教練抽成預覽' : tab === 'user' ? '學員權益預覽' : '推廣分潤預覽'}
                </button>
              ))}
            </div>

            <div style={{ padding: 16, background: '#000', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
              {(settings._previewTab || 'coach') === 'coach' && <CoachTiers settings={settings} />}
              {(settings._previewTab || 'coach') === 'user' && <UserTiers settings={settings} />}
              {(settings._previewTab || 'coach') === 'ambassador' && <AmbassadorTiers settings={settings} />}
            </div>
          </div>
        </div>

        {perksModal.isOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div style={{ background: CARD_BG, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, width: '100%', maxWidth: 500, overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: DARK, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Gift size={20} color="#10B981" />
                  編輯{perksModal.type === 'coach' ? '教練' : '學員'}階級附帶權益
                </h3>
                <button onClick={() => setPerksModal({ isOpen: false, type: null, idx: null, data: [] })} style={{ background: 'transparent', border: 'none', color: MUTED, cursor: 'pointer' }}>
                  <X size={24} />
                </button>
              </div>
              <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
                {perksModal.data.map((perk, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8 }}>
                    <input 
                      type="text" 
                      value={perk}
                      onChange={e => {
                        const newData = [...perksModal.data];
                        newData[i] = e.target.value;
                        setPerksModal({ ...perksModal, data: newData });
                      }}
                      placeholder="如: 儲值滿 3,000 送 300 點"
                      style={{ flex: 1, background: INPUT_BG, border: '1px solid rgba(255,255,255,0.05)', padding: '12px 16px', fontSize: 14, fontWeight: 800, color: DARK, borderRadius: 12, outline: 'none' }}
                    />
                    <button 
                      onClick={() => {
                        const newData = perksModal.data.filter((_, index) => index !== i);
                        setPerksModal({ ...perksModal, data: newData });
                      }}
                      style={{ width: 48, background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: 'none', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
                <button 
                  onClick={() => setPerksModal({ ...perksModal, data: [...perksModal.data, ''] })}
                  style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', border: 'none', padding: '12px', borderRadius: 12, fontWeight: 800, cursor: 'pointer', marginTop: 8 }}
                >
                  + 新增一筆權益項目
                </button>
              </div>
              <div style={{ padding: '20px 24px', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 12 }}>
                <button 
                  onClick={savePerksBuilder}
                  style={{ flex: 1, background: '#10B981', color: '#FFF', border: 'none', padding: '14px', borderRadius: 12, fontWeight: 900, cursor: 'pointer', fontSize: 16 }}
                >
                  確認儲存權益清單
                </button>
              </div>
            </div>
          </div>
        )}

        {missionModal.isOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div style={{ background: CARD_BG, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, width: '100%', maxWidth: 500, overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: DARK, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Target size={20} color="#818CF8" />
                  編輯{missionModal.type === 'coach' ? '教練' : '學員'}複合任務條件
                </h3>
                <button onClick={() => setMissionModal({ isOpen: false, type: null, idx: null, data: {} })} style={{ background: 'transparent', border: 'none', color: MUTED, cursor: 'pointer' }}>
                  <X size={24} />
                </button>
              </div>
              <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 800, color: MUTED, marginBottom: 8 }}>累積完/上課數 (堂)</label>
                  <input 
                    type="number" 
                    value={missionModal.data.completed_sessions || ''}
                    onChange={e => setMissionModal({ ...missionModal, data: { ...missionModal.data, completed_sessions: e.target.value ? Number(e.target.value) : undefined }})}
                    style={{ width: '100%', background: INPUT_BG, border: '1px solid rgba(255,255,255,0.05)', padding: '12px 16px', fontSize: 16, fontWeight: 800, color: DARK, borderRadius: 12 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 800, color: MUTED, marginBottom: 8 }}>累積{missionModal.type === 'coach' ? '營收' : '消費'} (點)</label>
                  <input 
                    type="number" 
                    value={missionModal.data.revenue || ''}
                    onChange={e => setMissionModal({ ...missionModal, data: { ...missionModal.data, revenue: e.target.value ? Number(e.target.value) : undefined }})}
                    style={{ width: '100%', background: INPUT_BG, border: '1px solid rgba(255,255,255,0.05)', padding: '12px 16px', fontSize: 16, fontWeight: 800, color: DARK, borderRadius: 12 }}
                  />
                </div>
                {missionModal.type === 'coach' && (
                  <div>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 800, color: MUTED, marginBottom: 8 }}>最低評價星等要求 (星)</label>
                    <input 
                      type="number" step="0.1" min="0" max="5"
                      value={missionModal.data.min_rating || ''}
                      onChange={e => {
                        let val = e.target.value ? Number(e.target.value) : undefined;
                        if (val > 5) val = 5;
                        if (val < 0) val = 0;
                        setMissionModal({ ...missionModal, data: { ...missionModal.data, min_rating: val }});
                      }}
                      style={{ width: '100%', background: INPUT_BG, border: '1px solid rgba(255,255,255,0.05)', padding: '12px 16px', fontSize: 16, fontWeight: 800, color: DARK, borderRadius: 12 }}
                    />
                  </div>
                )}
                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 800, color: MUTED, marginBottom: 8 }}>必備指定稱號</label>
                  <select
                    value={missionModal.data.required_title || ''}
                    onChange={e => setMissionModal({ ...missionModal, data: { ...missionModal.data, required_title: e.target.value || undefined }})}
                    style={{ width: '100%', background: INPUT_BG, border: '1px solid rgba(255,255,255,0.05)', padding: '12px 16px', fontSize: 16, fontWeight: 800, color: DARK, borderRadius: 12, appearance: 'none', cursor: 'pointer' }}
                  >
                    <option value="" style={{ background: '#11141A' }}>-- 不限制 --</option>
                    {(missionModal.type === 'coach' ? settings.coach_review_titles : settings.student_review_titles).map(t => (
                      <option key={t} value={t} style={{ background: '#11141A' }}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ padding: '20px 24px', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 12 }}>
                <button 
                  onClick={saveMissionBuilder}
                  style={{ flex: 1, background: '#4F46E5', color: '#FFF', border: 'none', padding: '14px', borderRadius: 12, fontWeight: 900, cursor: 'pointer', fontSize: 16 }}
                >
                  確認儲存組合
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
