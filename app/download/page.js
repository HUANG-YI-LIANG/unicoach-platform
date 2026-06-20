'use client';
import { useRouter } from 'next/navigation';
import { Apple, Smartphone, Globe, Share, PlusSquare, X } from 'lucide-react';
import { useState } from 'react';

export default function DownloadAppPage() {
  const router = useRouter();
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [showAndroidGuide, setShowAndroidGuide] = useState(false);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#000000',
      backgroundImage: 'radial-gradient(circle at 50% 20%, rgba(255, 138, 61, 0.15), transparent 60%)',
      color: '#FFFFFF',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 20px',
      fontFamily: 'sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      
      {/* 模糊背景點綴 */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '-10%',
        width: '40vh',
        height: '40vh',
        background: 'rgba(255, 138, 61, 0.1)',
        filter: 'blur(80px)',
        borderRadius: '50%',
        zIndex: 0
      }}></div>

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        {/* Logo 區塊 */}
        <div style={{ 
          width: '120px', 
          height: '120px', 
          borderRadius: '50%', 
          border: '2px solid rgba(255, 138, 61, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(10px)',
          marginBottom: '32px',
          boxShadow: '0 0 30px rgba(255, 138, 61, 0.2)'
        }}>
          <span style={{ fontSize: '28px', fontWeight: 900, color: '#FF8A3D', letterSpacing: '-1px' }}>Uni<br/>Coach</span>
        </div>

        {/* 標題與副標題 */}
        <div style={{
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '100px',
          padding: '8px 24px',
          fontSize: '13px',
          fontWeight: 700,
          color: 'rgba(255,255,255,0.9)',
          marginBottom: '32px',
          letterSpacing: '1px'
        }}>
          全台最大運動教學平台・立即下載
        </div>

        <h1 style={{ 
          fontSize: '42px', 
          fontWeight: 900, 
          margin: '0 0 24px', 
          letterSpacing: '2px',
          textShadow: '0 4px 20px rgba(0,0,0,0.5)'
        }}>
          專屬 APP
        </h1>

        <p style={{
          textAlign: 'center',
          fontSize: '15px',
          color: 'rgba(255,255,255,0.7)',
          lineHeight: 1.8,
          marginBottom: '48px',
          fontWeight: 600
        }}>
          集結頂尖教練、限定課程、最新場地<br />
          一鍵探索運動教學新世界
        </p>

        {/* 下載按鈕群 */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <button 
            onClick={() => setShowIosGuide(true)}
            style={{
              width: '100%',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.8)',
              borderRadius: '100px',
              padding: '16px',
              color: '#FFFFFF',
              fontSize: '16px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <Apple size={24} /> iOS下載
          </button>

          <button 
            onClick={() => setShowAndroidGuide(true)}
            style={{
              width: '100%',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
              border: '1px solid rgba(255,255,255,0.4)',
              borderRadius: '100px',
              padding: '16px',
              color: '#FFFFFF',
              fontSize: '16px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              cursor: 'pointer',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.2s'
            }}
          >
            <Smartphone size={24} /> Android下載
          </button>

          <button 
            onClick={() => router.push('/')}
            style={{
              width: '100%',
              background: '#000000',
              border: '1px solid rgba(255, 138, 61, 0.5)',
              boxShadow: '0 0 20px rgba(255, 138, 61, 0.2)',
              borderRadius: '100px',
              padding: '16px',
              color: '#FFFFFF',
              fontSize: '16px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              cursor: 'pointer',
              marginTop: '16px',
              transition: 'all 0.2s'
            }}
          >
            <Globe size={22} color="#FF8A3D" /> 進入官網逛逛
          </button>
        </div>
      </div>

      {/* iOS 安裝教學 Modal */}
      {showIosGuide && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          alignItems: 'center',
          backdropFilter: 'blur(5px)'
        }}>
          <div style={{
            background: '#1A1A1A',
            width: '100%',
            borderTopLeftRadius: '24px',
            borderTopRightRadius: '24px',
            padding: '32px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative'
          }}>
            <button 
              onClick={() => setShowIosGuide(false)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#999', cursor: 'pointer' }}
            >
              <X size={24} />
            </button>
            
            <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '24px', color: '#FFF' }}>如何安裝 iOS App？</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: '#2A2A2A', padding: '16px', borderRadius: '12px' }}>
                <div style={{ width: '40px', height: '40px', background: '#333', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Share size={20} color="#3B82F6" />
                </div>
                <div style={{ flex: 1, fontSize: '15px', color: '#DDD', lineHeight: 1.5 }}>
                  1. 點擊 Safari 瀏覽器正下方的<br/>「<strong style={{color:'#FFF'}}>分享按鈕</strong>」
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: '#2A2A2A', padding: '16px', borderRadius: '12px' }}>
                <div style={{ width: '40px', height: '40px', background: '#333', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <PlusSquare size={20} color="#FFF" />
                </div>
                <div style={{ flex: 1, fontSize: '15px', color: '#DDD', lineHeight: 1.5 }}>
                  2. 往下滑動，選擇<br/>「<strong style={{color:'#FFF'}}>加入主畫面</strong>」
                </div>
              </div>
            </div>

            <button 
              onClick={() => setShowIosGuide(false)}
              style={{
                width: '100%',
                background: '#FF8A3D',
                border: 'none',
                borderRadius: '100px',
                padding: '16px',
                color: '#FFF',
                fontSize: '16px',
                fontWeight: 800,
                marginTop: '32px',
                cursor: 'pointer'
              }}
            >
              我知道了
            </button>
          </div>
        </div>
      )}

      {/* Android 安裝教學 Modal */}
      {showAndroidGuide && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          alignItems: 'center',
          backdropFilter: 'blur(5px)'
        }}>
          <div style={{
            background: '#1A1A1A',
            width: '100%',
            borderTopLeftRadius: '24px',
            borderTopRightRadius: '24px',
            padding: '32px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative'
          }}>
            <button 
              onClick={() => setShowAndroidGuide(false)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#999', cursor: 'pointer' }}
            >
              <X size={24} />
            </button>
            
            <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '24px', color: '#FFF' }}>如何安裝 Android App？</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: '#2A2A2A', padding: '16px', borderRadius: '12px' }}>
                <div style={{ width: '40px', height: '40px', background: '#333', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#FFF' }}>⋮</span>
                </div>
                <div style={{ flex: 1, fontSize: '15px', color: '#DDD', lineHeight: 1.5 }}>
                  1. 點擊瀏覽器右上角的<br/>「<strong style={{color:'#FFF'}}>三個點 (選單)</strong>」
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: '#2A2A2A', padding: '16px', borderRadius: '12px' }}>
                <div style={{ width: '40px', height: '40px', background: '#333', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <PlusSquare size={20} color="#FFF" />
                </div>
                <div style={{ flex: 1, fontSize: '15px', color: '#DDD', lineHeight: 1.5 }}>
                  2. 選擇列表中的<br/>「<strong style={{color:'#FFF'}}>加到主畫面</strong>」或「<strong style={{color:'#FFF'}}>安裝應用程式</strong>」
                </div>
              </div>
            </div>

            <button 
              onClick={() => setShowAndroidGuide(false)}
              style={{
                width: '100%',
                background: '#3B82F6',
                border: 'none',
                borderRadius: '100px',
                padding: '16px',
                color: '#FFF',
                fontSize: '16px',
                fontWeight: 800,
                marginTop: '32px',
                cursor: 'pointer'
              }}
            >
              我知道了
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
