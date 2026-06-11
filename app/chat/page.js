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

const CHAT_TASK_FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'booked', label: '有預約' },
  { key: 'unread', label: '待回覆' },
  { key: 'askFirst', label: '先問教練' },
];

const CHAT_ROOM_TASK_COPY = {
  booked: {
    label: '預約上下文',
    title: '已連到課程',
    next: '下一步：確認時段、地點、器材與線上連結。',
    tone: 'booked',
  },
  unread: {
    label: '待回覆',
    title: '有人等你回覆',
    next: '下一步：先回覆對方問題，再回到我的課程確認正式狀態。',
    tone: 'unread',
  },
  askFirst: {
    label: '先問教練',
    title: '尚未建立正式課程',
    next: '下一步：先聊清楚程度、目標與可上課時間，再前往預約。',
    tone: 'neutral',
  },
};

function getRoomTaskType(room) {
  if (room?.booking_id) return 'booked';
  if ((room?.unread_count || 0) > 0) return 'unread';
  return 'askFirst';
}

function getChatTaskCounts(rooms) {
  return rooms.reduce(
    (counts, room) => {
      counts.all += 1;
      const taskType = getRoomTaskType(room);
      counts[taskType] += 1;
      return counts;
    },
    { all: 0, booked: 0, unread: 0, askFirst: 0 }
  );
}

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
  const taskType = getRoomTaskType(room);
  const taskCopy = CHAT_ROOM_TASK_COPY[taskType] || CHAT_ROOM_TASK_COPY.askFirst;
  const isBooked = taskType === 'booked';

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: room.unread_count > 0 ? 900 : 800, color: TEXT_LIGHT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {room.other_party_name || '未命名聊天室'}
          </p>
          <span style={{ flexShrink: 0, padding: '3px 7px', borderRadius: 999, background: isBooked ? 'rgba(34,197,94,0.12)' : 'rgba(148,163,184,0.10)', color: isBooked ? '#86EFAC' : MUTED, fontSize: 10, fontWeight: 850 }}>
            {taskCopy.label}
          </span>
        </div>
        <p
          style={{
            margin: '4px 0 0',
            fontSize: 13,
            fontWeight: room.unread_count > 0 ? 800 : 500,
            color: room.unread_count > 0 ? TEXT_LIGHT : MUTED,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {room.last_message || taskCopy.title}
        </p>
        <p style={{ margin: '8px 0 0', fontSize: 12, lineHeight: 1.45, color: 'rgba(255,255,255,0.48)' }}>
          {taskCopy.next}
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
  const [activeChatTaskFilter, setActiveChatTaskFilter] = useState('all');
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const isCoach = user?.role === 'coach';
  const isGuest = !loading && !authLoading && !user;
  const chatTaskCounts = getChatTaskCounts(rooms);
  const filteredRooms = rooms.filter((room) => activeChatTaskFilter === 'all' || getRoomTaskType(room) === activeChatTaskFilter);

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
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: TEXT_LIGHT }}>對話任務</h1>
          <p style={{ margin: '7px 0 0', color: MUTED, fontSize: 13, lineHeight: 1.55 }}>
            把聊天當成上課前的任務清單：先問教練、確認時段、地點、器材與線上連結，再回到「我的課程」看正式預約上下文。
          </p>
        </div>

        <section style={{ margin: '0 16px 14px', padding: 14, borderRadius: 16, background: 'rgba(11,18,32,0.92)', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 6px 16px rgba(0,0,0,0.14)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
            <div style={{ padding: 10, borderRadius: 14, background: 'rgba(255,255,255,0.04)' }}>
              <p style={{ margin: 0, color: MUTED, fontSize: 11 }}>全部對話</p>
              <strong style={{ display: 'block', marginTop: 3, color: TEXT_LIGHT, fontSize: 18 }}>{chatTaskCounts.all}</strong>
            </div>
            <div style={{ padding: 10, borderRadius: 14, background: 'rgba(255,255,255,0.04)' }}>
              <p style={{ margin: 0, color: MUTED, fontSize: 11 }}>有預約</p>
              <strong style={{ display: 'block', marginTop: 3, color: '#86EFAC', fontSize: 18 }}>{chatTaskCounts.booked}</strong>
            </div>
            <div style={{ padding: 10, borderRadius: 14, background: 'rgba(255,255,255,0.04)' }}>
              <p style={{ margin: 0, color: MUTED, fontSize: 11 }}>待回覆</p>
              <strong style={{ display: 'block', marginTop: 3, color: ORANGE, fontSize: 18 }}>{chatTaskCounts.unread}</strong>
            </div>
          </div>
          <p style={{ margin: 0, color: MUTED, fontSize: 12, lineHeight: 1.65 }}>
            尚未建立預約時，聊天只用來釐清需求；預約上下文只顯示既有聊天室資料，正式預約、付款與課後紀錄仍以「我的課程」為準，不在聊天裡假裝訂單已成立。
          </p>
        </section>

        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 16px 14px' }}>
          {CHAT_TASK_FILTERS.map((filter) => {
            const active = activeChatTaskFilter === filter.key;
            return (
              <button
                key={filter.key}
                onClick={() => setActiveChatTaskFilter(filter.key)}
                style={{
                  flexShrink: 0,
                  border: `1px solid ${active ? 'rgba(255,138,61,0.42)' : BORDER}`,
                  background: active ? 'rgba(255,138,61,0.14)' : 'rgba(255,255,255,0.04)',
                  color: active ? ORANGE : MUTED,
                  borderRadius: 999,
                  padding: '8px 11px',
                  fontSize: 12,
                  fontWeight: 820,
                  cursor: 'pointer',
                }}
              >
                {filter.label} · {chatTaskCounts[filter.key] ?? 0}
              </button>
            );
          })}
        </div>

        {filteredRooms.length === 0 ? (
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
            {filteredRooms.map((room) => (
              <RoomCard key={room.id} room={room} onClick={() => router.push(`/chat/${room.id}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
