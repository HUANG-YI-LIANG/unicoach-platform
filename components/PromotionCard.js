'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Check, Copy, Share2, Wallet } from 'lucide-react';

export default function PromotionCard({ user }) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div
        style={{
          background: '#fff',
          borderRadius: 24,
          height: 220,
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        }}
      />
    );
  }

  const origin = window.location.origin;
  const promotionCode = user?.promotion_code || '';
  const promotionUrl = `${origin}/register?ref=${promotionCode}`;
  const balance = user?.wallet_balance || 0;

  const flashCopyState = (setter) => {
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(promotionUrl);
      flashCopyState(setCopiedLink);
    } catch (error) {
      console.error('[COPY PROMOTION LINK ERROR]', error);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(promotionCode);
      flashCopyState(setCopiedCode);
    } catch (error) {
      console.error('[COPY PROMOTION CODE ERROR]', error);
    }
  };

  if (!promotionCode) {
    return (
      <div
        style={{
          background: '#fff',
          borderRadius: 24,
          padding: 24,
          textAlign: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>推廣碼尚未建立</div>
        <p style={{ margin: '8px 0 0', fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>
          目前這個帳號還沒有可分享的推薦碼，請稍後再重新整理，或確認推薦系統 migration 是否已完成。
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 24,
        padding: 24,
        boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
        display: 'grid',
        gap: 24,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          background: 'linear-gradient(135deg, #0f172a, #1e293b)',
          color: '#fff',
          padding: '16px 20px',
          borderRadius: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              background: 'rgba(255,255,255,0.1)',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Wallet size={20} color="#60A5FA" />
          </div>
          <div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 700, letterSpacing: '0.05em' }}>
              推廣錢包餘額
            </div>
            <div style={{ fontSize: 24, fontWeight: 900 }}>NT$ {balance.toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 800, color: '#64748b', marginBottom: 8, display: 'block' }}>
              我的推廣碼
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                readOnly
                value={promotionCode}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  fontSize: 18,
                  fontWeight: 900,
                  color: '#0f172a',
                  letterSpacing: '0.1em',
                  textAlign: 'center',
                }}
              />
              <button
                onClick={handleCopyCode}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 16px',
                  background: copiedCode ? '#059669' : '#eff6ff',
                  color: copiedCode ? '#fff' : '#2563eb',
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  transition: '0.2s',
                  fontWeight: 800,
                }}
              >
                {copiedCode ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 800, color: '#64748b', marginBottom: 8, display: 'block' }}>
              推廣分享連結
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                readOnly
                value={promotionUrl}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  fontSize: 13,
                  color: '#475569',
                  textOverflow: 'ellipsis',
                }}
              />
              <button
                onClick={handleCopyLink}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 16px',
                  background: copiedLink ? '#059669' : '#eff6ff',
                  color: copiedLink ? '#fff' : '#2563eb',
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  transition: '0.2s',
                  fontWeight: 800,
                }}
              >
                {copiedLink ? <Check size={18} /> : <Share2 size={18} />}
              </button>
            </div>
            <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 8, lineHeight: 1.5 }}>
              分享這個連結給新使用者，對方透過你的推薦碼完成註冊並成功付款後，系統才會累積對應的推廣獎勵。
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            background: '#f8fafc',
            borderRadius: 16,
            border: '1px dashed #cbd5e1',
          }}
        >
          <label style={{ fontSize: 12, fontWeight: 800, color: '#64748b', marginBottom: 16 }}>推廣 QR Code</label>
          <div style={{ background: '#fff', padding: 12, borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <QRCodeSVG
              value={promotionUrl}
              size={160}
              level="H"
              imageSettings={{
                src: '/apple-touch-icon.png',
                x: undefined,
                y: undefined,
                height: 32,
                width: 32,
                excavate: true,
              }}
            />
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 12, fontWeight: 700 }}>
            可直接讓對方掃碼註冊與進站
          </div>
        </div>
      </div>
    </div>
  );
}
