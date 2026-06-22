'use client';

import { use, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const ORANGE = 'var(--color-accent)';
const ORANGE_BG = 'rgba(245, 158, 11, 0.1)';
const BG = 'var(--color-bg)';
const CARD = 'var(--color-bg)'; // Unified with BG
const TEXT_LIGHT = 'var(--color-text)';
const MUTED = 'var(--color-text-muted)';
const INPUT_BG = 'var(--color-surface)';
const BORDER = 'var(--color-border)';
const SECONDARY_BUBBLE = 'var(--color-surface-soft)';


const CHAT_CONTEXT_CHECKLIST = [
  '確認時段',
  '確認地點',
  '確認器材',
  '確認線上連結',
];

const LESSON_CONTEXT_QUICK_REPLIES = [
  '我想確認時段、地點、器材與線上連結。',
  '這堂課前我需要先準備什麼？',
  '如果我程度不確定，你建議從哪裡開始？',
];

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
        background: `linear-gradient(135deg, ${ORANGE}, #FDBA74)`,
        color: 'var(--text-light)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.round(size * 0.38),
        fontWeight: 900,
        boxShadow: `0 0 10px rgba(249, 115, 22, 0.3)`
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: BG }}>
        <p style={{ color: ORANGE, fontWeight: 800 }}>載入聊天室中...</p>
      </div>
    );
  }

  const isCoach = currentUser?.role === 'coach';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden', background: BG, color: TEXT_LIGHT }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 16px',
          background: 'var(--color-surface)',
          borderBottom: `1px solid ${BORDER}`,
          zIndex: 10,
          boxShadow: 'var(--shadow-sm, 0 4px 10px rgba(0,0,0,0.05))',
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
            color: ORANGE,
            lineHeight: 1,
          }}
        >
          ←
        </button>

        <Avatar name={room?.other_name ?? '?'} size={40} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: TEXT_LIGHT }}>
              {room?.other_name ?? '聊天室'}
            </p>
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                padding: '2px 6px',
                borderRadius: 4,
                background: room?.other_is_coach ? ORANGE_BG : INPUT_BG,
                color: room?.other_is_coach ? ORANGE : MUTED,
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
              background: INPUT_BG,
              border: 'none',
              borderRadius: 8,
              padding: '6px 10px',
              fontSize: 11,
              fontWeight: 700,
              color: ORANGE,
              cursor: 'pointer',
            }}
          >
            {editingPhilosophy ? '取消' : '編輯理念'}
          </button>
        )}
      </div>

      {isCoach && editingPhilosophy && (
        <div style={{ background: 'var(--color-surface)', padding: 12, borderBottom: `1px solid ${BORDER}` }}>
          <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 800, color: TEXT_LIGHT }}>編輯教學理念</p>
          <textarea
            value={phiText}
            onChange={(event) => setPhiText(event.target.value)}
            style={{
              width: '100%',
              padding: 10,
              borderRadius: 8,
              border: `1px solid ${BORDER}`,
              background: INPUT_BG,
              color: TEXT_LIGHT,
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
              background: ORANGE,
              color: 'var(--text-light)',
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

      <section className="chat-task-context-card" style={{ margin: '10px 14px 0', padding: '12px 14px', borderRadius: 16, background: 'rgba(11,18,32,0.88)', border: `1px solid ${BORDER}`, boxShadow: '0 6px 16px rgba(0,0,0,0.14)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, color: MUTED, fontWeight: 650 }}>Booking context</p>
            <h2 style={{ margin: '2px 0 0', fontSize: 15, fontWeight: 760, color: TEXT_LIGHT }}>上課前對話任務</h2>
          </div>
          <span style={{ fontSize: 11, color: ORANGE, background: ORANGE_BG, borderRadius: 999, padding: '4px 8px', fontWeight: 700 }}>先問清楚</span>
        </div>
        <p style={{ margin: '8px 0 0', fontSize: 12, lineHeight: 1.55, color: MUTED }}>
          確認時段、地點、器材與線上連結；正式預約與付款狀態仍以「我的課程」為準。
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginTop: 10 }}>
          {CHAT_CONTEXT_CHECKLIST.map((item) => (
            <span key={item} style={{ borderRadius: 12, background: 'rgba(255,255,255,0.045)', border: `1px solid ${BORDER}`, color: 'rgba(255,255,255,0.72)', fontSize: 11, fontWeight: 720, padding: '7px 8px' }}>
              ✓ {item}
            </span>
          ))}
        </div>
        
        {/* Action Buttons */}
        <div style={{ marginTop: 12 }}>
          {isCoach ? (
            <button 
              onClick={() => router.push('/coach/schedule')}
              style={{ width: '100%', padding: '10px', background: 'transparent', color: ORANGE, border: `1.5px solid ${ORANGE}`, borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' }}
              onMouseEnter={(e) => e.target.style.background = ORANGE_BG}
              onMouseLeave={(e) => e.target.style.background = 'transparent'}
            >
              修改我的可預約時段
            </button>
          ) : (
            <button 
              onClick={() => router.push(`/coaches/${room?.coach_id}/availability`)}
              style={{ width: '100%', padding: '10px', background: ORANGE, color: 'var(--text-light)', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)' }}
            >
              談妥了嗎？直接下單預約
            </button>
          )}
        </div>
      </section>

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
                  background: 'var(--color-surface)',
                  borderRadius: 20,
                  boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
                  padding: '20px 22px',
                  marginBottom: 24,
                  textAlign: 'left',
                  borderTop: `3px solid ${ORANGE}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <Avatar name={room.coach_name} size={44} />
                  <div>
                    <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: TEXT_LIGHT }}>{room.coach_name}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: MUTED }}>教練介紹</p>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: 14, color: MUTED, lineHeight: 1.6, fontStyle: 'italic' }}>
                  {room.coach_philosophy || '這位教練尚未填寫教學理念。'}
                </p>
              </div>
            )}

            <p style={{ fontSize: 15, fontWeight: 700, color: TEXT_LIGHT, marginBottom: 6 }}>開始第一則訊息吧</p>
            <p style={{ fontSize: 13, color: MUTED, marginBottom: 20 }}>你可以直接選擇課程任務問題，快速確認上課上下文。</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
              {LESSON_CONTEXT_QUICK_REPLIES.map((reply) => (
                <button
                  key={reply}
                  onClick={() => sendMessage(reply)}
                  style={{
                    width: '100%',
                    padding: '12px 20px',
                    background: ORANGE_BG,
                    border: `1.5px solid ${ORANGE}`,
                    borderRadius: 100,
                    fontSize: 14,
                    fontWeight: 700,
                    color: ORANGE,
                    cursor: 'pointer',
                  }}
                >
                  {reply}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {QUICK_REPLIES.map((reply) => (
                <button
                  key={reply}
                  onClick={() => sendMessage(reply)}
                  style={{
                    width: '100%',
                    padding: '12px 20px',
                    background: 'var(--color-surface)',
                    border: `1.5px solid ${ORANGE}`,
                    borderRadius: 100,
                    fontSize: 14,
                    fontWeight: 600,
                    color: ORANGE,
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.background = ORANGE_BG;
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.background = CARD;
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
                      color: 'rgba(255,255,255,0.46)',
                      background: 'rgba(148,163,184,0.08)',
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
                  marginBottom: 10,
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
                      background: isMe ? ORANGE : SECONDARY_BUBBLE,
                      color: isMe ? 'var(--text-light)' : 'var(--color-text)',
                      fontSize: 14,
                      lineHeight: 1.5,
                      boxShadow: isMe ? `0 3px 8px rgba(249, 115, 22, 0.14)` : '0 4px 12px rgba(0,0,0,0.12)',
                      border: isMe ? 'none' : '1px solid var(--color-border)',
                    }}
                  >
                    {message.message}
                  </div>
                  <p style={{ margin: '4px 4px 0', fontSize: 9, color: 'rgba(255,255,255,0.32)', textAlign: isMe ? 'right' : 'left' }}>
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
          padding: '10px 14px calc(14px + env(safe-area-inset-bottom, 20px))',
          background: 'var(--color-surface)',
          borderTop: `1px solid ${BORDER}`,
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
            border: `1.5px solid ${BORDER}`,
            borderRadius: 100,
            fontSize: 14,
            outline: 'none',
            background: INPUT_BG,
            color: TEXT_LIGHT,
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
            background: text.trim() ? ORANGE : INPUT_BG,
            border: 'none',
            cursor: text.trim() ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            boxShadow: text.trim() ? `0 4px 12px rgba(249, 115, 22, 0.4)` : 'none'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13" stroke={text.trim() ? 'var(--text-light)' : MUTED} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke={text.trim() ? 'var(--text-light)' : MUTED} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
