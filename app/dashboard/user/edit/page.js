'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { 
  User, Mail, Phone, MapPin, Target, 
  Languages, Save, ArrowLeft, Loader2, UploadCloud
} from 'lucide-react';

const BLUE   = '#2563EB';
const BG     = '#F1F5F9';
const CARD   = '#FFFFFF';
const MUTED  = '#94A3B8';
const DARK   = '#0F172A';
const RADIUS = '20px';
const SHADOW = '0 2px 16px rgba(0,0,0,0.06)';
const WHITE  = '#FFFFFF';

export default function UserProfileEdit() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    language: '中文',
    grade: '',
    gender: '',
    learning_goals: '',
    avatar_url: '',
    frequent_addresses: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // New Address UI State
  const [newLabel, setNewLabel] = useState('');
  const [newAddr, setNewAddr] = useState('');

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
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
        let freq = [];
        try {
          freq = data.profile?.frequent_addresses ? JSON.parse(data.profile.frequent_addresses) : [];
        } catch(e) { console.error(e); }

        setFormData({
          name: data.profile?.name || '',
          email: data.profile?.email || '',
          phone: data.profile?.phone || '',
          address: data.profile?.address || '',
          language: data.profile?.language || '中文',
          grade: data.profile?.grade || '',
          gender: data.profile?.gender || '',
          learning_goals: data.profile?.learning_goals || '',
          avatar_url: data.profile?.avatar_url || '',
          frequent_addresses: Array.isArray(freq) ? freq : []
        });
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
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        alert('資料已成功更新！');
        router.push('/dashboard/user');
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

  const addFrequent = () => {
    if (!newLabel || !newAddr) return;
    setFormData(prev => ({
      ...prev,
      frequent_addresses: [...prev.frequent_addresses, { label: newLabel, address: newAddr }]
    }));
    setNewLabel('');
    setNewAddr('');
  };

  const removeFrequent = (idx) => {
    setFormData(prev => ({
      ...prev,
      frequent_addresses: prev.frequent_addresses.filter((_, i) => i !== idx)
    }));
  };
