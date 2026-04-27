'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { 
  User, Mail, BookOpen, FileDigit, 
  MapPin, DollarSign, Save, ArrowLeft, Loader2, Tag,
  ShieldCheck, UploadCloud, AlertCircle, CheckCircle, Clock, Sparkles
} from 'lucide-react';

const BLUE   = '#2563EB';
const BG     = '#F1F5F9';
const CARD   = '#FFFFFF';
const MUTED  = '#94A3B8';
const DARK   = '#0F172A';
const WHITE  = '#FFFFFF';
const RADIUS = '20px';
const SHADOW = '0 2px 16px rgba(0,0,0,0.06)';

export default function CoachProfileEdit() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
    const [formData, setFormData] = useState({
    name: '',
    email: '',
    service_areas: '',
    experience: '',
    philosophy: '',
    teaching_features: '',
    communication_style: '',
    policy_rules: '',
    trust_badges: [],
    base_price: 800,
    location: '',
    avatar_url: '' // ✅ 新增頭像 URL
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState(null); // 'avatar' or 'student_id'
  const [vStatus, setVStatus] = useState('pending');
  const [vNotes, setVNotes] = useState('');
  const [priceError, setPriceError] = useState('');

  const PRICE_MIN = 600;
  const PRICE_MAX = 2000;

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'coach' && user.role !== 'admin') {
        router.push('/dashboard/user');
      } else {
        fetchProfile();
      }
    }
  }, [user, authLoading, router]);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/auth/profile');
      if (res.ok) {
        const data = await res.json();
        setFormData({
          name: data.profile?.name || '',
          email: data.profile?.email || '',
          service_areas: data.coach?.service_areas || '',
          experience: data.coach?.experience || '',
          philosophy: data.coach?.philosophy || '',
          teaching_features: data.coach?.teaching_features || '',
          communication_style: data.coach?.communication_style || '',
          policy_rules: data.coach?.policy_rules || '',
          trust_badges: data.coach?.trust_badges || [],
          base_price: data.coach?.base_price || 1000,
          location: data.coach?.location || '',
          avatar_url: data.profile?.avatar_url || ''
        });
        setVStatus(data.coach?.approval_status || 'pending');
        setVNotes(data.coach?.verification_notes || '');
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    if (!formData.service_areas?.trim()) {
      alert('請填寫服務項目（分類），這會影響學生在首頁的搜尋結果！');
      setSaving(false);
      return;
    }

    if (formData.base_price < PRICE_MIN || formData.base_price > PRICE_MAX) {
      alert(`定價必須在 ${PRICE_MIN} 到 ${PRICE_MAX} 元之間！`);
      setSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        alert('資料已成功更新！');
        router.push('/dashboard/coach');
        router.refresh();
      } else {
        alert('更新失敗：' + (data.error || '未定義錯誤'));
      }
    } catch (err) {
      console.error('Save error:', err);
      alert('發生錯誤，請稍後再試。');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e, type = 'student_id') => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) return alert('檔案不得超過 5MB');

    setUploading(true);
    setUploadType(type);
    const formDataPayload = new FormData();
    formDataPayload.append('file', file);
    formDataPayload.append('fileType', type);

    try {
      const res = await fetch('/api/files/upload', {
        method: 'POST',
        body: formDataPayload,
      });
      const data = await res.json();
      if (res.ok) {
        if (type === 'avatar') {
          setFormData(prev => ({ ...prev, avatar_url: data.avatar_url }));
          alert('頭像已更新');
        } else {
          alert('文件已上傳並進入審核程序');
          setVStatus('pending');
        }
      } else {
        alert('上傳失敗：' + data.error);
      }
    } catch (err) {
      alert('發生技術錯誤');
    } finally {
      setUploading(false);
      setUploadType(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'80vh', color: MUTED }}>
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div style={{ background: BG, minHeight: '100vh', paddingBottom: 60 }}>
      {/* ── 1. Top Bar ────────────────────────────────────────── */}
      <div style={{ 
        padding: '20px 16px', background: CARD, display:'flex', alignItems:'center', 
        gap: 12, borderBottom: `1px solid ${BG}`, position:'sticky', top: 0, zIndex: 10 
      }}>
        <button 
          onClick={() => router.back()}
          style={{ background: BG, border:'none', borderRadius: 12, padding: 8, cursor:'pointer' }}
        >
          <ArrowLeft size={20} color={DARK} />
        </button>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: DARK }}>編輯教練資料</h1>
      </div>

      <form onSubmit={handleSave} style={{ padding: '24px 16px', display:'flex', flexDirection:'column', gap: 24 }}>
        
        {/* ── 1.5 Avatar Section (NEW) ─────────────────────────── */}
        <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{ position: 'relative' }}>
            <div style={{ 
              width: 100, height: 100, borderRadius: '50%', background: '#E2E8F0', 
              overflow: 'hidden', border: `3px solid ${WHITE}`, boxShadow: SHADOW,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {formData.avatar_url ? (
                <img src={formData.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Avatar" />
              ) : (
                <span style={{ fontSize: 32, fontWeight: 800, color: BLUE }}>{formData.name?.charAt(0) || 'C'}</span>
              )}
            </div>
            <label style={{ 
              position: 'absolute', bottom: 0, right: 0, background: BLUE, color: WHITE, 
              width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', 
              justifyContent: 'center', cursor: 'pointer', border: `2px solid ${WHITE}`
            }}>
              {uploading && uploadType === 'avatar' ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'avatar')} disabled={uploading} />
            </label>
          </div>
          <p style={{ fontSize: 13, fontWeight: 700, color: DARK }}>更換教練頭像</p>
        </section>

        {/* ── 2. Basic Info Card ───────────────────────────────── */}
        <section>
          <p style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom: 12, paddingLeft: 4 }}>基本資料</p>
          <div style={{ background: CARD, borderRadius: RADIUS, boxShadow: SHADOW, padding: 20, display:'flex', flexDirection:'column', gap: 16 }}>
            
            <div>
              <label style={{ display:'flex', alignItems:'center', gap: 6, fontSize: 13, fontWeight: 700, color: DARK, marginBottom: 8 }}>
                <User size={14} color={BLUE} /> 教練名稱
              </label>
              <input 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="請輸入顯示名稱"
                style={{ width:'100%', padding:'12px 16px', borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 14 }}
                required
              />
            </div>

            <div>
              <label style={{ display:'flex', alignItems:'center', gap: 6, fontSize: 13, fontWeight: 700, color: MUTED, marginBottom: 8 }}>
                <Mail size={14} /> 電子信箱 (無法修改)
              </label>
              <input 
                value={formData.email}
                readOnly
                style={{ width:'100%', padding:'12px 16px', borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 14, background: '#F8FAFC', color: MUTED }}
              />
            </div>

            <div>
              <label style={{ display:'flex', alignItems:'center', gap: 6, fontSize: 13, fontWeight: 700, color: DARK, marginBottom: 8 }}>
                <MapPin size={14} color={BLUE} /> 上課地區 / 縣市
              </label>
              <input 
                value={formData.location}
                onChange={e => setFormData({...formData, location: e.target.value})}
                placeholder="例如：台北市, 新北市"
                style={{ width:'100%', padding:'12px 16px', borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 14 }}
                required
              />
            </div>

            <div>
              <label style={{ display:'flex', alignItems:'center', gap: 6, fontSize: 13, fontWeight: 700, color: DARK, marginBottom: 8 }}>
                <Tag size={14} color={BLUE} /> 服務項目 / 分類
              </label>
              <input 
                value={formData.service_areas}
                onChange={e => setFormData({...formData, service_areas: e.target.value})}
                placeholder="籃球, 桌球 (多項請用逗號分隔)"
                style={{ width:'100%', padding:'12px 16px', borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 14 }}
                required
              />
              <p style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>※ 這會影響到學生在首頁的搜尋結果</p>
            </div>

            <div>
              <label style={{ display:'flex', alignItems:'center', gap: 6, fontSize: 13, fontWeight: 700, color: DARK, marginBottom: 8 }}>
                <DollarSign size={14} color={BLUE} /> 每小時課程定價 (TWD)
              </label>
              <div style={{ position:'relative' }}>
                <span style={{ position:'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: MUTED, fontSize: 14 }}>$</span>
                <input 
                  type="number"
                  value={formData.base_price}
                  onChange={e => {
                    const val = parseInt(e.target.value) || 0;
                    setFormData({...formData, base_price: e.target.value});
                    if (val < PRICE_MIN) setPriceError(`⚠️ 價格不得低於 ${PRICE_MIN} TWD`);
                    else if (val > PRICE_MAX) setPriceError(`⚠️ 價格不得高於 ${PRICE_MAX} TWD`);
                    else setPriceError('');
                  }}
                  placeholder="例如：1000"
                  style={{ 
                    width:'100%', padding:'12px 16px 12px 32px', borderRadius: 12, 
                    border: `1px solid ${priceError ? '#EF4444' : '#E2E8F0'}`, 
                    fontSize: 14, outline: 'none'
                  }}
                  required
                />
              </div>
              {priceError && <p style={{ fontSize: 11, color: '#EF4444', marginTop: 4, fontWeight: 700 }}>{priceError}</p>}
              <div style={{ fontSize: 11, color: MUTED, marginTop: 4, lineHeight: 1.5 }}>
                <p style={{ margin: 0 }}>建議價格範圍：</p>
                <p style={{ margin: 0 }}>• 新手教練：600 ～ 1,000 TWD/hr</p>
                <p style={{ margin: 0 }}>• 熱門教練：1,000 ～ 1,600 TWD/hr</p>
                <p style={{ margin: 0 }}>• 進階教練：1,600 以上 TWD/hr</p>
              </div>
            </div>

            <div>
              <label style={{ display:'flex', alignItems:'center', gap: 6, fontSize: 13, fontWeight: 700, color: DARK, marginBottom: 8 }}>
                <BookOpen size={14} color={BLUE} /> 教學經驗詳述
              </label>
              <input 
                value={formData.experience}
                onChange={e => setFormData({...formData, experience: e.target.value})}
                placeholder="例如：10年籃球教學經驗"
                style={{ width:'100%', padding:'12px 16px', borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 14 }}
                required
              />
            </div>

            {/* ── 欄位 A: 教學理念 ── */}
            <div style={{ background: '#F8FAFC', padding: 20, borderRadius: 16, border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 800, color: DARK }}>
                    <FileDigit size={16} color={BLUE} /> 給家長的一段話 (核心教學理念)
                  </label>
                  <p style={{ fontSize: 12, color: MUTED, margin: '4px 0 0 0' }}>💡 提示：家長最在意「安全」、「教練的耐心」與「品格發展」。請用親切的語氣對家長說話。</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setFormData(prev => ({...prev, philosophy: "親愛的家長您好，我是 [您的名字/暱稱] 教練。在我的球場上，比起輸贏，我更在乎孩子是否學會 [請填寫您重視的品格，例如：團隊合作/運動家精神]，以及如何保護自己不輕易受傷。我會用耐心陪伴孩子進步！"}))}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#EFF6FF', color: BLUE, border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  <Sparkles size={14} /> 套用家長安心範本
                </button>
              </div>
              <textarea 
                value={formData.philosophy}
                onChange={e => setFormData({...formData, philosophy: e.target.value})}
                placeholder="例如：親愛的家長您好，我是 OOO 教練。在我的球場上..."
                rows={4}
                style={{ width:'100%', padding:'12px 16px', borderRadius: 12, border: '1px solid #CBD5E1', fontSize: 14, lineHeight: 1.6 }}
              />
            </div>

            {/* ── 欄位 B: 課程特色 ── */}
            <div style={{ background: '#F8FAFC', padding: 20, borderRadius: 16, border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 800, color: DARK }}>
                    <BookOpen size={16} color={BLUE} /> 課程特色與預期成長
                  </label>
                  <p style={{ fontSize: 12, color: MUTED, margin: '4px 0 0 0' }}>💡 提示：具體說明孩子在身體素質或心理素質上能獲得什麼改變。</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setFormData(prev => ({...prev, teaching_features: "針對初學的孩子，我會先從 [請填寫基礎訓練，例如：基礎球感與協調性] 練起，避免一開始就高強度訓練導致排斥。[請填寫預期時間，例如：三個月] 後，孩子將能掌握 [請填寫具體技巧]，並顯著提升專注力與抗壓性。"}))}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#EFF6FF', color: BLUE, border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  <Sparkles size={14} /> 套用家長安心範本
                </button>
              </div>
              <textarea 
                value={formData.teaching_features}
                onChange={e => setFormData({...formData, teaching_features: e.target.value})}
                placeholder="例如：針對初學的孩子，我會先從基礎球感練起..."
                rows={4}
                style={{ width:'100%', padding:'12px 16px', borderRadius: 12, border: '1px solid #CBD5E1', fontSize: 14, lineHeight: 1.6 }}
              />
            </div>

            {/* ── 欄位 C: 家長溝通機制 ── */}
            <div style={{ background: '#F8FAFC', padding: 20, borderRadius: 16, border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 800, color: DARK }}>
                    <Mail size={16} color={BLUE} /> 家長溝通機制
                  </label>
                  <p style={{ fontSize: 12, color: MUTED, margin: '4px 0 0 0' }}>💡 提示：40幾歲的家長非常重視「知情權」，明確的溝通機制能大幅提升信任感。</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setFormData(prev => ({...prev, communication_style: "每堂課結束的最後 5 分鐘，我會向您說明今天的練習重點與孩子的狀況；若您無法到場陪同，我也會透過 [請填寫溝通方式，例如：LINE文字 / 短影音] 簡單回報今日進度。"}))}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#EFF6FF', color: BLUE, border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  <Sparkles size={14} /> 套用家長安心範本
                </button>
              </div>
              <textarea 
                value={formData.communication_style}
                onChange={e => setFormData({...formData, communication_style: e.target.value})}
                placeholder="例如：每堂課結束的最後 5 分鐘，我會向您說明..."
                rows={3}
                style={{ width:'100%', padding:'12px 16px', borderRadius: 12, border: '1px solid #CBD5E1', fontSize: 14, lineHeight: 1.6 }}
              />
            </div>

            {/* ── 欄位 D: 請假與場地費規則 ── */}
            <div style={{ background: '#F8FAFC', padding: 20, borderRadius: 16, border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 800, color: DARK }}>
                    <DollarSign size={16} color={BLUE} /> 請假、補課與場地費規則
                  </label>
                  <p style={{ fontSize: 12, color: MUTED, margin: '4px 0 0 0' }}>💡 提示：費用與請假規則必須透明，避免日後爭議。</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setFormData(prev => ({...prev, policy_rules: "目前報價 [包含 / 不包含] 場地租借費，場地費由 [雙方平攤 / 教練吸收 / 學員自付]。若孩子生病需請假，請盡量於課前 [請填寫時數] 小時通知，以免產生場地取消費用；無故缺席將 [請填寫處理方式，例如：計算一堂課費]。"}))}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#EFF6FF', color: BLUE, border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  <Sparkles size={14} /> 套用透明規則範本
                </button>
              </div>
              <textarea 
                value={formData.policy_rules}
                onChange={e => setFormData({...formData, policy_rules: e.target.value})}
                placeholder="例如：費用已包含/不包含場地費。若孩子生病需請假..."
                rows={3}
                style={{ width:'100%', padding:'12px 16px', borderRadius: 12, border: '1px solid #CBD5E1', fontSize: 14, lineHeight: 1.6 }}
              />
            </div>

            {/* ── 信任徽章 (Trust Badges) ── */}
            <div style={{ background: '#F8FAFC', padding: 20, borderRadius: 16, border: '1px solid #E2E8F0' }}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 800, color: DARK }}>
                  <ShieldCheck size={16} color="#059669" /> 安全與專業證照 (建立信任的關鍵！)
                </label>
                <p style={{ fontSize: 12, color: MUTED, margin: '4px 0 0 0' }}>💡 提示：勾選您已具備的證照，系統會在教練列表顯示特殊徽章，大幅提升家長預約意願。</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { id: 'coach_license', label: '特定球類教練證 (如中華羽協/籃協 C級教練)' },
                  { id: 'cpr_aed', label: '運動防護/急救證照 (CPR/AED)' },
                  { id: 'police_check', label: '良民證 (無犯罪紀錄證明)' }
                ].map(badge => (
                  <label key={badge.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, color: DARK, fontWeight: 700 }}>
                    <input 
                      type="checkbox" 
                      style={{ width: 18, height: 18, accentColor: BLUE }}
                      checked={formData.trust_badges.includes(badge.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData(prev => ({...prev, trust_badges: [...prev.trust_badges, badge.id]}));
                        } else {
                          setFormData(prev => ({...prev, trust_badges: prev.trust_badges.filter(id => id !== badge.id)}));
                        }
                      }}
                    />
                    {badge.label}
                  </label>
                ))}
              </div>
            </div>

          </div>
        </section>

        {/* ── 4. Identity Verification Card ──────────────────────── */}
        <section>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 12, paddingLeft: 4 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform:'uppercase', letterSpacing:'0.1em', margin: 0 }}>身份驗證 (信任建置)</p>
            <div style={{ 
              display:'flex', alignItems:'center', gap: 6, fontSize: 11, fontWeight: 800, 
              color: vStatus === 'approved' ? '#059669' : vStatus === 'rejected' ? '#EF4444' : BLUE,
              background: vStatus === 'approved' ? '#D1FAE5' : vStatus === 'rejected' ? '#FEE2E2' : '#DBEAFE',
              padding: '2px 10px', borderRadius: 100
            }}>
              {vStatus === 'approved' ? <CheckCircle size={12} /> : vStatus === 'rejected' ? <AlertCircle size={12} /> : <Clock size={12} />}
              {vStatus === 'approved' ? '已驗證' : vStatus === 'rejected' ? '已退回' : '審核中'}
            </div>
          </div>

          <div style={{ background: CARD, borderRadius: RADIUS, boxShadow: SHADOW, padding: 20 }}>
            <div style={{ display:'flex', flexDirection:'column', gap: 16 }}>
              <div style={{ display:'flex', gap: 16, alignItems:'center' }}>
                <div style={{ 
                  width: 48, height: 48, borderRadius: 12, background: '#F8FAFC', 
                  display:'flex', alignItems:'center', justifyContent:'center', border: '1px solid #E2E8F0' 
                }}>
                  <ShieldCheck size={24} color={BLUE} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: DARK }}>學生證 / 專業證明</h4>
                  <p style={{ margin: 0, fontSize: 11, color: MUTED }}>上傳後由管理員審核，通過後將獲得藍色勾勾</p>
                </div>
              </div>

              {vStatus === 'rejected' && (
                <div style={{ background: '#FFF7ED', border: '1px solid #FFEDD5', padding: 12, borderRadius: 12 }}>
                  <p style={{ margin: 0, fontSize: 12, color: '#9A3412', fontWeight: 700 }}>審核退回原因：</p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#C2410C' }}>{vNotes || '文件模糊或不完整，請重新上傳清晰正本。'}</p>
                </div>
              )}

              <div style={{ position:'relative' }}>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileUpload}
                  style={{ position:'absolute', inset: 0, opacity: 0, cursor: uploading ? 'not-allowed' : 'pointer' }}
                  disabled={uploading}
                />
                <div style={{ 
                  width:'100%', padding:'16px', borderRadius: 12, border: '2px dashed #E2E8F0',
                  display:'flex', alignItems:'center', justifyContent:'center', gap: 8,
                  background: uploading ? '#F8FAFC' : 'transparent',
                  transition: 'background 0.2s'
                }}>
                  {uploading ? <Loader2 className="animate-spin" size={18} color={BLUE} /> : <UploadCloud size={18} color={MUTED} />}
                  <span style={{ fontSize: 13, fontWeight: 700, color: uploading ? BLUE : MUTED }}>
                    {uploading ? '正在處理圖片...' : '點擊或拖拽檔案至此上傳'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 5. Submit Button ─────────────────────────────────── */}
        <div style={{ marginTop: 12 }}>
          <button 
            type="submit"
            disabled={saving}
            style={{ 
              width:'100%', height: 56, background: BLUE, color: '#fff', 
              border:'none', borderRadius: 16, fontSize: 16, fontWeight: 800, 
              display:'flex', alignItems:'center', justifyContent:'center', gap: 8,
              boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
              opacity: saving ? 0.7 : 1,
              cursor: saving ? 'not-allowed' : 'pointer'
            }}
          >
            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            儲存變更
          </button>
        </div>

      </form>
    </div>
  );
}
