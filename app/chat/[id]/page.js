'use client';
import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';

// ── Palette ───────────────────────────────────────────────────────────────────
const BLUE     = '#2563EB';
const BLUE_BG  = '#EFF6FF';
const BG       = '#F1F5F9';
const DARK     = '#0F172A';
const MUTED    = '#94A3B8';
const WHITE    = '#FFFFFF';

// ── Quick-reply chips ─────────────────────────────────────────────────────────
const QUICK_REPLIES = [
  '想了解課程安排',
  '試上一堂可以嗎？',
  '請問最近有空嗎？',
  '想了解收費方式',
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function Avatar({ name, size = 36 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `linear-gradient(135deg, ${BLUE}, #60A5FA)`,
      color: WHITE, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(size * 0.38), fontWeight: 900,
    }}>
      {name?.charAt(0) ?? '?'}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ChatRoom({ params }) {
  const { id } = use(params);
  const [room, setRoom]       = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText]       = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const router    = useRouter();

  // ── Fetch room meta + messages ──────────────────────────────────────────────
  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/chat?roomId=${id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Fetch messages error:', err);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const [roomRes, authRes] = await Promise.all([
          fetch(`/api/chat/rooms/${id}`),
          fetch('/api/auth/profile'),
        ]);
        if (roomRes.ok) { 
          const d = await roomRes.json(); 
          setRoom(d.room); 
        }
        if (authRes.ok) { 
          const d = await authRes.json(); 
          setCurrentUser(d.profile); 
        }
        await fetchMessages();
      } catch (err) {
        console.error('Init error:', err);
      } finally {
        setLoading(false);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    };
    init();
    const poll = setInterval(fetchMessages, 4000);
    return () => clearInterval(poll);
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send ────────────────────────────────────────────────────────────────────
  const sendMessage = async (msg) => {
    const content = (msg ?? text).trim();
    if (!content) return;
    setText('');

    // Optimistic UI update
    const optimisticMsg = {
      id: `opt_${Date.now()}`,
      message: content,
      sender_id: currentUser?.id,
      sender_role: currentUser?.role,
      sender_name: currentUser?.name || '我',
      created_at: new Date().toISOString(),
      is_system: false,
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: id, message: content }),
      });
      fetchMessages();
    } catch (err) {
      console.error('Send error:', err);
    }
    inputRef.current?.focus();
  };

  // ── Save Philosophy (Coach only) ──────────────────────────
  const [editingPhilosophy, setEditingPhilosophy] = useState(false);
  const [phiText, setPhiText] = useState('');

  const savePhilosophy = async () => {
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ philosophy: phiText }),
      });
      if (res.ok) {
        setRoom(prev => ({ ...prev, coach_philosophy: phiText }));
        setEditingPhilosophy(false);
        alert('教學理念已更新！');
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (room?.coach_philosophy) setPhiText(room.coach_philosophy);
  }, [room]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <p style={{ color: MUTED, fontWeight: 600 }}>連線中…</p>
    </div>
  );

  const isMeCoach = currentUser?.role === 'coach';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: BG }}>

      {/* ── Sticky Header (Role-Aware) ────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 16px',
        background: WHITE, borderBottom: '1px solid #E2E8F0',
        position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}>
        <button
          onClick={() => router.push('/chat')}
          style={{ background: 'none', border: 'none', padding: '4px 8px 4px 0', cursor: 'pointer',
            fontSize: 20, color: BLUE, lineHeight: 1 }}
        >‹</button>

        <Avatar name={room?.other_name ?? '?'} size={40} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: DARK }}>
              {room?.other_name ?? '使用者'}
            </p>
            <span style={{ 
              fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4,
              background: room?.other_is_coach ? `${BLUE}15` : '#F1F5F9',
              color: room?.other_is_coach ? BLUE : MUTED
            }}>
              {room?.other_is_coach ? '教練' : '學員'}
            </span>
          </div>
          
          {/* Room Metadata based on Role */}
          {isMeCoach ? (
            <p style={{ margin: 0, fontSize: 11, color: MUTED }}>
              年級：{room?.user_grade || '未設定'}
            </p>
          ) : (
            room?.coach_philosophy && (
              <p style={{ margin: 0, fontSize: 11, color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                「{room.coach_philosophy}」
              </p>
            )
          )}
        </div>

        {/* Coach-only: Edit Philosophy Toggle */}
        {isMeCoach && (
          <button 
            onClick={() => { setEditingPhilosophy(!editingPhilosophy); setPhiText(room?.coach_philosophy || ''); }}
            style={{ background: BG, border: 'none', borderRadius: 8, padding: '6px 10px', fontSize: 11, fontWeight: 700, color: BLUE, cursor: 'pointer' }}
          >
            {editingPhilosophy ? '取消' : '✎ 理念'}
          </button>
        )}
      </div>

      {/* ── Coach Philosophy Editor (Inline Popup) ──────────────────── */}
      {isMeCoach && editingPhilosophy && (
        <div style={{ background: '#F8FAFC', padding: 12, borderBottom: '1px solid #E2E8F0', animation: 'slideDown 0.2s' }}>
          <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 800, color: DARK }}>編輯我的教學理念</p>
          <textarea 
            value={phiText}
            onChange={e => setPhiText(e.target.value)}
            style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, marginBottom: 8 }}
            placeholder="例如：由淺入深，快樂學習..."
            rows={2}
          />
          <button 
            onClick={savePhilosophy}
            style={{ width: '100%', background: BLUE, color: WHITE, border: 'none', padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >儲存變更</button>
        </div>
      )}

      {/* ── Messages Body ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {messages.length === 0 ? (
          /* ── Empty State ──────────────────────────────────────── */
          <div style={{ margin: 'auto', textAlign: 'center', padding: '0 20px' }}>
            {room?.coach_name && (
              <div style={{
                background: WHITE, borderRadius: 20,
                boxShadow: '0 2px 16px rgba(0,0,0,0.07)',
                padding: '20px 22px', marginBottom: 24, textAlign: 'left',
                borderTop: `3px solid ${BLUE}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <Avatar name={room?.coach_name} size={44} />
                  <div>
                    <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: DARK }}>{room?.coach_name}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: MUTED }}>教練理念</p>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: 14, color: '#334155', lineHeight: 1.6, fontStyle: 'italic' }}>
                  「{room.coach_philosophy || '由我來引導你展開這段學習旅程。'}」
                </p>
              </div>
            )}

            <p style={{ fontSize: 15, fontWeight: 700, color: DARK, marginBottom: 6 }}>還沒有任何對話</p>
            <p style={{ fontSize: 13, color: MUTED, marginBottom: 20 }}>先用一個簡單問題開始對話吧 👇</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {QUICK_REPLIES.map(q => (
                <button key={q} onClick={() => sendMessage(q)} style={{
                  width: '100%', padding: '12px 20px',
                  background: WHITE, border: `1.5px solid ${BLUE}`,
                  borderRadius: 100, fontSize: 14, fontWeight: 600,
                  color: BLUE, cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = BLUE_BG}
                  onMouseLeave={e => e.currentTarget.style.background = WHITE}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* ── Bubble Messages ────────────────────────────────────── */
          messages.map((m, i) => {
            // ✅ 用 sender_id 與 currentUser.id 比對（唯一可靠方式）
            // 強制轉 String 防止 UUID vs 數字型別不一致
            const isMe = String(m.sender_id) === String(currentUser?.id);

            if (m.is_system) return (
              <div key={m.id || i} style={{ textAlign: 'center', margin: '10px 0' }}>
                <span style={{ fontSize: 11, color: '#EF4444', background: '#FEE2E2', padding: '4px 12px', borderRadius: 100 }}>
                  {m.message}
                </span>
              </div>
            );

            return (
              <div key={m.id || i} style={{ 
                display: 'flex', 
                justifyContent: isMe ? 'flex-end' : 'flex-start', 
                gap: 8, 
                alignItems: 'flex-end',
                marginBottom: 12 
              }}>
                {/* Avatar on Left (for others) */}
                {!isMe && <Avatar name={m.sender_name ?? room?.coach_name} size={32} />}

                <div style={{ maxWidth: '70%' }}>
                  {!isMe && m.sender_name && (
                    <p style={{ margin: '0 0 4px 4px', fontSize: 11, color: MUTED, fontWeight: 600 }}>
                      {m.sender_name}
                    </p>
                  )}
                  <div style={{
                    padding: '12px 14px',
                    borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: isMe ? BLUE : '#E5E7EB',
                    color: isMe ? WHITE : DARK,
                    fontSize: 14, lineHeight: 1.5,
                    boxShadow: isMe ? '0 2px 8px rgba(37,99,235,0.2)' : '0 2px 8px rgba(0,0,0,0.06)',
                  }}>
                    {m.message}
                  </div>
                  <p style={{ margin: '4px 4px 0', fontSize: 10, color: MUTED, textAlign: isMe ? 'right' : 'left' }}>
                    {formatTime(m.created_at)}
                  </p>
                </div>

                {/* Avatar on Right (for me) */}
                {isMe && <Avatar name={m.sender_name || '我'} size={32} />}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Fixed Input Bar ───────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px 14px',
        background: WHITE, borderTop: '1px solid #E2E8F0',
        position: 'sticky', bottom: 0, zIndex: 100,
      }}>
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder="輸入訊息…"
          style={{
            flex: 1, padding: '10px 16px',
            border: '1.5px solid #E2E8F0', borderRadius: 100,
            fontSize: 14, outline: 'none', background: '#F8FAFC',
            color: DARK, fontFamily: 'inherit',
            transition: 'border-color 0.15s',
          }}
          onFocus={e => e.target.style.borderColor = BLUE}
          onBlur={e => e.target.style.borderColor = '#E2E8F0'}
        />
        <button
          onClick={() => sendMessage()}
          disabled={!text.trim()}
          style={{
            width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
            background: text.trim() ? BLUE : '#CBD5E1',
            border: 'none', cursor: text.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, transition: 'background 0.15s',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
