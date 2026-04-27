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
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { user } = useAuth();
  const isCoach = user?.role === 'coach';

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const r = await fetch('/api/chat/rooms', { cache: 'no-store' });
        if (r.ok) {
          const d = await r.json();
          if (d.rooms) setRooms(d.rooms);
        }
      } catch (e) {
        // ignore
      }
    };
    
    fetchRooms().finally(() => setLoading(false));
    
    // Polling every 4 seconds for real-time updates
    const pollId = setInterval(fetchRooms, 4000);
    return () => clearInterval(pollId);
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
