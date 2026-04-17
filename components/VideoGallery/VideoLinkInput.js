'use client';
import { useState } from 'react';
import { Video, Plus, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function VideoLinkInput({ onVideoAdded }) {
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState('teaching');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url) return;

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/videos/video-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, category })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '新增失敗');
      }

      setMessage({ type: 'success', text: '影片已成功新增至您的列表！' });
      setUrl('');
      if (onVideoAdded) onVideoAdded(data.video);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-video-container">
      <div className="input-box">
        <div className="icon-side">
          {url.includes('vimeo') ? (
            <div className="p-2 bg-blue-500/10 rounded-lg"><Video size={20} className="text-blue-400" /></div>
          ) : (
            <div className="p-2 bg-red-600/10 rounded-lg"><Video size={20} className="text-red-500" /></div>
          )}
        </div>
        
        <form onSubmit={handleSubmit} className="form-content">
          <input 
            type="text" 
            placeholder="貼上 YouTube 或 Vimeo 連結..." 
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading}
            className="url-input"
          />
          
          <div className="form-row">
            <select 
              value={category} 
              onChange={(e) => setCategory(e.target.value)}
              className="category-select"
            >
              <option value="teaching">教學課程</option>
              <option value="introduction">自我介紹</option>
              <option value="testimonial">學生見證</option>
              <option value="highlight">精華剪輯</option>
            </select>
            
            <button type="submit" disabled={loading || !url} className="submit-btn-v2">
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
              <span>{loading ? '處理中...' : '新增影片'}</span>
            </button>
          </div>
        </form>
      </div>

      {message && (
        <div className={`message-banner ${message.type}`}>
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      <style jsx>{`
        .add-video-container {
          background: rgba(255, 255, 255, 0.02);
          border: 1px dashed rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 24px;
          margin-bottom: 32px;
        }
        .input-box {
          display: flex;
          gap: 16px;
        }
        .form-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .url-input {
          width: 100%;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #fff;
          padding: 12px 16px;
          border-radius: 12px;
          outline: none;
          transition: border-color 0.2s;
        }
        .url-input:focus {
          border-color: #4cc9f0;
        }
        .form-row {
          display: flex;
          gap: 12px;
        }
        .category-select {
          flex: 1;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #fff;
          padding: 10px 14px;
          border-radius: 10px;
          outline: none;
        }
        .submit-btn-v2 {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #2563EB;
          color: #FFFFFF;
          border: none;
          padding: 0 24px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .submit-btn-v2:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .submit-btn-v2:not(:disabled):hover {
          background: #3fb0d4;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(76, 201, 240, 0.3);
        }
        .message-banner {
          margin-top: 16px;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .message-banner.success {
          background: rgba(6, 214, 160, 0.1);
          color: #06d6a0;
          border: 1px solid rgba(6, 214, 160, 0.2);
        }
        .message-banner.error {
          background: rgba(255, 59, 92, 0.1);
          color: #ff3b5c;
          border: 1px solid rgba(255, 59, 92, 0.2);
        }
      `}</style>
    </div>
  );
}
