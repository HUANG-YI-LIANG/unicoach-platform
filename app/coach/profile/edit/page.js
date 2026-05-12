'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import {
  User, Mail, BookOpen, FileDigit,
  MapPin, DollarSign, Save, ArrowLeft, Loader2, Tag,
  ShieldCheck, UploadCloud, AlertCircle, CheckCircle, Clock, Sparkles
} from 'lucide-react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '@/lib/cropImage';

const ORANGE = 'var(--cta, #F97316)';
const BG     = 'var(--bg-page)';
const CARD   = 'var(--bg-surface)';
const MUTED  = 'var(--text-muted)';
const TEXT_LIGHT = 'var(--text-main)';
const RADIUS = '20px';
const SHADOW = 'var(--shadow-md, 0 8px 30px rgba(0,0,0,0.1))';
const INPUT_BG = 'var(--bg-input)';
const BORDER = 'var(--border-main)';

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
    avatar_url: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState(null);
  const [vStatus, setVStatus] = useState('pending');
  const [vNotes, setVNotes] = useState('');
  const [priceError, setPriceError] = useState('');

  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isCropping, setIsCropping] = useState(false);

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

    if (type === 'avatar') {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        setCropImageSrc(reader.result);
        setIsCropping(true);
      };
      e.target.value = '';
      return;
    }

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
        alert('文件已上傳並進入審核程序');
        setVStatus('pending');
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

  const confirmCropAndUpload = async () => {
    if (!cropImageSrc || !croppedAreaPixels) return;
    setUploading(true);
    setUploadType('avatar');
    setIsCropping(false);
    
    try {
      const croppedImageBlob = await getCroppedImg(cropImageSrc, croppedAreaPixels);
      const formDataPayload = new FormData();
      formDataPayload.append('file', croppedImageBlob, 'avatar.jpg');
      formDataPayload.append('fileType', 'avatar');

      const res = await fetch('/api/files/upload', {
        method: 'POST',
        body: formDataPayload,
      });
      const data = await res.json();
      if (res.ok) {
        setFormData(prev => ({ ...prev, avatar_url: data.avatar_url }));
        alert('頭像已成功更新');
      } else {
        alert('上傳失敗：' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('發生技術錯誤');
    } finally {
      setUploading(false);
      setUploadType(null);
      setCropImageSrc(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'80vh', color: ORANGE, background: BG }}>
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  const inputStyle = { width:'100%', padding:'12px 16px', borderRadius: 12, border: `1px solid ${BORDER}`, fontSize: 14, background: INPUT_BG, color: TEXT_LIGHT };
  const labelStyle = { display:'flex', alignItems:'center', gap: 6, fontSize: 13, fontWeight: 700, color: TEXT_LIGHT, marginBottom: 8 };

  return (
    <div style={{ background: BG, minHeight: '100vh', paddingBottom: 60, color: TEXT_LIGHT, position: 'relative', overflowX: 'hidden' }}>
      {/* Background Gradient */}
      <div style={{
        position: 'absolute', top: -100, left: '50%', transform: 'translateX(-50%)',
        width: '600px', height: '600px',
        background: 'radial-gradient(circle, rgba(249, 115, 22, 0.1) 0%, rgba(9, 14, 23, 0) 60%)',
        zIndex: 0, pointerEvents: 'none'
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Top Bar */}
        <div style={{
          padding: '20px 16px', background: 'var(--color-surface)', display:'flex', alignItems:'center',
          gap: 12, borderBottom: `1px solid ${BORDER}`, position:'sticky', top: 0, zIndex: 10
        }}>
          <button
            onClick={() => router.back()}
            style={{ background: INPUT_BG, border:'none', borderRadius: 12, padding: 8, cursor:'pointer' }}
          >
            <ArrowLeft size={20} color={TEXT_LIGHT} />
          </button>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: TEXT_LIGHT }}>編輯教練資料</h1>
        </div>

        <form onSubmit={handleSave} style={{ padding: '24px 16px', display:'flex', flexDirection:'column', gap: 24 }}>

          {/* Avatar Section */}
          <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                width: 100, height: 100, borderRadius: '50%', background: INPUT_BG,
                overflow: 'hidden', border: `3px solid ${ORANGE}`, boxShadow: `0 0 20px rgba(249, 115, 22, 0.3)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {formData.avatar_url ? (
                  <img src={formData.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Avatar" />
                ) : (
                  <span style={{ fontSize: 32, fontWeight: 800, color: MUTED }}>{formData.name?.charAt(0) || 'C'}</span>
                )}
              </div>
              <label style={{
                position: 'absolute', bottom: 0, right: 0, background: ORANGE, color: TEXT_LIGHT,
                width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer', border: `2px solid ${BG}`
              }}>
                {uploading && uploadType === 'avatar' ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'avatar')} disabled={uploading} />
              </label>
            </div>
            <p style={{ fontSize: 13, fontWeight: 700, color: TEXT_LIGHT }}>更換教練頭像</p>
          </section>

          {/* Basic Info Card */}
          <section>
            <p style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom: 12, paddingLeft: 4 }}>基本資料</p>
            <div style={{ background: 'var(--color-surface)', borderRadius: RADIUS, boxShadow: SHADOW, padding: 20, display:'flex', flexDirection:'column', gap: 16, border: `1px solid ${BORDER}` }}>

              <div>
                <label style={labelStyle}>
                  <User size={14} color={ORANGE} /> 教練名稱
                </label>
                <input
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="請輸入顯示名稱"
                  style={inputStyle}
                  required
                />
              </div>

              <div>
                <label style={{ ...labelStyle, color: MUTED }}>
                  <Mail size={14} /> 電子信箱 (無法修改)
                </label>
                <input
                  value={formData.email}
                  readOnly
                  style={{ ...inputStyle, background: 'rgba(255,255,255,0.02)', color: MUTED }}
                />
              </div>

              <div>
                <label style={labelStyle}>
                  <MapPin size={14} color={ORANGE} /> 上課地區 / 縣市
                </label>
                <input
                  value={formData.location}
                  onChange={e => setFormData({...formData, location: e.target.value})}
                  placeholder="例如：台北市, 新北市"
                  style={inputStyle}
                  required
                />
              </div>

              <div>
                <label style={labelStyle}>
                  <Tag size={14} color={ORANGE} /> 服務項目 / 分類
                </label>
                <input
                  value={formData.service_areas}
                  onChange={e => setFormData({...formData, service_areas: e.target.value})}
                  placeholder="例如：籃球, 數學, 伴讀 (多項請用逗號分隔)"
                  style={inputStyle}
                  required
                />
                <p style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>※ 這會影響到學生在首頁的搜尋結果</p>
              </div>

              <div style={{ background: "rgba(249, 115, 22, 0.05)", padding: 16, borderRadius: 12, border: "1px dashed var(--cta)" }}>
                <label style={labelStyle}>
                  <DollarSign size={14} color={ORANGE} /> 預設每小時底價 (TWD)
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
                      border: `1px solid ${priceError ? '#EF4444' : BORDER}`,
                      fontSize: 14, outline: 'none', background: INPUT_BG, color: TEXT_LIGHT
                    }}
                    required
                  />
                </div>
                {priceError && <p style={{ fontSize: 11, color: '#EF4444', marginTop: 4, fontWeight: 700 }}>{priceError}</p>}
                <div style={{ fontSize: 12, color: ORANGE, marginTop: 12, fontWeight: 700, display: "flex", gap: 6, alignItems: "flex-start", lineHeight: 1.5 }}>
                  <Sparkles size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>
                    擁有雙專長的您，想為「運動」和「伴讀」設定不同價格嗎？<br/>
                    別擔心！這裡請先填寫一個平均底價。儲存資料後，系統會引導您到「建立課程方案」，屆時就能針對不同科目設定專屬價格囉！
                  </span>
                </div>
              </div>

              <div>
                <label style={labelStyle}>
                  <BookOpen size={14} color={ORANGE} /> 教學經驗詳述
                </label>
                <input
                  value={formData.experience}
                  onChange={e => setFormData({...formData, experience: e.target.value})}
                  placeholder="例如：10年籃球教學經驗"
                  style={inputStyle}
                  required
                />
              </div>

              {/* Box Sections */}
              {[
                {
                  id: 'philosophy',
                  icon: FileDigit,
                  title: '給家長的一段話 (核心教學理念)',
                  hint: '💡 提示：家長最在意「安全」、「教練的耐心」與「品格發展」。請用親切的語氣對家長說話。',
                  template: '親愛的家長您好，我是 [您的名字/暱稱] 教練。在我的球場上，比起輸贏，我更在乎孩子是否學會 [請填寫您重視的品格，例如：團隊合作/運動家精神]，以及如何保護自己不輕易受傷。我會用耐心陪伴孩子進步！',
                  placeholder: '例如：親愛的家長您好，我是 OOO 教練。在我的球場上...'
                },
                {
                  id: 'teaching_features',
                  icon: BookOpen,
                  title: '課程特色與預期成長',
                  hint: '💡 提示：具體說明孩子在身體素質或心理素質上能獲得什麼改變。',
                  template: '針對初學的孩子，我會先從 [請填寫基礎訓練，例如：基礎球感與協調性] 練起，避免一開始就高強度訓練導致排斥。[請填寫預期時間，例如：三個月] 後，孩子將能掌握 [請填寫具體技巧]，並顯著提升專注力與抗壓性。',
                  placeholder: '例如：針對初學的孩子，我會先從基礎球感練起...'
                },
                {
                  id: 'communication_style',
                  icon: Mail,
                  title: '家長溝通機制',
                  hint: '💡 提示：40幾歲的家長非常重視「知情權」，明確的溝通機制能大幅提升信任感。',
                  template: '每堂課結束的最後 5 分鐘，我會向您說明今天的練習重點與孩子的狀況；若您無法到場陪同，我也會透過 [請填寫溝通方式，例如：LINE文字 / 短影音] 簡單回報今日進度。',
                  placeholder: '例如：每堂課結束的最後 5 分鐘，我會向您說明...'
                },
                {
                  id: 'policy_rules',
                  icon: DollarSign,
                  title: '請假、補課與場地費規則',
                  hint: '💡 提示：費用與請假規則必須透明，避免日後爭議。',
                  template: '目前報價 [包含 / 不包含] 場地租借費，場地費由 [雙方平攤 / 教練吸收 / 學員自付]。若孩子生病需請假，請盡量於課前 [請填寫時數] 小時通知，以免產生場地取消費用；無故缺席將 [請填寫處理方式，例如：計算一堂課費]。',
                  placeholder: '例如：費用已包含/不包含場地費。若孩子生病需請假...'
                }
              ].map(section => (
                <div key={section.id} style={{ background: INPUT_BG, padding: 20, borderRadius: 16, border: `1px solid ${BORDER}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 800, color: TEXT_LIGHT }}>
                        <section.icon size={16} color={ORANGE} /> {section.title}
                      </label>
                      <p style={{ fontSize: 12, color: MUTED, margin: '4px 0 0 0' }}>{section.hint}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({...prev, [section.id]: section.template}))}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(249, 115, 22, 0.1)', color: ORANGE, border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', marginLeft: 12 }}
                    >
                      <Sparkles size={14} /> 套用範本
                    </button>
                  </div>
                  <textarea
                    value={formData[section.id]}
                    onChange={e => setFormData({...formData, [section.id]: e.target.value})}
                    placeholder={section.placeholder}
                    rows={4}
                    style={{ ...inputStyle, background: 'rgba(255,255,255,0.02)', lineHeight: 1.6 }}
                  />
                </div>
              ))}

              {/* Trust Badges */}
              <div style={{ background: INPUT_BG, padding: 20, borderRadius: 16, border: `1px solid ${BORDER}` }}>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 800, color: TEXT_LIGHT }}>
                    <ShieldCheck size={16} color="#059669" /> 安全與專業證照 (建立信任的關鍵！)
                  </label>
                  <p style={{ fontSize: 12, color: MUTED, margin: '4px 0 0 0' }}>💡 提示：勾選您已具備的證照，系統會在教練列表顯示特殊徽章，大幅提升家長預約意願。</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { id: 'coach_license', label: '特定項目專業證照 (如教練證、多益金色證書等)' },
                    { id: 'cpr_aed', label: '運動防護/急救證照 (CPR/AED)' },
                    { id: 'police_check', label: '良民證 (無犯罪紀錄證明)' }
                  ].map(badge => (
                    <label key={badge.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, color: TEXT_LIGHT, fontWeight: 700 }}>
                      <input
                        type="checkbox"
                        style={{ width: 18, height: 18, accentColor: ORANGE }}
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

          {/* Identity Verification Card */}
          <section>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 12, paddingLeft: 4 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform:'uppercase', letterSpacing:'0.1em', margin: 0 }}>身份驗證 (信任建置)</p>
              <div style={{
                display:'flex', alignItems:'center', gap: 6, fontSize: 11, fontWeight: 800,
                color: vStatus === 'approved' ? '#10B981' : vStatus === 'rejected' ? '#EF4444' : ORANGE,
                background: vStatus === 'approved' ? 'rgba(16, 185, 129, 0.1)' : vStatus === 'rejected' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(249, 115, 22, 0.1)',
                padding: '2px 10px', borderRadius: 100
              }}>
                {vStatus === 'approved' ? <CheckCircle size={12} /> : vStatus === 'rejected' ? <AlertCircle size={12} /> : <Clock size={12} />}
                {vStatus === 'approved' ? '已驗證' : vStatus === 'rejected' ? '已退回' : '審核中'}
              </div>
            </div>

            <div style={{ background: 'var(--color-surface)', borderRadius: RADIUS, boxShadow: SHADOW, padding: 20, border: `1px solid ${BORDER}` }}>
              <div style={{ display:'flex', flexDirection:'column', gap: 16 }}>
                <div style={{ display:'flex', gap: 16, alignItems:'center' }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 12, background: INPUT_BG,
                    display:'flex', alignItems:'center', justifyContent:'center', border: `1px solid ${BORDER}`
                  }}>
                    <ShieldCheck size={24} color={ORANGE} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: TEXT_LIGHT }}>學生證 / 專業證明</h4>
                    <p style={{ margin: 0, fontSize: 11, color: MUTED }}>上傳後由管理員審核，通過後將獲得藍色勾勾</p>
                  </div>
                </div>

                {vStatus === 'rejected' && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: 12, borderRadius: 12 }}>
                    <p style={{ margin: 0, fontSize: 12, color: '#FCA5A5', fontWeight: 700 }}>審核退回原因：</p>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#FECACA' }}>{vNotes || '文件模糊或不完整，請重新上傳清晰正本。'}</p>
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
                    width:'100%', padding:'16px', borderRadius: 12, border: `2px dashed ${MUTED}`,
                    display:'flex', alignItems:'center', justifyContent:'center', gap: 8,
                    background: uploading ? INPUT_BG : 'transparent',
                    transition: 'background 0.2s'
                  }}>
                    {uploading ? <Loader2 className="animate-spin" size={18} color={ORANGE} /> : <UploadCloud size={18} color={MUTED} />}
                    <span style={{ fontSize: 13, fontWeight: 700, color: uploading ? ORANGE : MUTED }}>
                      {uploading ? '正在處理圖片...' : '點擊或拖拽檔案至此上傳'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Submit Button */}
          <div style={{ marginTop: 12 }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                width:'100%', height: 56, background: ORANGE, color: 'var(--text-light)',
                border:'none', borderRadius: 16, fontSize: 16, fontWeight: 800,
                display:'flex', alignItems:'center', justifyContent:'center', gap: 8,
                boxShadow: `0 8px 25px rgba(249, 115, 22, 0.4)`,
                opacity: saving ? 0.7 : 1,
                cursor: saving ? 'not-allowed' : 'pointer',
                transition: 'transform 0.2s'
              }}
            >
              {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              儲存變更
            </button>
          </div>

        </form>
      </div>

      {/* Cropper Modal */}
      {isCropping && cropImageSrc && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '90%', maxWidth: 400, background: 'var(--bg-surface)', borderRadius: 20, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BORDER}` }}>
              <h3 style={{ margin: 0, color: TEXT_LIGHT, fontSize: 16, fontWeight: 800 }}>調整大頭貼</h3>
            </div>
            <div style={{ position: 'relative', width: '100%', height: 300, background: '#111' }}>
              <Cropper
                image={cropImageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(croppedArea, croppedAreaPixels) => setCroppedAreaPixels(croppedAreaPixels)}
              />
            </div>
            <div style={{ padding: 20, display: 'flex', gap: 12 }}>
              <button type="button" onClick={() => { setIsCropping(false); setCropImageSrc(null); }} style={{ flex: 1, padding: 12, borderRadius: 12, background: 'transparent', border: `1px solid ${BORDER}`, color: TEXT_LIGHT, fontWeight: 800, cursor: 'pointer' }}>取消</button>
              <button type="button" onClick={confirmCropAndUpload} style={{ flex: 1, padding: 12, borderRadius: 12, background: ORANGE, border: 'none', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>確認裁切</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
