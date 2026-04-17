'use client';
import { Play, Trash2, ExternalLink, ShieldAlert, Star } from 'lucide-react';

export default function VideoCard({ video, onDelete }) {
  const isYoutube = video.platform === 'youtube';
  const isPrivate = video.is_private;

  // YouTube Fallback: if high res thumbnail fails, use standard
  const displayThumbnail = video.thumbnail_url || (isYoutube ? `https://img.youtube.com/vi/${video.video_id}/hqdefault.jpg` : null);

  return (
    <div className="video-card-v2 group">
      {/* Thumbnail Container */}
      <div className="thumbnail-wrapper">
        {displayThumbnail ? (
          <img src={displayThumbnail} alt={video.title} className="thumbnail-img" />
        ) : (
          <div className="thumbnail-fallback">
             <ShieldAlert size={48} className="opacity-20" />
             <span className="text-xs mt-2 opacity-50">私人或不支援的影片</span>
          </div>
        )}
        
        {/* Overlays */}
        <div className="thumbnail-overlay">
           <button 
             onClick={() => window.open(video.original_url, '_blank')}
             className="play-button-v2"
           >
             <Play fill="white" size={24} />
           </button>
        </div>

        {/* Badge: Category */}
        <div className="category-badge">
          {video.category === 'teaching' ? '教學' : 
           video.category === 'introduction' ? '自我介紹' :
           video.category === 'testimonial' ? '評價' : '精華'}
        </div>

        {/* Badge: Platform */}
        <div className={`platform-badge ${isYoutube ? 'bg-red-600' : 'bg-blue-500'}`}>
          {isYoutube ? 'YouTube' : 'Vimeo'}
        </div>

        {/* Duration */}
        {video.duration_formatted && (
          <div className="duration-tag">{video.duration_formatted}</div>
        )}

        {/* Featured Star */}
        {video.is_featured && (
          <div className="featured-star">
            <Star size={14} fill="#ffd166" color="#ffd166" />
          </div>
        )}
      </div>

      {/* Info Content */}
      <div className="video-info">
        <h3 className="video-title-v2">{video.title || '未命名影片'}</h3>
        
        <div className="video-actions-v2">
          <button onClick={() => onDelete(video.id)} className="action-btn-v2 delete">
            <Trash2 size={16} />
            <span>移除</span>
          </button>
          <a href={video.original_url} target="_blank" rel="noopener noreferrer" className="action-btn-v2 link">
            <ExternalLink size={16} />
            <span>原片</span>
          </a>
        </div>
      </div>

      <style jsx>{`
        .video-card-v2 {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }
        .video-card-v2:hover {
          transform: translateY(-4px);
          border-color: rgba(76, 201, 240, 0.3);
          box-shadow: 0 12px 24px -8px rgba(0, 0, 0, 0.5);
        }
        .thumbnail-wrapper {
          position: relative;
          aspect-ratio: 16 / 9;
          background: #000;
          overflow: hidden;
        }
        .thumbnail-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.5s ease;
        }
        .video-card-v2:hover .thumbnail-img {
          transform: scale(1.05);
        }
        .thumbnail-fallback {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #1a1a24;
          color: #44445a;
        }
        .thumbnail-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.3s;
        }
        .video-card-v2:hover .thumbnail-overlay {
          opacity: 1;
        }
        .play-button-v2 {
          width: 56px;
          height: 56px;
          background: #4cc9f0;
          border: none;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.2s;
          box-shadow: 0 0 20px rgba(76, 201, 240, 0.4);
        }
        .play-button-v2:hover {
          transform: scale(1.15);
        }
        .category-badge {
          position: absolute;
          top: 12px;
          left: 12px;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(8px);
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 6px;
        }
        .platform-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          color: #fff;
          font-size: 10px;
          font-weight: 800;
          padding: 4px 8px;
          border-radius: 4px;
          text-transform: uppercase;
        }
        .duration-tag {
          position: absolute;
          bottom: 12px;
          right: 12px;
          background: rgba(0, 0, 0, 0.8);
          color: #fff;
          font-size: 11px;
          font-family: monospace;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .featured-star {
          position: absolute;
          bottom: 12px;
          left: 12px;
          background: rgba(255, 209, 102, 0.2);
          border: 1px solid rgba(255, 209, 102, 0.4);
          padding: 4px;
          border-radius: 50%;
        }
        .video-info {
          padding: 16px;
        }
        .video-title-v2 {
          font-size: 14px;
          font-weight: 700;
          color: #e8e8f0;
          margin-bottom: 12px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .video-actions-v2 {
          display: flex;
          gap: 8px;
        }
        .action-btn-v2 {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          padding: 8px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid transparent;
        }
        .action-btn-v2.delete {
          background: rgba(255, 59, 92, 0.1);
          color: #ff3b5c;
        }
        .action-btn-v2.delete:hover {
          background: #ff3b5c;
          color: #fff;
        }
        .action-btn-v2.link {
          background: rgba(255, 255, 255, 0.05);
          color: #888899;
        }
        .action-btn-v2.link:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }
      `}</style>
    </div>
  );
}
