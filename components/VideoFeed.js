'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, Heart, Share2, Calendar, User, ChevronLeft, Loader2, Volume2, VolumeX, X } from 'lucide-react';

function formatCount(value) {
  const count = Number(value || 0);
  if (count >= 10000) return `${(count / 10000).toFixed(1)}萬`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return String(count);
}

function isPotentiallyUnsupportedVideoUrl(url = '') {
  return /\.(mov|qt)(\?|#|$)/i.test(String(url)) || /quicktime/i.test(String(url));
}

function VideoItem({ video, isVisible, onLike, onView }) {
  const router = useRouter();
  const videoRef = useRef(null);
  const viewedRef = useRef(false);
  const [muted, setMuted] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [showPopCta, setShowPopCta] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const unsupportedVideoUrl = isPotentiallyUnsupportedVideoUrl(video.video_url);

  useEffect(() => {
    setVideoError(false);
    viewedRef.current = false;
  }, [video.id]);

  useEffect(() => {
    if (!videoRef.current || videoError) return;
    
    if (isVisible) {
      videoRef.current.play().catch(() => {});
      if (!viewedRef.current) {
        viewedRef.current = true;
        onView(video.id);
      }
    } else {
      videoRef.current.pause();
      // Reset states when scrolled away
      setShowToast(false);
      setShowPopCta(false);
    }
  }, [isVisible, onView, video.id, videoError]);

  function handleVideoError() {
    setVideoError(true);
    if (videoRef.current) {
      videoRef.current.pause();
    }
  }

  // Handle Toast logic when liked
  useEffect(() => {
    if (video.liked && isVisible && !showPopCta && !showToast) {
      setShowToast(true);
      const timer = setTimeout(() => {
        setShowToast(false);
        setShowPopCta(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [video.liked, isVisible]);

  return (
    <div style={{
      position: 'relative',
      height: '100%',
      width: '100%',
      scrollSnapAlign: 'start',
      backgroundColor: 'var(--color-bg)',
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
        onError={handleVideoError}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover'
        }}
      />

      {videoError && (
        <div
          role="alert"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 15,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            padding: 24,
            textAlign: 'center',
            background: 'linear-gradient(180deg, rgba(2, 6, 23, 0.92), rgba(15, 23, 42, 0.96))',
            color: '#FFFFFF'
          }}
        >
          <div style={{ fontSize: 42 }}>🎬</div>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>影片無法播放</h3>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6 }}>
            {unsupportedVideoUrl
              ? '此影片格式可能不支援瀏覽器播放，MOV / QuickTime 請先轉成 MP4 後再上傳。'
              : '此影片暫時載入失敗，請稍後再試或查看教練資料。'}
          </p>
          <button
            onClick={() => router.push(`/coaches/${video.coach_id}`)}
            style={{
              marginTop: 8,
              background: 'var(--primary)',
              color: 'white',
              border: 'none',
              padding: '12px 22px',
              borderRadius: 100,
              fontWeight: 900,
              fontSize: 14,
              cursor: 'pointer'
            }}
          >
            查看教練資料
          </button>
        </div>
      )}

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

      {/* Toast Notification */}
      {showToast && (
        <div style={{
          position: 'absolute',
          top: '120px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(15, 23, 42, 0.9)',
          backdropFilter: 'blur(8px)',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '100px',
          fontSize: '15px',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          zIndex: 30,
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          animation: 'slideUpFade 0.3s ease-out forwards'
        }}>
          很多人也喜歡這位教練 👍
        </div>
      )}

      {/* Floating CTA (Triggered after 2s of liking) */}
      {showPopCta && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 40,
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(10px)',
          padding: '24px',
          borderRadius: '24px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
          width: '80%',
          maxWidth: '320px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <button
            onClick={() => setShowPopCta(false)}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
          
          <div style={{ fontSize: '48px', marginTop: '12px' }}>🔥</div>
          <h3 style={{ margin: 0, color: '#FFFFFF', fontSize: '20px', fontWeight: '900', textAlign: 'center' }}>
            這位教練非常搶手！
          </h3>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center' }}>
            趕快查看他的詳細資料與可預約時段
          </p>
          <button 
            onClick={() => router.push(`/coaches/${video.coach_id}`)}
            style={{
              width: '100%',
              background: 'var(--primary)',
              color: 'white',
              border: 'none',
              padding: '16px',
              borderRadius: '100px',
              fontWeight: '900',
              fontSize: '16px',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-md)',
              marginTop: '8px'
            }}
          >
            👉 立即預約
          </button>
        </div>
      )}

      {/* Right Action Bar */}
      <div style={{
        position: 'absolute',
        right: 16,
        bottom: 160,
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        alignItems: 'center',
        zIndex: 20
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div 
            onClick={() => router.push(`/coaches/${video.coach_id}`)}
            style={{ 
              width: 48, height: 48, borderRadius: '50%', backgroundColor: 'var(--color-surface)', 
              border: '2px solid white', overflow: 'hidden', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
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
            onClick={() => {
              if (!video.liked) {
                // Trigger animation
                const btn = document.getElementById(`like-btn-${video.id}`);
                if (btn) {
                  btn.style.animation = 'none';
                  void btn.offsetWidth; // trigger reflow
                  btn.style.animation = 'bounce 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                }
              }
              onLike(video.id);
            }}
            id={`like-btn-${video.id}`}
            style={{ 
              background: 'rgba(0,0,0,0.2)', 
              backdropFilter: 'blur(8px)',
              border: 'none', 
              color: video.liked ? '#EF4444' : 'white', 
              cursor: 'pointer', 
              padding: '12px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Heart size={28} fill={video.liked ? '#EF4444' : 'rgba(0,0,0,0.5)'} strokeWidth={video.liked ? 0 : 2} />
          </button>
          {video.like_count >= 5 && (
            <span style={{ color: 'white', fontSize: 13, fontWeight: 800, textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
              {formatCount(video.like_count)}
            </span>
          )}
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
          <h2 
            onClick={() => router.push(`/coaches/${video.coach_id}`)}
            style={{ margin: '0 0 8px', color: 'white', fontSize: 18, fontWeight: 800, textShadow: '0 1px 3px rgba(0,0,0,0.8)', cursor: 'pointer', display: 'inline-block' }}
          >
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
            background: 'var(--color-primary)',
            color: 'white', border: 'none', padding: '14px 20px', borderRadius: '100px',
            fontWeight: 900, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: '0 8px 24px rgba(245, 158, 11, 0.4)',
            zIndex: 10
          }}
        >
          預約這位教練
        </button>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes bounce {
          0% { transform: scale(1); }
          50% { transform: scale(1.4); }
          100% { transform: scale(1); }
        }
        @keyframes slideUpFade {
          0% { opacity: 0; transform: translate(-50%, 20px); }
          100% { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes popIn {
          0% { opacity: 0; transform: translate(-50%, -40%); }
          100% { opacity: 1; transform: translate(-50%, -50%); }
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
  const [seenIndices, setSeenIndices] = useState(new Set([0]));
  const [showConversion, setShowConversion] = useState(false);
  const [showAntiAddiction, setShowAntiAddiction] = useState(false);
  const containerRef = useRef(null);
  const router = useRouter();

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
      
      setSeenIndices(prev => {
        const next = new Set(prev);
        next.add(index);
        
        // Conversion logic
        if (next.size === 4 && !showConversion) {
          setShowConversion(true);
        } else if (next.size === 11 && !showAntiAddiction) {
          setShowAntiAddiction(true);
        }
        
        return next;
      });
    }
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
        <Loader2 className="animate-spin" size={28} />
      </div>
    );
  }

  if (error || videos.length === 0) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)', color: 'var(--text-main)', padding: 24, textAlign: 'center' }}>
        <div>
          <p style={{ fontSize: 20, fontWeight: 900, margin: '0 0 8px 0' }}>{error ? '影音載入失敗' : '目前尚無教練影片'}</p>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: 14 }}>{error || '等教練上傳影片後，這裡會出現探索內容。'}</p>
        </div>
        <Link href="/coaches" style={{ background: 'var(--primary)', color: '#FFF', padding: '14px 32px', borderRadius: '100px', fontWeight: 800, textDecoration: 'none' }}>
          去找教練
        </Link>
      </div>
    );
  }

  const currentVideo = videos[currentIndex];

  return (
    <div 
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        position: 'absolute',
        top: 60, /* Header height */
        left: 0,
        right: 0,
        bottom: 72, /* BottomNav height */
        overflowY: 'scroll',
        scrollSnapType: 'y mandatory',
        background: 'var(--color-bg)',
        zIndex: 10, /* Below header/nav but above main content */
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
          isVisible={index === currentIndex && !showConversion && !showAntiAddiction} 
          onLike={handleLike}
          onShare={handleShare}
          onView={handleView}
        />
      ))}

      {/* Conversion CTA (After 3 videos) */}
      {showConversion && currentVideo && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
          background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(12px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
          <h2 style={{ color: 'white', margin: '0 0 12px', fontSize: 24, fontWeight: 900 }}>喜歡這位教練嗎？</h2>
          <p style={{ color: 'var(--text-muted)', margin: '0 0 32px', textAlign: 'center', fontSize: 15 }}>
            你已經看了幾支影片，現在是預約的好時機！<br/>{currentVideo.coach_name} 教練還有空檔喔。
          </p>
          <button 
            onClick={() => router.push(`/coaches/${currentVideo.coach_id}`)}
            style={{ width: '100%', maxWidth: 320, background: 'var(--color-accent)', color: 'white', padding: 18, borderRadius: 100, border: 'none', fontSize: 18, fontWeight: 900, marginBottom: 16, cursor: 'pointer', boxShadow: '0 8px 30px rgba(245, 158, 11, 0.4)' }}
          >
            👉 立即預約 {currentVideo.coach_name}
          </button>
          <button 
            onClick={() => setShowConversion(false)}
            style={{ background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '12px 24px', borderRadius: 100, fontSize: 14, cursor: 'pointer' }}
          >
            晚點再說，繼續滑
          </button>
        </div>
      )}

      {/* Anti-Addiction CTA (After 10 videos) */}
      {showAntiAddiction && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
          background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(12px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <h2 style={{ color: 'white', margin: '0 0 12px', fontSize: 24, fontWeight: 900 }}>看了很多影片囉！</h2>
          <p style={{ color: 'var(--text-muted)', margin: '0 0 32px', textAlign: 'center', fontSize: 15, lineHeight: 1.6 }}>
            與其一直看影片，不如直接找教練聊聊！<br/>許多學員都是聊過後才發現最適合的教練。
          </p>
          <button 
            onClick={() => router.push('/coaches')}
            style={{ width: '100%', maxWidth: 320, background: 'var(--primary)', color: 'white', padding: 18, borderRadius: 100, border: 'none', fontSize: 18, fontWeight: 900, marginBottom: 16, cursor: 'pointer', boxShadow: '0 8px 30px rgba(37, 99, 235, 0.4)' }}
          >
            💬 去教練列表聊聊
          </button>
          <button 
            onClick={() => setShowAntiAddiction(false)}
            style={{ background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '12px 24px', borderRadius: 100, fontSize: 14, cursor: 'pointer' }}
          >
            我還想再看幾支
          </button>
        </div>
      )}
    </div>
  );
}
