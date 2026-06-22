'use client';
import { useState, useEffect, useRef } from 'react';
import { Upload, X, Image as ImageIcon, AlertCircle, Loader2, Trash2 } from 'lucide-react';

const BLUE = 'var(--primary)';
const BG = 'var(--bg-page)';
const DARK = 'var(--text-main)';
const MUTED = 'var(--text-muted)';
const RADIUS = '20px';
const PHOTO_UPLOAD_MAX_MB = 10;

export default function PhotoUpload() {
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [limits, setLimits] = useState({ max_photos: 5 });
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchPhotos();
  }, []);

  const fetchPhotos = async () => {
    try {
      const res = await fetch('/api/photos/upload');
      if (res.ok) {
        const data = await res.json();
        let parsedPhotos = data.photos || [];
        if (typeof parsedPhotos === 'string') {
          try { parsedPhotos = JSON.parse(parsedPhotos); } catch(e) { parsedPhotos = []; }
        }
        if (!Array.isArray(parsedPhotos)) parsedPhotos = [];
        setPhotos(parsedPhotos);
        if (data.limits) setLimits(data.limits);
      }
    } catch (err) {
      console.error('Fetch photos error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > PHOTO_UPLOAD_MAX_MB * 1024 * 1024) {
      setError(`照片大小限制為 ${PHOTO_UPLOAD_MAX_MB}MB。`);
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/photos/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '照片上傳失敗');

      setPhotos([data.photo, ...photos]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
    } catch (err) {
      setError(err.message || '連線失敗，請稍後再試');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('確定要刪除這張照片嗎？')) return;
    try {
      const res = await fetch(`/api/photos/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        setPhotos(photos.filter(p => p.id !== id));
      }
    } catch (err) {
      alert('刪除失敗');
    }
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin inline-block mr-2" /> 載入中...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      
      {/* ── 上傳區 ── */}
      <section style={{ 
        background: 'var(--bg-surface)', padding: 24, borderRadius: RADIUS, 
        boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-main)' 
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: DARK, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ImageIcon size={20} color={BLUE} /> 個人照片集
          </h3>
          <div style={{ fontSize: 12, fontWeight: 700, color: photos.length >= limits.max_photos ? 'var(--color-danger)' : MUTED }}>
            已使用 {photos.length} / {limits.max_photos} 張
          </div>
        </div>

        {photos.length >= limits.max_photos ? (
          <div style={{ textAlign: 'center', padding: '20px 0', background: 'rgba(234, 88, 12, 0.05)', borderRadius: 12, border: '1px solid rgba(234, 88, 12, 0.2)' }}>
            <AlertCircle size={32} color="#EA580C" style={{ margin: '0 auto 8px' }} />
            <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#EA580C' }}>您的照片數量已達目前等級上限</p>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: MUTED }}>請先刪除舊照片，或升級教練等級以獲得更多容量。</p>
            <a href="/support?topic=expand_capacity" style={{ display: 'inline-block', padding: '8px 16px', background: '#EA580C', color: '#fff', borderRadius: 20, fontSize: 13, fontWeight: 800, textDecoration: 'none' }}>
              聯繫客服擴充容量
            </a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <input 
              type="file" 
              accept="image/jpeg,image/png,image/webp" 
              onChange={handleUpload}
              ref={fileInputRef}
              style={{ display: 'none' }}
            />
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{ 
                background: BLUE, color: '#fff', padding: '12px', borderRadius: 12, border: 'none', 
                fontWeight: 800, fontSize: 14, cursor: uploading ? 'not-allowed' : 'pointer',
                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8,
                opacity: uploading ? 0.7 : 1
              }}
            >
              {uploading ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
              {uploading ? '上傳中...' : '選擇照片並上傳'}
            </button>
            {error && <div style={{ color: 'var(--color-danger)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}><AlertCircle size={16}/> {error}</div>}
          </div>
        )}
      </section>

      {/* ── 已上傳列表 ── */}
      {photos.length > 0 && (
        <section>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 16 }}>
            {photos.map(photo => (
              <div key={photo.id} style={{ 
                background: 'var(--bg-card)', borderRadius: 16, overflow: 'hidden',
                border: '1px solid var(--border-subtle)', position: 'relative',
                aspectRatio: '1 / 1'
              }}>
                <img 
                  src={photo.url} 
                  alt="Coach photo" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <button
                  onClick={() => handleDelete(photo.id)}
                  style={{
                    position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: '#fff', 
                    border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', 
                    alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    backdropFilter: 'blur(4px)'
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
