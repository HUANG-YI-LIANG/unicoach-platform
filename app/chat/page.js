'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

// ── Palette ───────────────────────────────────────────────────────────────────
const BLUE   = '#2563EB';
const BG     = '#F1F5F9';
const CARD   = '#FFFFFF';
const BORDER = '#F1F5F9';
const MUTED  = '#94A3B8';
const DARK   = '#0F172A';
const SHADOW = '0 2px 16px rgba(0,0,0,0.06)';

// ── Mock data ─────────────────────────────────────────────────────────────────
const MOCK_PHILOSOPHIES = [
  { coach_name: '王牌教練', philosophy: '有教無類，穩定進步。' },
  { coach_name: '技術大師', philosophy: '細節決定成敗，重複造就卓越。' },
  { coach_name: '體能顧問', philosophy: '身體是最好的投資。' },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}分鐘前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}小時前`;
  return `${Math.floor(h / 24)}天前`;
}

function Avatar({ name, size = 46 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `linear-gradient(135deg, ${BLUE}, #60A5FA)`,
      color: '#fff', display:'flex', alignItems:'center', justifyContent:'center',
      fontSize: Math.round(size * 0.38), fontWeight: 900,
    }}>
      {name?.charAt(0) ?? '?'}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ChatPage() {
  const [rooms, setRooms] = useState([]);
  const [philosophies, setPhilosophies] = useState(MOCK_PHILOSOPHIES);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { user } = useAuth();
  const isCoach = user?.role === 'coach';

  useEffect(() => {
    fetch('/api/chat/rooms')
      .then(r => r.json())
      .then(d => {
        if (d.rooms) setRooms(d.rooms);
        // Extract philosophies from room data for the story bar
        const ph = d.rooms
          ?.filter(r => r.coach_philosophy)
          .map(r => ({ coach_name: r.other_party_name, philosophy: r.coach_philosophy }));
        if (ph && ph.length > 0) setPhilosophies(ph);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'70vh' }}>
      <p style={{ color: MUTED, fontSize: 15, fontWeight: 600 }}>載入中…</p>
    </div>
  );

  return (
    <div style={{ background: BG, minHeight:'100vh', paddingBottom: 100 }}>

      {/* ── Page Title ─────────────────────────────────────────────── */}
      <div style={{ padding: '20px 16px 12px' }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: DARK }}>我的對話</h1>
      </div>

      {/* ── Philosophy Story Bar ───────────────────────────────────── */}
      <div style={{ padding: '0 16px 16px' }}>
        <p style={{ margin:'0 0 10px', fontSize:11, fontWeight:700, color:MUTED, textTransform:'uppercase', letterSpacing:'0.1em' }}>教練理念</p>
        <div style={{ display:'flex', gap:12, overflowX:'auto', paddingBottom:4, scrollbarWidth:'none' }}>
          {philosophies.map((p, i) => (
            <div key={i} style={{
              minWidth: 130, flexShrink: 0,
              background: CARD, borderRadius: 16, boxShadow: SHADOW,
              padding: '14px 14px 12px', cursor:'pointer',
              borderTop: `3px solid ${BLUE}`,
              transition:'transform 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.transform='translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}
            >
              <Avatar name={p.coach_name} size={36} />
              <p style={{ margin:'8px 0 4px', fontSize:12, fontWeight:800, color:DARK }}>{p.coach_name}</p>
              <p style={{ margin:0, fontSize:11, color:'#475569', lineHeight:1.5, fontStyle:'italic' }}>
                「{p.philosophy?.substring(0, 30)}{p.philosophy?.length > 30 ? '…' : ''}」
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Chat List / Empty State ────────────────────────────────── */}
      {rooms.length === 0 ? (
        /* Empty State */
        <div style={{ padding:'32px 24px', textAlign:'center', marginTop:20 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>💬</div>
          <p style={{ margin:'0 0 8px', fontSize:18, fontWeight:800, color:DARK }}>還沒有任何對話</p>
          <p style={{ margin:'0 0 24px', fontSize:14, color:MUTED }}>
            {isCoach ? '完善教練資料後學員就能找到你' : '先找一位教練開始聊聊吧！'}
          </p>
          {isCoach ? (
            <button
              onClick={() => router.push('/dashboard/coach')}
              style={{
                padding:'14px 36px', background: BLUE, color:'#fff', border:'none',
                borderRadius:16, fontSize:15, fontWeight:800, cursor:'pointer',
                boxShadow:'0 8px 20px rgba(37,99,235,0.3)',
              }}
            >完善個人資料 →</button>
          ) : (
            <button
              onClick={() => router.push('/coaches')}
              style={{
                padding:'14px 36px', background: BLUE, color:'#fff', border:'none',
                borderRadius:16, fontSize:15, fontWeight:800, cursor:'pointer',
                boxShadow:'0 8px 20px rgba(37,99,235,0.3)',
              }}
            >去找教練 →</button>
          )}
        </div>
      ) : (
        /* Room List */
        <div style={{ padding:'0 16px', display:'flex', flexDirection:'column', gap:10 }}>
          {rooms.map(room => (
            <RoomCard key={room.id} room={room} onClick={() => {
              router.push(`/chat/${room.id}`);
            }} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Room Card ─────────────────────────────────────────────────────────────────
function RoomCard({ room, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:'flex', alignItems:'center', gap:14,
        background: hovered ? '#F8FAFC' : CARD,
        borderRadius:16, padding:'14px 16px',
        boxShadow: SHADOW, cursor:'pointer',
        transition:'background 0.15s, transform 0.1s',
        transform: hovered ? 'scale(1.01)' : 'scale(1)',
        border: `1px solid ${BORDER}`,
      }}
    >
      <Avatar name={room.other_party_name} size={48} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin:0, fontSize:15, fontWeight:800, color:DARK }}>{room.other_party_name}</p>
        <p style={{ margin:'3px 0 0', fontSize:13, color:MUTED, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {room.last_message ?? '點擊進入聊天室'}
        </p>
      </div>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6, flexShrink:0 }}>
        <span style={{ fontSize:11, color:MUTED }}>{timeAgo(room.created_at)}</span>
        {room.unread_count > 0 && (
          <span style={{
            background:'#EF4444', color:'#fff', borderRadius:100,
            fontSize:10, fontWeight:900, padding:'2px 7px', minWidth:18, textAlign:'center',
          }}>{room.unread_count}</span>
        )}
      </div>
    </div>
  );
}
