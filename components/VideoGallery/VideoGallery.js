'use client';
import { useState, useEffect } from 'react';
import VideoLinkInput from './VideoLinkInput';
import VideoCard from './VideoCard';
import { Video, Info, Loader2 } from 'lucide-react';

export default function VideoGallery({ userId, isOwner = false }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/videos/video-link?userId=${userId}`);
      const data = await res.json();
      setVideos(data.videos || []);
    } catch (err) {
      console.error('Failed to fetch videos', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) fetchVideos();
  }, [userId]);

  const handleDelete = async (videoId) => {
    if (!confirm('確定要移除這支影片嗎？')) return;
    try {
      const res = await fetch('/api/videos/video-link', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: videoId })
      });
      if (res.ok) {
        setVideos(v => v.filter(v => v.id !== videoId));
      }
    } catch (err) {
      alert('刪除失敗');
    }
  };

  const filteredVideos = activeTab === 'all' 
    ? videos 
    : videos.filter(v => v.category === activeTab);

  if (loading) return (
    <div className="flex justify-center p-20 opacity-50">
      <Loader2 className="animate-spin" size={32} />
    </div>
  );

  return (
    <div className="video-system-container">
      {/* 1. Header & Limit Info */}
      <div className="system-header">
        <div className="title-group">
          <Video className="text-blue-400" size={24} />
          <h2 className="text-xl font-bold">精選影片庫</h2>
        </div>
        <div className="limit-info">
          已使用 {videos.length} / 10 支影片
        </div>
      </div>

      {/* 2. Management: Add Video (Only for Owners) */}
      {isOwner && (
        <VideoLinkInput onVideoAdded={(newVideo) => setVideos([newVideo, ...videos])} />
      )}

      {/* 3. Filters */}
      <div className="filter-tabs">
        {['all', 'teaching', 'introduction', 'testimonial', 'highlight'].map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)}
            className={`filter-tab ${activeTab === tab ? 'active' : ''}`}
          >
            {tab === 'all' ? '全部' : 
             tab === 'teaching' ? '教學' : 
             tab === 'introduction' ? '自我介紹' :
             tab === 'testimonial' ? '評價' : '精華'}
          </button>
        ))}
      </div>

      {/* 4. Video Grid */}
      {filteredVideos.length === 0 ? (
        <div className="empty-state">
           <Info size={40} className="opacity-20 mb-4" />
           <p className="text-gray-500">尚無影片內容</p>
           {isOwner && <p className="text-xs text-gray-600 mt-2">點擊上方「新增影片」開始建立您的展示庫</p>}
        </div>
      ) : (
        <div className="video-grid">
          {filteredVideos.map(video => (
            <VideoCard key={video.id} video={video} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <style jsx>{`
        .video-system-container {
          padding-bottom: 40px;
        }
        .system-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .title-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .limit-info {
          font-size: 11px;
          background: rgba(255, 255, 255, 0.05);
          color: #888899;
          padding: 4px 12px;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          font-family: monospace;
        }
        .filter-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          overflow-x: auto;
          padding-bottom: 8px;
          -webkit-mask-image: linear-gradient(to right, black 85%, transparent 100%);
          mask-image: linear-gradient(to right, black 85%, transparent 100%);
          scrollbar-width: none;
        }
        .filter-tabs::-webkit-scrollbar {
          display: none;
        }
        .filter-tab {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #888899;
          padding: 6px 16px;
          border-radius: 100px;
          font-size: 13px;
          white-space: nowrap;
          cursor: pointer;
          transition: all 0.2s;
        }
        .filter-tab:hover {
          border-color: rgba(255, 255, 255, 0.3);
          color: #fff;
        }
        .filter-tab.active {
          background: #4cc9f0;
          border-color: #4cc9f0;
          color: #000;
          font-weight: 700;
        }
        .video-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }
        .empty-state {
          min-height: 200px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.01);
          border: 1px dashed rgba(255, 255, 255, 0.05);
          border-radius: 20px;
        }
      `}</style>
    </div>
  );
}
