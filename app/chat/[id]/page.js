'use client';

import { use, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const BLUE = '#2563EB';
const BLUE_BG = '#EFF6FF';
const BG = '#F1F5F9';
const DARK = '#0F172A';
const MUTED = '#94A3B8';
const WHITE = '#FFFFFF';

const QUICK_REPLIES = [
  '你好，我想先了解課程安排。',
  '請問最近有哪些可預約時段？',
  '我想了解你的教學方式。',
  '方便提供課程建議嗎？',
];

function formatTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function Avatar({ name, size = 36 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        background: `linear-gradient(135deg, ${BLUE}, #60A5FA)`,
        color: WHITE,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.round(size * 0.38),
        fontWeight: 900,
      }}
    >
      {name?.charAt(0) ?? '?'}
    </div>
  );
}

export default function ChatRoomPage({ params }) {
  const { id } = use(params);
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingPhilosophy, setEditingPhilosophy] = useState(false);
  const [phiText, setPhiText] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const router = useRouter();

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/chat?roomId=${id}`, { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      setMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch (error) {
      console.error('[CHAT ROOM FETCH MESSAGES ERROR]', error);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        const [roomRes, authRes] = await Promise.all([
          fetch(`/api/chat/rooms/${id}`, { cache: 'no-store' }),
          fetch('/api/auth/profile', { cache: 'no-store' }),
        ]);

        if (roomRes.ok) {
          const roomData = await roomRes.json();
          if (isMounted) {
            setRoom(roomData.room || null);
            setPhiText(roomData.room?.coach_philosophy || '');
          }
        } else if (roomRes.status === 403 || roomRes.status === 404) {
          router.push('/chat');
          return;
        }

        if (authRes.ok) {
          const authData = await authRes.json();
          if (isMounted) {
            setCurrentUser(authData.profile || null);
          }
        }

        await fetchMessages();
      } catch (error) {
        console.error('[CHAT ROOM INIT ERROR]', error);
      } finally {
        if (isMounted) {
          setLoading(false);
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
      }
    };

    init();
    const pollId = setInterval(fetchMessages, 4000);

    return () => {
      isMounted = false;
      clearInterval(pollId);
    };
  }, [id, router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (presetMessage) => {
    const content = (presetMessage ?? text).trim();
    if (!content) return;

    setText('');

    const optimisticMessage = {
      id: `opt_${Date.now()}`,
      message: content,
      sender_id: currentUser?.id,
      sender_role: currentUser?.role,
      sender_name: currentUser?.name || '我',
      created_at: new Date().toISOString(),
      is_system: false,
      is_read: false,
    };
    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: id, message: content }),
      });
      fetchMessages();
    } catch (error) {
      console.error('[CHAT ROOM SEND ERROR]', error);
    }

    inputRef.current?.focus();
  };

  const savePhilosophy = async () => {
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ philosophy: phiText }),
      });

      if (response.ok) {
        setRoom((prev) => ({ ...prev, coach_philosophy: phiText }));
        setEditingPhilosophy(false);
      }
    } catch (error) {
      console.error('[CHAT ROOM SAVE PHILOSOPHY ERROR]', error);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p style={{ color: MUTED, fontWeight: 600 }}>載入聊天室中...</p>
      </div>
    );
  }

  const isCoach = currentUser?.role === 'coach';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: BG }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 16px',
          background: WHITE,
          borderBottom: '1px solid #E2E8F0',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}
      >
        <button
          onClick={() => router.push('/chat')}
          style={{
            background: 'none',
            border: 'none',
            padding: '4px 8px 4px 0',
            cursor: 'pointer',
            fontSize: 20,
            color: BLUE,
            lineHeight: 1,
          }}
        >
          ←
        </button>

        <Avatar name={room?.other_name ?? '?'} size={40} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: DARK }}>
              {room?.other_name ?? '聊天室'}
            </p>
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                padding: '2px 6px',
                borderRadius: 4,
                background: room?.other_is_coach ? `${BLUE}15` : '#F1F5F9',
                color: room?.other_is_coach ? BLUE : MUTED,
              }}
            >
              {room?.other_is_coach ? '教練' : '學員'}
            </span>
          </div>

          {isCoach ? (
            <p style={{ margin: 0, fontSize: 11, color: MUTED }}>
              學員年級：{room?.user_grade || '尚未填寫'}
            </p>
          ) : (
            room?.coach_philosophy && (
              <p
                style={{
                  margin: 0,
                  fontSize: 11,
                  color: MUTED,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                教學理念：{room.coach_philosophy}
              </p>
            )
          )}
        </div>

        {isCoach && (
          <button
            onClick={() => {
              setEditingPhilosophy(!editingPhilosophy);
              setPhiText(room?.coach_philosophy || '');
            }}
            style={{
              background: BG,
              border: 'none',
              borderRadius: 8,
              padding: '6px 10px',
              fontSize: 11,
              fontWeight: 700,
              color: BLUE,
              cursor: 'pointer',
            }}
          >
            {editingPhilosophy ? '取消' : '編輯理念'}
          </button>
        )}
      </div>

      {isCoach && editingPhilosophy && (
        <div style={{ background: '#F8FAFC', padding: 12, borderBottom: '1px solid #E2E8F0' }}>
          <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 800, color: DARK }}>編輯教學理念</p>
          <textarea
            value={phiText}
            onChange={(event) => setPhiText(event.target.value)}
            style={{
              width: '100%',
              padding: 10,
              borderRadius: 8,
              border: '1px solid #E2E8F0',
              fontSize: 13,
              marginBottom: 8,
            }}
            placeholder="輸入要展示在聊天室上方的教學理念"
            rows={2}
          />
          <button
            onClick={savePhilosophy}
            style={{
              width: '100%',
              background: BLUE,
              color: WHITE,
              border: 'none',
              padding: '8px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            儲存理念
          </button>
        </div>
      )}

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {messages.length === 0 ? (
          <div style={{ margin: 'auto', textAlign: 'center', padding: '0 20px' }}>
            {room?.coach_name && (
              <div
                style={{
                  background: WHITE,
                  borderRadius: 20,
                  boxShadow: '0 2px 16px rgba(0,0,0,0.07)',
                  padding: '20px 22px',
                  marginBottom: 24,
                  textAlign: 'left',
                  borderTop: `3px solid ${BLUE}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <Avatar name={room.coach_name} size={44} />
                  <div>
                    <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: DARK }}>{room.coach_name}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: MUTED }}>教練介紹</p>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: 14, color: '#334155', lineHeight: 1.6, fontStyle: 'italic' }}>
                  {room.coach_philosophy || '這位教練尚未填寫教學理念。'}
                </p>
              </div>
            )}

            <p style={{ fontSize: 15, fontWeight: 700, color: DARK, marginBottom: 6 }}>開始第一則訊息吧</p>
            <p style={{ fontSize: 13, color: MUTED, marginBottom: 20 }}>你可以直接選擇常用問題，快速開啟對話。</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {QUICK_REPLIES.map((reply) => (
                <button
                  key={reply}
                  onClick={() => sendMessage(reply)}
                  style={{
                    width: '100%',
                    padding: '12px 20px',
                    background: WHITE,
                    border: `1.5px solid ${BLUE}`,
                    borderRadius: 100,
                    fontSize: 14,
                    fontWeight: 600,
                    color: BLUE,
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.background = BLUE_BG;
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.background = WHITE;
                  }}
                >
                  {reply}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message, index) => {
            const isMe = String(message.sender_id) === String(currentUser?.id);

            if (message.is_system) {
              return (
                <div key={message.id || index} style={{ textAlign: 'center', margin: '10px 0' }}>
                  <span
                    style={{
                      fontSize: 11,
                      color: '#EF4444',
                      background: '#FEE2E2',
                      padding: '4px 12px',
                      borderRadius: 100,
                    }}
                  >
                    {message.message}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={message.id || index}
                style={{
                  display: 'flex',
                  justifyContent: isMe ? 'flex-end' : 'flex-start',
                  gap: 8,
                  alignItems: 'flex-end',
                  marginBottom: 12,
                }}
              >
                {!isMe && <Avatar name={message.sender_name ?? room?.coach_name} size={32} />}

                <div style={{ maxWidth: '70%' }}>
                  {!isMe && message.sender_name && (
                    <p style={{ margin: '0 0 4px 4px', fontSize: 11, color: MUTED, fontWeight: 600 }}>
                      {message.sender_name}
                    </p>
                  )}
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      background: isMe ? BLUE : '#E5E7EB',
                      color: isMe ? WHITE : DARK,
                      fontSize: 14,
                      lineHeight: 1.5,
                      boxShadow: isMe ? '0 2px 8px rgba(37,99,235,0.2)' : '0 2px 8px rgba(0,0,0,0.06)',
                    }}
                  >
                    {message.message}
                  </div>
                  <p style={{ margin: '4px 4px 0', fontSize: 10, color: MUTED, textAlign: isMe ? 'right' : 'left' }}>
                    {formatTime(message.created_at)}
                  </p>
                </div>

                {isMe && <Avatar name={message.sender_name || '我'} size={32} />}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px 14px',
          background: WHITE,
          borderTop: '1px solid #E2E8F0',
          position: 'sticky',
          bottom: 0,
          zIndex: 100,
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              sendMessage();
            }
          }}
          placeholder="輸入訊息..."
          style={{
            flex: 1,
            padding: '10px 16px',
            border: '1.5px solid #E2E8F0',
            borderRadius: 100,
            fontSize: 14,
            outline: 'none',
            background: '#F8FAFC',
            color: DARK,
            fontFamily: 'inherit',
          }}
        />
        <button
          onClick={() => sendMessage()}
          disabled={!text.trim()}
          style={{
            width: 42,
            height: 42,
            borderRadius: '50%',
            flexShrink: 0,
            background: text.trim() ? BLUE : '#CBD5E1',
            border: 'none',
            cursor: text.trim() ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
