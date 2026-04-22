'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Heart, Share2, Calendar, User, ChevronLeft, Loader2, Volume2, VolumeX } from 'lucide-react';

function formatCount(value) {
  const count = Number(value || 0);
  if (count >= 10000) return `${(count / 10000).toFixed(1)}萬`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return String(count);
}

function VideoItem({ video, isVisible, onLike, onShare, onView }) {
  const router = useRouter();
  const videoRef = useRef(null);
  const viewedRef = useRef(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    if (!videoRef.current) return;
    
    if (isVisible) {
      videoRef.current.play().catch(() => {});
      if (!viewedRef.current) {
        viewedRef.current = true;
        onView(video.id);
      }
    } else {
      videoRef.current.pause();
    }
  }, [isVisible, onView, video.id]);

  return (
    <div style={{
      position: 'relative',
      height: '100vh',
      width: '100vw',
      scrollSnapAlign: 'start',
      backgroundColor: '#000',
      overflow: 'hidden'
    }}>
      {/* Back button */}
      <div style={{ position: 'absolute', top: 20, left: 16, zIndex: 20 }}>
        <button 
          onClick={() => router.back()} 
          style={{ background: 'rgba(0,0,0,0.3)', border: 'none', borderRadius: '50%', width: 40, height: 40, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(4px)' }}
        >
          <ChevronLeft size={24} />
        </button>
      </div>

      <video
        ref={videoRef}
        src={video.video_url}
        loop
        playsInline
        muted={muted}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover'
        }}
      />

      <button
        onClick={() => setMuted((current) => !current)}
        style={{
          position: 'absolute',
          top: 20,
          right: 16,
          zIndex: 20,
          background: 'rgba(0,0,0,0.3)',
          border: 'none',
          borderRadius: '50%',
          width: 40,
          height: 40,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          backdropFilter: 'blur(4px)'
        }}
      >
        {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
      </button>

      {/* Right Action Bar */}
      <div style={{
        position: 'absolute',
        right: 16,
        bottom: 120,
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        alignItems: 'center',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div 
            onClick={() => router.push(`/coaches/${video.coach_id}`)}
            style={{ 
              width: 48, height: 48, borderRadius: '50%', backgroundColor: '#333', 
              border: '2px solid white', overflow: 'hidden', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
            }}
          >
            {video.coach_avatar ? (
              <img src={video.coach_avatar} alt={video.coach_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <User size={24} />
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <button
            onClick={() => onLike(video.id)}
            style={{ background: 'none', border: 'none', color: video.liked ? '#EF4444' : 'white', cursor: 'pointer', padding: 8 }}
          >
            <Heart size={32} fill={video.liked ? '#EF4444' : 'none'} />
          </button>
          <span style={{ color: 'white', fontSize: 12, fontWeight: 700 }}>{formatCount(video.like_count)}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <button
            onClick={() => onShare(video)}
            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 8 }}
          >
            <Share2 size={32} />
          </button>
          <span style={{ color: 'white', fontSize: 12, fontWeight: 700 }}>{formatCount(video.share_count)}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: 'white' }}>
          <Eye size={28} />
          <span style={{ color: 'white', fontSize: 12, fontWeight: 700 }}>{formatCount(video.view_count)}</span>
        </div>
      </div>

      {/* Bottom Info & CTA */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '40px 16px 24px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)',
        zIndex: 10,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end'
      }}>
        <div style={{ flex: 1, paddingRight: 16 }}>
          <h2 style={{ margin: '0 0 8px', color: 'white', fontSize: 18, fontWeight: 800, textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
            @{video.coach_name}
          </h2>
          <p style={{ margin: '0 0 12px', color: 'white', fontSize: 14, lineHeight: 1.5, opacity: 0.9, textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
            {video.title}
          </p>
          <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)', padding: '4px 10px', borderRadius: 6, color: 'white', fontSize: 12, fontWeight: 700 }}>
            {video.category === 'teaching' ? '🎓 教學精華' : video.category === 'highlight' ? '🔥 精彩剪輯' : '👋 自我介紹'}
          </div>
        </div>

        <button 
          onClick={() => router.push(`/coaches/${video.coach_id}`)}
          style={{
            background: 'linear-gradient(135deg, #EF4444, #B91C1C)',
            color: 'white', border: 'none', padding: '14px 20px', borderRadius: 16,
            fontWeight: 900, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: '0 8px 24px rgba(239, 68, 68, 0.4)',
            animation: 'pulse 2s infinite'
          }}
        >
          <Calendar size={18} />
          預約他
        </button>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
      `}} />
    </div>
  );
}

export default function VideoFeed() {
  const [videos, setVideos] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    fetch('/api/videos/feed')
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '載入影音失敗');
        return data;
      })
      .then(data => {
        if (data.videos) setVideos(data.videos);
      })
      .catch(err => setError(err.message || '載入影音失敗'))
      .finally(() => setLoading(false));
  }, []);

  async function updateInteraction(videoId, action) {
    const response = await fetch('/api/videos/interact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId, action }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || '互動失敗');
    }
    return payload;
  }

  async function handleLike(videoId) {
    try {
      const payload = await updateInteraction(videoId, 'like');
      setVideos((current) => current.map((video) => (
        video.id === videoId
          ? { ...video, liked: payload.liked, like_count: payload.like_count }
          : video
      )));
    } catch (err) {
      alert(err.message || '請先登入後再按讚');
    }
  }

  async function handleShare(video) {
    const shareUrl = `${window.location.origin}/coaches/${video.coach_id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: video.title,
          text: `看看 ${video.coach_name} 的教學影片`,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        alert('連結已複製');
      }

      const payload = await updateInteraction(video.id, 'share');
      setVideos((current) => current.map((item) => (
        item.id === video.id ? { ...item, share_count: payload.share_count } : item
      )));
    } catch (err) {
      if (err.name !== 'AbortError') {
        alert(err.message || '分享失敗');
      }
    }
  }

  async function handleView(videoId) {
    try {
      const payload = await updateInteraction(videoId, 'view');
      setVideos((current) => current.map((video) => (
        video.id === videoId ? { ...video, view_count: payload.view_count } : video
      )));
    } catch {
      // View count is non-critical.
    }
  }

  const handleScroll = () => {
    if (!containerRef.current) return;
    const scrollPosition = containerRef.current.scrollTop;
    const windowHeight = window.innerHeight;
    const index = Math.round(scrollPosition / windowHeight);
    if (index !== currentIndex) {
      setCurrentIndex(index);
    }
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', color: 'white' }}>
        <Loader2 className="animate-spin" size={28} />
      </div>
    );
  }

  if (error || videos.length === 0) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', justifyContent: 'center', background: '#000', color: 'white', padding: 24, textAlign: 'center' }}>
        <p style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>{error ? '影音載入失敗' : '目前還沒有教練影片'}</p>
        <p style={{ color: 'rgba(255,255,255,0.68)', margin: 0, fontSize: 14 }}>{error || '等教練上傳影片後，這裡會出現探索內容。'}</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        height: '100vh',
        width: '100vw',
        overflowY: 'scroll',
        scrollSnapType: 'y mandatory',
        background: '#000',
        msOverflowStyle: 'none', /* IE and Edge */
        scrollbarWidth: 'none', /* Firefox */
      }}
    >
      <style dangerouslySetInnerHTML={{__html: `
        /* Hide scrollbar for Chrome, Safari and Opera */
        div::-webkit-scrollbar {
          display: none;
        }
      `}} />
      
      {videos.map((video, index) => (
        <VideoItem 
          key={video.id} 
          video={video} 
          isVisible={index === currentIndex} 
          onLike={handleLike}
          onShare={handleShare}
          onView={handleView}
        />
      ))}
    </div>
  );
}
