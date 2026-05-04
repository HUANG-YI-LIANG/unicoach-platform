'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

const ORANGE = '#F97316';
const BG = '#090E17';
const CARD = '#121826';
const BORDER = 'rgba(255,255,255,0.05)';
const MUTED = '#94A3B8';
const TEXT_LIGHT = '#F8FAFC';
const SHADOW = '0 8px 30px rgba(0,0,0,0.5)';

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

function Avatar({ name, size = 46 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        background: `linear-gradient(135deg, ${ORANGE}, #FDBA74)`,
        color: '#fff',
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
        background: hovered ? '#1E293B' : CARD,
        borderRadius: 16,
        padding: '14px 16px',
        boxShadow: SHADOW,
        cursor: 'pointer',
        transition: 'background 0.15s, transform 0.1s',
        transform: hovered ? 'scale(1.01)' : 'scale(1)',
        border: `1px solid ${BORDER}`,
      }}
    >
      <Avatar name={room.other_party_name} size={48} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: TEXT_LIGHT }}>
          {room.other_party_name || '未命名聊天室'}
        </p>
        <p
          style={{
            margin: '3px 0 0',
            fontSize: 13,
            color: MUTED,
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
              color: '#fff',
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
  const { user } = useAuth();
  const isCoach = user?.role === 'coach';

  useEffect(() => {
    let isMounted = true;

    const fetchRooms = async () => {
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

    fetchRooms().finally(() => {
      if (isMounted) setLoading(false);
    });

    const pollId = setInterval(fetchRooms, 4000);
    return () => {
      isMounted = false;
      clearInterval(pollId);
    };
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '70vh', background: BG }}>
        <p style={{ color: ORANGE, fontSize: 15, fontWeight: 800 }}>載入聊天室中...</p>
      </div>
    );
  }

  return (
    <div style={{ background: BG, minHeight: '100vh', paddingBottom: 100, color: TEXT_LIGHT, position: 'relative', overflowX: 'hidden' }}>
      {/* Background Gradient Effect */}
      <div style={{
        position: 'absolute',
        top: -100,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(249, 115, 22, 0.1) 0%, rgba(9, 14, 23, 0) 60%)',
        zIndex: 0,
        pointerEvents: 'none'
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ padding: '20px 16px 12px' }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: TEXT_LIGHT }}>聊天室</h1>
        </div>

        {rooms.length === 0 ? (
          <div style={{ padding: '32px 24px', textAlign: 'center', marginTop: 20 }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>💬</div>
            <p style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: TEXT_LIGHT }}>目前還沒有聊天紀錄</p>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: MUTED }}>
              {isCoach ? '學員建立對話後，聊天室會顯示在這裡。' : '先找到合適的教練，之後就能在這裡直接溝通。'}
            </p>
            <button
              onClick={() => router.push(isCoach ? '/dashboard/coach' : '/coaches')}
              style={{
                padding: '14px 36px',
                background: ORANGE,
                color: '#fff',
                border: 'none',
                borderRadius: 16,
                fontSize: 15,
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: `0 8px 20px rgba(249, 115, 22, 0.3)`,
              }}
            >
              {isCoach ? '返回教練後台' : '開始找教練'}
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
