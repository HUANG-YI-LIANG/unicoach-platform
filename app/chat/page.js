'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

const ORANGE = '#FF8A3D';
const BG = '#050816';
const CARD = '#0F172A';
const BORDER = 'rgba(255,255,255,0.06)';
const MUTED = 'rgba(255,255,255,0.58)';
const TEXT_LIGHT = 'rgba(255,255,255,0.92)';
const SHADOW = '0 6px 16px rgba(0,0,0,0.14)';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '剛剛';
  if (minutes < 60) return `${minutes} 分鐘前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小時前`;
  return `${Math.floor(hours / 24)} 天前`;
}

function Avatar({ name, src, size = 46 }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          flexShrink: 0,
          objectFit: 'cover',
          boxShadow: `0 0 15px rgba(0, 0, 0, 0.1)`
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        background: `linear-gradient(135deg, ${ORANGE}, #FDBA74)`,
        color: 'var(--text-light)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.round(size * 0.38),
        fontWeight: 900,
        boxShadow: `0 0 15px rgba(249, 115, 22, 0.3)`
      }}
    >
      {name?.charAt(0) ?? '?'}
    </div>
  );
}

function RoomCard({ room, onClick }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        background: hovered ? 'var(--color-surface-soft)' : CARD,
        borderRadius: 16,
        padding: '14px 16px',
        boxShadow: hovered ? '0 6px 16px rgba(0,0,0,0.14)' : SHADOW,
        cursor: 'pointer',
        transition: 'background 0.15s, transform 0.1s, box-shadow 0.15s',
        transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
        border: hovered ? `1px solid rgba(255,138,61,0.22)` : `1px solid ${BORDER}`,
      }}
    >
      <Avatar name={room.other_party_name} src={room.other_party_avatar} size={48} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: room.unread_count > 0 ? 900 : 800, color: TEXT_LIGHT }}>
          {room.other_party_name || '未命名聊天室'}
        </p>
        <p
          style={{
            margin: '3px 0 0',
            fontSize: 13,
            fontWeight: room.unread_count > 0 ? 800 : 400,
            color: room.unread_count > 0 ? TEXT_LIGHT : MUTED,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {room.last_message || '點擊進入聊天室'}
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: MUTED }}>{timeAgo(room.updated_at || room.created_at)}</span>
        {room.unread_count > 0 && (
          <span
            style={{
              background: '#EF4444',
              color: 'var(--text-light)',
              borderRadius: 100,
              fontSize: 10,
              fontWeight: 900,
              padding: '2px 7px',
              minWidth: 18,
              textAlign: 'center',
            }}
          >
            {room.unread_count}
          </span>
        )}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const isCoach = user?.role === 'coach';
  const isGuest = !loading && !authLoading && !user;

  useEffect(() => {
    let isMounted = true;
    if (authLoading) {
      return () => {
        isMounted = false;
      };
    }

    const withId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('with') : null;

    const openDirectRoom = async () => {
      if (!withId || !user) return false;
      try {
        const response = await fetch('/api/chat/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ with: withId }),
        });
        const data = await response.json().catch(() => ({}));
        if (response.ok && data.roomId) {
          router.replace(`/chat/${data.roomId}`);
          return true;
        }
        console.error('[CHAT DIRECT OPEN ERROR]', data.error || response.statusText);
        return false;
      } catch (error) {
        console.error('[CHAT DIRECT OPEN ERROR]', error);
        return false;
      }
    };

    const fetchRooms = async () => {
      if (!user) {
        if (isMounted) setRooms([]);
        return;
      }

      try {
        const response = await fetch('/api/chat/rooms', { cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json();
        if (isMounted) {
          setRooms(Array.isArray(data.rooms) ? data.rooms : []);
        }
      } catch (error) {
        console.error('[CHAT PAGE LOAD ERROR]', error);
      }
    };

    openDirectRoom().then((opened) => {
      if (opened) return;
      fetchRooms().finally(() => {
        if (isMounted) setLoading(false);
      });
    });

    const pollId = setInterval(fetchRooms, 4000);
    return () => {
      isMounted = false;
      clearInterval(pollId);
    };
  }, [router, user, authLoading]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '70vh', background: BG }}>
        <p style={{ color: ORANGE, fontSize: 15, fontWeight: 800 }}>載入聊天室中...</p>
      </div>
    );
  }

  return (
    <div style={{ background: BG, minHeight: '100dvh', paddingBottom: 'calc(128px + env(safe-area-inset-bottom))', color: TEXT_LIGHT, position: 'relative', overflowX: 'hidden' }}>
      {/* Background Gradient Effect */}
      <div style={{
        position: 'absolute',
        top: -100,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(249, 115, 22, 0.045) 0%, transparent 58%)',
        zIndex: 0,
        pointerEvents: 'none'
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ padding: '20px 16px 12px' }}>
          <p style={{ margin: '0 0 4px', color: MUTED, fontSize: 12, fontWeight: 760 }}>Messages & bookings</p>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: TEXT_LIGHT }}>聊天室</h1>
        </div>

        <section style={{ margin: '0 16px 16px', padding: 14, borderRadius: 16, background: 'rgba(11,18,32,0.92)', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 6px 16px rgba(0,0,0,0.14)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <div>
              <p style={{ margin: 0, color: ORANGE, fontSize: 12, fontWeight: 850 }}>預約狀態</p>
              <h2 style={{ margin: '3px 0 0', color: TEXT_LIGHT, fontSize: 16, fontWeight: 880 }}>尚未建立預約</h2>
            </div>
            <span style={{ padding: '5px 8px', borderRadius: 999, background: 'rgba(148,163,184,0.12)', color: MUTED, fontSize: 11, fontWeight: 850 }}>無正式訂單</span>
          </div>
          <p style={{ margin: 0, color: MUTED, fontSize: 12, lineHeight: 1.65 }}>
            聊天室只用於與教練溝通需求；若尚未透過預約流程建立訂單，這裡不會顯示付款成功或正式上課資訊。完成預約與付款確認後，請以「我的預約」中的真實訂單狀態為準。
          </p>
          <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.42)', fontSize: 11, lineHeight: 1.5 }}>
            Next step · 確認時段後再進入正式預約與付款流程。
          </p>
        </section>

        {rooms.length === 0 ? (
          <div style={{ padding: '32px 24px', textAlign: 'center', marginTop: 20 }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>💬</div>
            <p style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: TEXT_LIGHT }}>目前還沒有聊天紀錄</p>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: MUTED }}>
              {isCoach
                ? '學員建立對話後，聊天室會顯示在這裡。'
                : isGuest
                  ? '請先註冊/登入後才能使用訊息功能，之後就能在這裡直接溝通。'
                  : '先找到合適的教練，之後就能在這裡直接溝通。'}
            </p>
            <button
              onClick={() => router.push(isGuest ? '/register?redirect=/chat' : isCoach ? '/dashboard/coach' : '/coaches')}
              style={{
                padding: '14px 36px',
                background: 'linear-gradient(135deg,#FF8A3D,#FF5E3A)',
                color: '#050816',
                border: 'none',
                borderRadius: 16,
                fontSize: 15,
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: `0 8px 20px rgba(249, 115, 22, 0.3)`,
              }}
            >
              {isCoach ? '返回教練後台' : isGuest ? '請先註冊' : '開始找教練'}
            </button>
          </div>
        ) : (
          <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rooms.map((room) => (
              <RoomCard key={room.id} room={room} onClick={() => router.push(`/chat/${room.id}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
