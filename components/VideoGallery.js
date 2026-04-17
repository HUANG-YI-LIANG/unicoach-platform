'use client';
import { useState } from 'react';
import { Play, Film, Clock, User } from 'lucide-react';

const BLUE = '#2563EB';
const DARK = '#0F172A';
const MUTED = '#94A3B8';
const CARD = '#FFFFFF';
const RADIUS = '24px';
const SHADOW = '0 10px 30px rgba(0,0,0,0.08)';

const CATEGORY_MAP = {
  teaching: '教學示範',
  intro: '自我介紹',
  highlight: '精華片段'
};

export default function VideoGallery({ videos = [] }) {
  const [activeVideo, setActiveVideo] = useState(null);

  if (!videos || videos.length === 0) {
    return (
      <div style={{ 
        padding: '60px 20px', textAlign: 'center', background: '#F8FAFC', 
        borderRadius: RADIUS, border: '1px dashed #E2E8F0' 
      }}>
        <Film size={40} color={MUTED} style={{ opacity: 0.4, marginBottom: 12 }} />
        <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: MUTED }}>教練尚未上傳任何影片</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      
      {/* ── Active Video Player ── */}
      {activeVideo && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
          background: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', 
          alignItems: 'center', justifyContent: 'center', padding: 20
        }} onClick={() => setActiveVideo(null)}>
          <div style={{ maxWidth: 800, width: '100%', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <video 
              src={activeVideo.video_url} 
              controls 
              autoPlay
              style={{ width: '100%', borderRadius: 16, boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}
            />
            <div style={{ marginTop: 16, color: '#fff' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800 }}>{activeVideo.title}</h3>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
                {CATEGORY_MAP[activeVideo.category] || activeVideo.category}
              </span>
            </div>
            <button 
              onClick={() => setActiveVideo(null)}
              style={{ 
                position: 'absolute', top: -40, right: 0, background: 'none', 
                border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer' 
              }}
            >✕</button>
          </div>
        </div>
      )}

      {/* ── Video Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
        {videos.map(video => (
          <div 
            key={video.id} 
            onClick={() => setActiveVideo(video)}
            style={{ 
              background: CARD, borderRadius: RADIUS, overflow: 'hidden', boxShadow: SHADOW, 
              cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s',
              border: '1px solid rgba(0,0,0,0.03)'
            }}
            onMouseOver={e => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 15px 40px rgba(0,0,0,0.12)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = SHADOW;
            }}
          >
            {/* Thumbnail Placeholder with Play Icon */}
            <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#000' }}>
              <video 
                src={video.video_url} 
                style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }}
                muted
                onMouseOver={e => e.currentTarget.play()}
                onMouseOut={e => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
              />
              <div style={{ 
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                width: 54, height: 54, borderRadius: '50%', background: 'rgba(37,99,235,0.9)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                boxShadow: '0 4px 15px rgba(37,99,235,0.4)', pointerEvents: 'none'
              }}>
                <Play size={24} fill="#fff" />
              </div>
              <div style={{ 
                position: 'absolute', top: 12, left: 12, padding: '4px 12px', 
                borderRadius: 100, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
                color: '#fff', fontSize: 11, fontWeight: 700
              }}>
                {CATEGORY_MAP[video.category] || video.category}
              </div>
            </div>

            <div style={{ padding: 20 }}>
              <h4 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 800, color: DARK }}>{video.title}</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: MUTED, fontSize: 12 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={14} /> {new Date(video.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