/* ... (FileUpload logic remains same) ... */
/* ... existing code between handleFileUpload and the return section ... */
/* Updating sections inside the return */

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) return alert('頭像大小不得超過 2MB');

    setUploading(true);
    const formDataPayload = new FormData();
    formDataPayload.append('file', file);
    formDataPayload.append('fileType', 'avatar');

    try {
      const res = await fetch('/api/files/upload', {
        method: 'POST',
        body: formDataPayload,
      });
      const data = await res.json();
      if (res.ok) {
        setFormData(prev => ({ ...prev, avatar_url: data.avatar_url }));
        alert('頭像已預覽，請點擊「儲存變更」以完成更新。');
      } else {
        alert('上傳失敗：' + data.error);
      }
    } catch (err) {
      alert('上傳發生技術錯誤');
    } finally {
      setUploading(false);
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
      {/* ── Top Bar ────────────────────────────────────────── */}
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
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: DARK }}>編輯個人資料</h1>
      </div>

      <form onSubmit={handleSave} style={{ padding: '24px 16px', display:'flex', flexDirection:'column', gap: 24 }}>
        
        {/* ── Avatar Section (NEW) ───────────────────────────── */}
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
                <span style={{ fontSize: 32, fontWeight: 800, color: BLUE }}>{formData.name?.charAt(0) || 'U'}</span>
              )}
            </div>
            <label style={{ 
              position: 'absolute', bottom: 0, right: 0, background: BLUE, color: WHITE, 
              width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', 
              justifyContent: 'center', cursor: 'pointer', border: `2px solid ${WHITE}`
            }}>
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} disabled={uploading} />
            </label>
          </div>
          <p style={{ fontSize: 13, fontWeight: 700, color: DARK }}>點擊更換大頭貼</p>
        </section>
        
        {/* ── Basic Info Card ─────────────────────────────── */}
        <section>
          <p style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom: 12, paddingLeft: 4 }}>帳號資訊</p>
          <div style={{ background: CARD, borderRadius: RADIUS, boxShadow: SHADOW, padding: 20, display:'flex', flexDirection:'column', gap: 16 }}>
            
            <div>
              <label style={{ display:'flex', alignItems:'center', gap: 6, fontSize: 13, fontWeight: 700, color: DARK, marginBottom: 8 }}>
                <User size={14} color={BLUE} /> 真實姓名
              </label>
              <input 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="請輸入姓名"
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
                <Phone size={14} color={BLUE} /> 聯絡電話
              </label>
              <input 
                value={formData.phone || ''}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                placeholder="請輸入電話號碼"
                style={{ width:'100%', padding:'12px 16px', borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 14 }}
              />
            </div>

          </div>
        </section>

        {/* ── Preferences Card ─────────────────────────────── */}
        <section>
          <p style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom: 12, paddingLeft: 4 }}>學習與偏好</p>
          <div style={{ background: CARD, borderRadius: RADIUS, boxShadow: SHADOW, padding: 20, display:'flex', flexDirection:'column', gap: 16 }}>
            
            <div>
              <label style={{ display:'flex', alignItems:'center', gap: 6, fontSize: 13, fontWeight: 700, color: DARK, marginBottom: 8 }}>
                <MapPin size={14} color={BLUE} /> 常用地址
              </label>
              <input 
                value={formData.address || ''}
                onChange={e => setFormData({...formData, address: e.target.value})}
                placeholder="例：台北市大安區..."
                style={{ width:'100%', padding:'12px 16px', borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 14 }}
              />
            </div>

            <div>
              <label style={{ display:'flex', alignItems:'center', gap: 6, fontSize: 13, fontWeight: 700, color: DARK, marginBottom: 8 }}>
                <Languages size={14} color={BLUE} /> 偏好語言
              </label>
              <select 
                value={formData.language}
                onChange={e => setFormData({...formData, language: e.target.value})}
                style={{ width:'100%', padding:'12px 16px', borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 14, background: CARD }}
              >
                <option value="中文">中文</option>
                <option value="英文">英文 (English)</option>
                <option value="台語">台語</option>
              </select>
            </div>

            <div>
              <label style={{ display:'flex', alignItems:'center', gap: 6, fontSize: 13, fontWeight: 700, color: DARK, marginBottom: 8 }}>
                <User size={14} color={BLUE} /> 性別
              </label>
              <select 
                value={formData.gender}
                onChange={e => setFormData({...formData, gender: e.target.value})}
                style={{ width:'100%', padding:'12px 16px', borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 14, background: CARD }}
              >
                <option value="">請選擇性別</option>
                <option value="男">男</option>
                <option value="女">女</option>
                <option value="不願透露">不願透露</option>
              </select>
            </div>

            <div>
              <label style={{ display:'flex', alignItems:'center', gap: 6, fontSize: 13, fontWeight: 700, color: DARK, marginBottom: 8 }}>
                <Target size={14} color={BLUE} /> 年級
              </label>
              <select 
                value={formData.grade}
                onChange={e => setFormData({...formData, grade: e.target.value})}
                style={{ width:'100%', padding:'12px 16px', borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 14, background: CARD }}
              >
                <option value="">請選擇年級</option>
                {['國小', '國中', '高中', '大學', '成人'].map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display:'flex', alignItems:'center', gap: 6, fontSize: 13, fontWeight: 700, color: DARK, marginBottom: 8 }}>
                <Target size={14} color={BLUE} /> 學習目標
              </label>
              <textarea 
                value={formData.learning_goals || ''}
                onChange={e => setFormData({...formData, learning_goals: e.target.value})}
                placeholder="你想達成什麼目標呢？"
                rows={4}
                style={{ width:'100%', padding:'12px 16px', borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 14, lineHeight: 1.6 }}
              />
            </div>
          </div>
        </section>

        {/* ── Frequent Addresses Card (NEW) ───────────────────────── */}
        <section>
          <p style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom: 12, paddingLeft: 4 }}>常用地址管理</p>
          <div style={{ background: CARD, borderRadius: RADIUS, boxShadow: SHADOW, padding: 20, display:'flex', flexDirection:'column', gap: 16 }}>
            
            {/* List Existing */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {formData.frequent_addresses.map((item, idx) => (
                <div key={idx} style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                  padding: '10px 14px', background: '#F8FAFC', borderRadius: 12, border: '1px solid #F1F5F9' 
                }}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 800, color: BLUE, background: `${BLUE}15`, padding: '2px 8px', borderRadius: 100, marginRight: 8 }}>{item.label}</span>
                    <span style={{ fontSize: 13, color: DARK }}>{item.address}</span>
                  </div>
                  <button type="button" onClick={() => removeFrequent(idx)} style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>刪除</button>
                </div>
              ))}
            </div>

            {/* Add New */}
            <div style={{ marginTop: 8, padding: '16px', border: '1px dashed #E2E8F0', borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: DARK }}>新增地址</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <input 
                  placeholder="標籤 (如: 家)" 
                  value={newLabel} onChange={e => setNewLabel(e.target.value)}
                  style={{ width: 80, padding: '8px 12px', fontSize: 13, borderRadius: 8, border: '1px solid #E2E8F0' }}
                />
                <input 
                  placeholder="完整地址" 
                  value={newAddr} onChange={e => setNewAddr(e.target.value)}
                  style={{ flex: 1, padding: '8px 12px', fontSize: 13, borderRadius: 8, border: '1px solid #E2E8F0' }}
                />
              </div>
              <button type="button" onClick={addFrequent} style={{ 
                background: BLUE, color: WHITE, border: 'none', padding: '8px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer'
              }}>+ 加入清單</button>
            </div>
          </div>
        </section>

        {/* ── Submit Button ─────────────────────────────────── */}
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
