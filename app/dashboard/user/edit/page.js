'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { QRCodeSVG } from 'qrcode.react';
import {
  User, Mail, Phone, MapPin, Target,
  Languages, Save, ArrowLeft, Loader2, UploadCloud,
  Wallet, Ticket, QrCode, Copy, Check
} from 'lucide-react';

const ORANGE = 'var(--accent)';
const BG     = 'var(--bg-primary)';
const CARD   = 'var(--bg-card)';
const MUTED  = 'var(--text-muted)';
const TEXT_LIGHT = 'var(--text-primary)';
const RADIUS = '20px';
const SHADOW = 'var(--shadow-card)';
const INPUT_BG = 'var(--bg-input)';
const BORDER = 'var(--border)';

export default function UserProfileEdit() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', address: '', language: '中文', grade: '', gender: '', learning_goals: '', avatar_url: '', frequent_addresses: []
  });
  const [extraData, setExtraData] = useState({ coupons: [], wallet_balance: 0, promotion_code: '', level: 1, base_discount: 12 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [newLabel, setNewLabel] = useState('');
  const [newAddr, setNewAddr] = useState('');

  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [applyingCode, setApplyingCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user) router.push('/login');
      else fetchProfile();
    }
  }, [user, authLoading, router]);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/auth/profile');
      if (res.ok) {
        const data = await res.json();
        let freq = [];
        try { freq = data.profile?.frequent_addresses ? JSON.parse(data.profile.frequent_addresses) : []; } catch(e) {}
        setFormData({
          name: data.profile?.name || '', email: data.profile?.email || '', phone: data.profile?.phone || '',
          address: data.profile?.address || '', language: data.profile?.language || '中文', grade: data.profile?.grade || '',
          gender: data.profile?.gender || '', learning_goals: data.profile?.learning_goals || '', avatar_url: data.profile?.avatar_url || '',
          frequent_addresses: Array.isArray(freq) ? freq : []
        });
        setExtraData({
          coupons: Array.isArray(data.profile?.coupons) ? data.profile.coupons : [],
          wallet_balance: data.profile?.wallet_balance || 0,
          promotion_code: data.profile?.promotion_code || '',
          level: data.profile?.level || 1,
          base_discount: data.profile?.base_discount || 12
        });
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/auth/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      if (res.ok) { alert('資料已成功更新！'); router.push('/dashboard/user'); router.refresh(); } 
      else { alert('更新失敗'); }
    } catch (err) { alert('發生錯誤'); } finally { setSaving(false); }
  };

  const addFrequent = () => {
    if (!newLabel || !newAddr) return;
    setFormData(prev => ({ ...prev, frequent_addresses: [...prev.frequent_addresses, { label: newLabel, address: newAddr }] }));
    setNewLabel(''); setNewAddr('');
  };

  const removeFrequent = (idx) => {
    setFormData(prev => ({ ...prev, frequent_addresses: prev.frequent_addresses.filter((_, i) => i !== idx) }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return alert('頭像大小不得超過 2MB');
    setUploading(true);
    const formDataPayload = new FormData();
    formDataPayload.append('file', file);
    formDataPayload.append('fileType', 'avatar');
    try {
      const res = await fetch('/api/files/upload', { method: 'POST', body: formDataPayload });
      const data = await res.json();
      if (res.ok) { setFormData(prev => ({ ...prev, avatar_url: data.avatar_url })); alert('頭像已上傳'); } 
      else { alert('上傳失敗'); }
    } catch (err) { alert('錯誤'); } finally { setUploading(false); }
  };

  const handleApplyCode = async () => {
    const code = promoCodeInput.trim().toUpperCase();
    if (!code) return;
    setApplyingCode(true);
    try {
      const res = await fetch('/api/user/apply-code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
      const data = await res.json();
      if (!res.ok) alert(data.error || '套用失敗');
      else { alert('套用成功！'); setPromoCodeInput(''); fetchProfile(); }
    } catch (err) { alert('系統錯誤'); } finally { setApplyingCode(false); }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(extraData.promotion_code || '');
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (err) {}
  };

  if (authLoading || loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color: ORANGE, background: BG }}><Loader2 className="animate-spin" /></div>;

  const inputStyle = { width:'100%', padding:'12px 16px', borderRadius: 12, border: "1px solid var(--border)", fontSize: 14, background: INPUT_BG, color: TEXT_LIGHT };
  const labelStyle = { display:'flex', alignItems:'center', gap: 6, fontSize: 13, fontWeight: 700, color: TEXT_LIGHT, marginBottom: 8 };

  return (
    <div style={{ background: BG, minHeight: '100dvh', paddingBottom: 'calc(132px + env(safe-area-inset-bottom))', color: TEXT_LIGHT, overflowX: 'hidden' }}>
      <div style={{ padding: '20px 16px', background: CARD, display:'flex', alignItems:'center', gap: 12, borderBottom: "1px solid var(--border)", position:'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => router.back()} style={{ background: INPUT_BG, border:'none', borderRadius: 12, padding: 8, cursor:'pointer' }}><ArrowLeft size={20} color={TEXT_LIGHT} /></button>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: TEXT_LIGHT }}>個人設定與錢包</h1>
      </div>

      <div style={{ padding: '24px 16px', display:'flex', flexDirection:'column', gap: 32, maxWidth: '100%' }}>
        <section aria-label="Profile Hero" style={{ borderRadius: 22, padding: 16, background: 'linear-gradient(180deg, rgba(11,18,32,0.96), rgba(8,13,24,0.96))', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 8px 22px rgba(0,0,0,0.18)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: 72, height: 72, borderRadius: 24, background: INPUT_BG, overflow: 'hidden', border: `2px solid rgba(255,138,61,0.55)`, display: 'grid', placeItems: 'center' }}>
                {formData.avatar_url ? <img src={formData.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Avatar" /> : <span style={{ fontSize: 24, fontWeight: 900, color: ORANGE }}>{formData.name?.charAt(0) || 'U'}</span>}
              </div>
              <span style={{ position: 'absolute', right: -3, bottom: -3, width: 14, height: 14, borderRadius: 99, background: '#22C55E', border: `2px solid ${BG}` }} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ margin: 0, color: MUTED, fontSize: 12, fontWeight: 760 }}>Profile Hero</p>
              <h1 style={{ margin: '2px 0 5px', color: TEXT_LIGHT, fontSize: 22, fontWeight: 900, letterSpacing: '-0.03em' }}>{formData.name || 'UniCoach 學員'}</h1>
              <p style={{ margin: 0, color: MUTED, fontSize: 13, lineHeight: 1.5 }}>已加入學習社群・偏好 {formData.language || '中文'}・目前在線</p>
            </div>
          </div>
        </section>

        <section>
          <p style={{ fontSize: 11, fontWeight: 760, color: MUTED, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom: 10, paddingLeft: 4 }}>我的課程</p>
          <div style={{ borderRadius: 18, padding: 24, background: 'rgba(255,255,255,0.035)', border: '1px dashed rgba(255,255,255,0.1)', textAlign: 'center' }}>
            <p style={{ margin: 0, color: MUTED, fontSize: 14 }}>目前尚無即將到來的課程</p>
            <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>快去探索適合您的教練與課程吧！</p>
          </div>
        </section>

        <details open={false} style={{ borderRadius: 20, background: CARD, border: '1px solid rgba(255,255,255,0.05)', padding: 14 }}>
          <summary style={{ cursor: 'pointer', color: TEXT_LIGHT, fontSize: 16, fontWeight: 860, listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            帳號設定
            <span style={{ color: MUTED, fontSize: 12, fontWeight: 760 }}>展開編輯資料</span>
          </summary>
          <form onSubmit={handleSave} style={{ display:'flex', flexDirection:'column', gap: 22, marginTop: 18 }}>
          {/* Avatar Section */}
          <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ position: 'relative' }}>
              <div style={{ width: 100, height: 100, borderRadius: '50%', background: INPUT_BG, overflow: 'hidden', border: `3px solid ${ORANGE}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {formData.avatar_url ? <img src={formData.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Avatar" /> : <span style={{ fontSize: 32, fontWeight: 800, color: MUTED }}>{formData.name?.charAt(0) || 'U'}</span>}
              </div>
              <label style={{ position: 'absolute', bottom: 0, right: 0, background: ORANGE, color: TEXT_LIGHT, width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: `2px solid ${BG}` }}>
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} disabled={uploading} />
              </label>
            </div>
          </section>

          {/* Basic Info */}
          <section>
            <p style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom: 12, paddingLeft: 4 }}>帳號資訊</p>
            <div className="premium-card" style={{ display:'flex', flexDirection:'column', gap: 16 }}>
              <div><label style={labelStyle}><User size={14} color={ORANGE} /> 真實姓名</label><input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="請輸入姓名" style={inputStyle} required /></div>
              <div><label style={labelStyle}><Mail size={14} color={ORANGE} /> 電子信箱</label><input type="email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="請輸入電子信箱" style={inputStyle} required /></div>
              <div><label style={labelStyle}><Phone size={14} color={ORANGE} /> 聯絡電話</label><input value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="請輸入電話" style={inputStyle} /></div>
            </div>
          </section>

          <section>
            <p style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom: 12, paddingLeft: 4 }}>學習與偏好</p>
            <div className="premium-card" style={{ display:'flex', flexDirection:'column', gap: 16 }}>
              <div><label style={labelStyle}><MapPin size={14} color={ORANGE} /> 常用地址</label><input value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} style={inputStyle} /></div>
              <div><label style={labelStyle}><Languages size={14} color={ORANGE} /> 偏好語言</label><select value={formData.language} onChange={e => setFormData({...formData, language: e.target.value})} style={inputStyle}><option value="中文">中文</option><option value="英文">英文</option></select></div>
              <div><label style={labelStyle}><Target size={14} color={ORANGE} /> 學習目標</label><textarea value={formData.learning_goals || ''} onChange={e => setFormData({...formData, learning_goals: e.target.value})} rows={3} style={inputStyle} /></div>
            </div>
          </section>

          <button type="submit" disabled={saving} className="btn-press" style={{ width:'100%', height: 56, background: ORANGE, color: TEXT_LIGHT, border:'none', borderRadius: 16, fontSize: 16, fontWeight: 800, display:'flex', alignItems:'center', justifyContent:'center', gap: 8, opacity: saving ? 0.7 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} 儲存變更
          </button>
          </form>
        </details>
      </div>
    </div>
  );
}
