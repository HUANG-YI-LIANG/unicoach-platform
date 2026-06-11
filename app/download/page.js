'use client';
import { useRouter } from 'next/navigation';
import { Apple, Smartphone, Globe } from 'lucide-react';

export default function DownloadAppPage() {
  const router = useRouter();

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
            onClick={() => alert('iOS APP 尚未上架，敬請期待！')}
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
            onClick={() => alert('Android APP 尚未上架，敬請期待！')}
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
    </div>
  );
}
