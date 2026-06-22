'use client';
import { useState, useEffect } from 'react';
import { Upload, X, Film, CheckCircle, AlertCircle, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const BLUE = 'var(--primary)';
const BG = 'var(--bg-page)';
const DARK = 'var(--text-main)';
const MUTED = 'var(--text-muted)';
const RADIUS = '20px';
const VIDEO_UPLOAD_MAX_MB = 500;
const VIDEO_UPLOAD_MAX_BYTES = VIDEO_UPLOAD_MAX_MB * 1024 * 1024;

const CATEGORIES = [
  { id: 'teaching', label: '教學示範' },
  { id: 'intro', label: '自我介紹' },
  { id: 'highlight', label: '精華片段' }
];

export default function VideoUpload() {
  const [videos, setVideos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [limits, setLimits] = useState({ max_videos: 3 });
  
  const [newVideo, setNewVideo] = useState({
    file: null,
    title: '',
    category: 'teaching'
  });

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const res = await fetch('/api/videos/upload');
      if (res.ok) {
        const data = await res.json();
        setVideos(data.videos || []);
        if (data.limits) setLimits(data.limits);
      }
    } catch (err) {
      console.error('Fetch videos error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!newVideo.file) return;

    // Direct Supabase upload bypasses server body limits, but we still cap file size for stability.
    if (newVideo.file.size > VIDEO_UPLOAD_MAX_BYTES) {
      setError(`單檔上限為 ${VIDEO_UPLOAD_MAX_MB}MB，請壓縮影片或截取精華片段。`);
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // 1. Get presigned URL
      const preRes = await fetch('/api/videos/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: newVideo.file.name,
          contentType: newVideo.file.type || 'video/mp4'
        })
      });
      const preData = await preRes.json();
      if (!preRes.ok) throw new Error(preData.error || '無法取得上傳憑證');

      // 2. Upload file directly to Supabase Storage using the signed upload token
      const { error: uploadError } = await supabase.storage
        .from('coach-videos')
        .uploadToSignedUrl(preData.path, preData.token, newVideo.file, {
          cacheControl: '3600',
          upsert: false,
          contentType: newVideo.file.type || 'video/mp4',
        });

      if (uploadError) {
        throw new Error(uploadError.message || '影片上傳至儲存空間失敗');
      }

      // 3. Save metadata
      const metaRes = await fetch('/api/videos/save-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newVideo.title,
          category: newVideo.category,
          path: preData.path,
          publicUrl: preData.publicUrl
        })
      });

      const metaData = await metaRes.json();
      if (!metaRes.ok) throw new Error(metaData.error || '儲存影片資料失敗');

      setVideos([metaData.video, ...videos]);
      setNewVideo({ file: null, title: '', category: 'teaching' });
      alert('影片上傳成功！');

    } catch (err) {
      setError(err.message || '連線失敗，請稍後再試');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('確定要刪除此影片嗎？')) return;
    try {
      const res = await fetch(`/api/videos/upload?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setVideos(videos.filter(v => v.id !== id));
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
            <Upload size={20} color={BLUE} /> 上傳新影片
          </h3>
          <div style={{ fontSize: 12, fontWeight: 700, color: videos.length >= limits.max_videos ? 'var(--color-danger)' : MUTED }}>
            已使用 {videos.length} / {limits.max_videos} 支
          </div>
        </div>

        {videos.length >= limits.max_videos ? (
          <div style={{ textAlign: 'center', padding: '20px 0', background: 'rgba(234, 88, 12, 0.05)', borderRadius: 12, border: '1px solid rgba(234, 88, 12, 0.2)' }}>
            <AlertCircle size={32} color="#EA580C" style={{ margin: '0 auto 8px' }} />
            <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#EA580C' }}>您的影片數量已達目前等級上限</p>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: MUTED }}>請先刪除舊影片，或升級教練等級以獲得更多容量。</p>
            <a href="/support?topic=expand_capacity" style={{ display: 'inline-block', padding: '8px 16px', background: '#EA580C', color: '#fff', borderRadius: 20, fontSize: 13, fontWeight: 800, textDecoration: 'none' }}>
              聯繫客服擴充容量
            </a>
          </div>
        ) : (
          <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: MUTED, marginBottom: 4, display: 'block' }}>影片標題</label>
              <input 
                type="text" 
                placeholder="例如：反手抽球教學"
                value={newVideo.title}
                onChange={e => setNewVideo({...newVideo, title: e.target.value})}
                required
                style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1px solid var(--border-input)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: 14 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: MUTED, marginBottom: 4, display: 'block' }}>分類</label>
              <select 
                value={newVideo.category}
                onChange={e => setNewVideo({...newVideo, category: e.target.value})}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1px solid var(--border-input)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: 14 }}
              >
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
          </div>

          <div 
            onClick={() => document.getElementById('video-input').click()}
            style={{ 
              border: '2px dashed var(--border-active)', borderRadius: 16, padding: '32px 16px', 
              textAlign: 'center', cursor: 'pointer', background: 'var(--bg-input)',
              transition: 'border-color 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.borderColor = BLUE}
            onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border-active)'}
          >
            <input 
              id="video-input" type="file" accept="video/mp4,video/webm,video/quicktime" 
              hidden 
              onChange={e => setNewVideo({...newVideo, file: e.target.files[0]})}
            />
            {newVideo.file ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Film size={24} color={BLUE} />
                <span style={{ fontSize: 14, fontWeight: 600, color: DARK }}>{newVideo.file.name} ({(newVideo.file.size / 1024 / 1024).toFixed(1)}MB)</span>
                <X size={16} color="var(--error)" onClick={(e) => { e.stopPropagation(); setNewVideo({...newVideo, file: null}); }} />
              </div>
            ) : (
              <div>
                <Film size={32} color={MUTED} style={{ marginBottom: 8 }} />
                <p style={{ margin: 0, fontSize: 14, color: MUTED }}>點擊或拖放影片檔案 (MP4 / MOV / WEBM)</p>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: MUTED }}>使用直傳儲存空間，單檔上限 {VIDEO_UPLOAD_MAX_MB}MB</p>
              </div>
            )}
          </div>

          {error && <p style={{ margin: 0, fontSize: 13, color: 'var(--error)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <AlertCircle size={14} /> {error}
          </p>}

          <button 
            type="submit" 
            disabled={uploading || !newVideo.file || videos.length >= limits.max_videos}
            style={{ 
              background: BLUE, color: '#fff', padding: '12px', borderRadius: 12, border: 'none', 
              fontWeight: 800, fontSize: 14, cursor: (uploading || !newVideo.file || videos.length >= limits.max_videos) ? 'not-allowed' : 'pointer',
              display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8,
              opacity: (uploading || !newVideo.file || videos.length >= limits.max_videos) ? 0.7 : 1
            }}
          >
            {uploading ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
            {videos.length >= limits.max_videos ? '數量已達上限' : '開始上傳'}
          </button>
        </form>
        )}
      </section>

      {/* ── 已上傳列表 ── */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: DARK }}>我的影片庫 ({videos.length}/10)</h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          {videos.map(video => (
            <div key={video.id} style={{ 
              background: 'var(--bg-surface)', borderRadius: 16, overflow: 'hidden', 
              boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-main)' 
            }}>
              <video 
                src={video.video_url} 
                controls
                preload="metadata"
                style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', background: 'var(--color-text)' }}
              />
              <div style={{ padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: DARK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {video.title}
                  </p>
                  <button onClick={() => handleDelete(video.id)} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <span style={{ fontSize: 10, background: 'var(--primary-bg)', color: BLUE, padding: '2px 8px', borderRadius: 100, fontWeight: 600 }}>
                    {CATEGORIES.find(c => c.id === video.category)?.label || video.category}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {videos.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px 0', background: 'var(--bg-surface)', borderRadius: 16, border: '1px dashed var(--border-main)', color: MUTED }}>
              <Film size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
              <p style={{ margin: 0, fontSize: 14 }}>尚未上傳任何影片</p>
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
