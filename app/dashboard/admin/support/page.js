'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Loader2, Search, ArrowLeft, Send, Plus, Minus, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';

const ORANGE = 'var(--color-accent, #FF8A3D)';
const ORANGE_BG = 'rgba(245, 158, 11, 0.1)';
const BG = 'var(--color-bg, #050816)';
const CARD = 'var(--color-bg, #0F172A)'; 
const TEXT_LIGHT = 'var(--color-text, #ffffff)';
const MUTED = 'var(--color-text-muted, rgba(255,255,255,0.58))';
const INPUT_BG = 'var(--color-surface, rgba(255,255,255,0.05))';
const BORDER = 'var(--color-border, rgba(255,255,255,0.06))';
const SECONDARY_BUBBLE = 'var(--color-surface-soft, rgba(255,255,255,0.1))';

const ROLE_COLORS = {
  user: { bg: 'rgba(59,130,246,0.12)', color: '#60A5FA', text: '學員' },
  coach: { bg: 'rgba(16,185,129,0.12)', color: '#34D399', text: '教練' },
  ambassador: { bg: 'rgba(168,85,247,0.12)', color: '#C084FC', text: '推廣大使' },
  admin: { bg: 'rgba(239,68,68,0.12)', color: '#F87171', text: '管理員' },
  anonymous: { bg: 'rgba(234,179,8,0.12)', color: '#FDE047', text: '訪客(忘記密碼)' }
};

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
        color: '#fff',
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

function RoomCard({ convo, onClick }) {
  const [hovered, setHovered] = useState(false);
  const roleConfig = ROLE_COLORS[convo.role] || ROLE_COLORS.user;

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
        boxShadow: hovered ? '0 6px 16px rgba(0,0,0,0.14)' : '0 4px 10px rgba(0,0,0,0.05)',
        cursor: 'pointer',
        transition: 'background 0.15s, transform 0.1s, box-shadow 0.15s',
        transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
        border: hovered ? `1px solid rgba(255,138,61,0.22)` : `1px solid ${BORDER}`,
      }}
    >
      <Avatar name={convo.userName} size={48} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: convo.unreadCount > 0 ? 900 : 800, color: TEXT_LIGHT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {convo.userName}
          </p>
          <span style={{ flexShrink: 0, padding: '3px 7px', borderRadius: 999, background: roleConfig.bg, color: roleConfig.color, fontSize: 10, fontWeight: 850 }}>
            {roleConfig.text}
          </span>
        </div>
        <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: convo.unreadCount > 0 ? 800 : 500, color: convo.unreadCount > 0 ? TEXT_LIGHT : MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {convo.latestMessage || '無最新訊息'}
        </p>
        <p style={{ margin: '8px 0 0', fontSize: 12, lineHeight: 1.45, color: MUTED, fontFamily: 'monospace' }}>
          💰 餘額：{convo.walletBalance}
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
        {convo.unreadCount > 0 && (
          <span style={{ background: '#EF4444', color: '#FFF', borderRadius: 100, fontSize: 10, fontWeight: 900, padding: '2px 7px', minWidth: 18, textAlign: 'center' }}>
            {convo.unreadCount}
          </span>
        )}
      </div>
    </div>
  );
}

export default function AdminSupportPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [filteredConversations, setFilteredConversations] = useState([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('user'); // 'user' | 'coach' | 'anonymous'
  const [readFilter, setReadFilter] = useState('all'); // 'all' | 'unread' | 'read'
  const [anonymousConversations, setAnonymousConversations] = useState([]);
  
  const [selectedConvo, setSelectedConvo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    let filtered = conversations;

    if (activeTab === 'user') {
      filtered = conversations.filter(c => c.role === 'user');
    } else if (activeTab === 'anonymous') {
      filtered = anonymousConversations;
    } else {
      filtered = conversations.filter(c => c.role !== 'user');
    }

    if (readFilter === 'unread') {
      filtered = filtered.filter(c => c.unreadCount > 0);
    } else if (readFilter === 'read') {
      filtered = filtered.filter(c => c.unreadCount === 0);
    }

    if (search) {
      const lowerSearch = search.toLowerCase();
      filtered = filtered.filter(c => 
        (c.userName && c.userName.toLowerCase().includes(lowerSearch)) ||
        (c.userEmail && c.userEmail.toLowerCase().includes(lowerSearch))
      );
    }
    
    setFilteredConversations(filtered);
  }, [search, conversations, anonymousConversations, activeTab, readFilter]);

  useEffect(() => {
    if (selectedConvo && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, selectedConvo]);

  const loadConversations = async () => {
    try {
      const [res, anonRes] = await Promise.all([
        fetch('/api/admin/support/conversations'),
        fetch('/api/admin/support/anonymous/conversations')
      ]);

      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
      if (anonRes.ok) {
        const anonData = await anonRes.json();
        setAnonymousConversations(anonData.conversations || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const selectConversation = async (convo) => {
    setSelectedConvo(convo);
    setChatLoading(true);
    try {
      const isAnon = convo.role === 'anonymous';
      const url = isAnon 
        ? `/api/admin/support/anonymous/conversations?sessionId=${convo.sessionId}`
        : `/api/admin/support/conversations?userId=${convo.userId}`;
        
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setMessages(data.messages || []);
        if (isAnon) {
          setAnonymousConversations(prev => prev.map(c => c.sessionId === convo.sessionId ? { ...c, unreadCount: 0 } : c));
        } else {
          setConversations(prev => prev.map(c => c.userId === convo.userId ? { ...c, unreadCount: 0 } : c));
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSendReply = async () => {
    if (!reply.trim() || !selectedConvo) return;
    
    setActionLoading(true);
    const isAnon = selectedConvo.role === 'anonymous';
    const url = isAnon ? '/api/admin/support/anonymous/send' : '/api/admin/support/send';
    const bodyPayload = isAnon 
      ? { session_id: selectedConvo.sessionId, content: reply }
      : { userId: selectedConvo.userId, message: reply };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });
      const data = await res.json();
      if (res.ok) {
        setMessages(prev => [...prev, data.message]);
        setReply('');
      } else {
        alert(data.error || '發送失敗');
      }
    } catch (error) {
      alert('發送失敗');
    } finally {
      setActionLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleGrantPoints = async () => {
    if (!selectedConvo) return;
    const amountStr = window.prompt(`請輸入要發放給 ${selectedConvo.userName} 的點數 (正整數)：`);
    if (!amountStr) return;
    const amount = parseInt(amountStr, 10);
    if (isNaN(amount) || amount <= 0) {
      return alert('請輸入大於 0 的正整數');
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/support/grant-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedConvo.userId, amount, note: '由管理員客服手動發放' })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`發放成功！目前餘額：${data.newBalance}`);
        setSelectedConvo(prev => ({ ...prev, walletBalance: data.newBalance }));
        setConversations(prev => prev.map(c => c.userId === selectedConvo.userId ? { ...c, walletBalance: data.newBalance } : c));
      } else {
        alert(data.error || '發放失敗');
      }
    } catch (error) {
      alert('發放失敗');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeductPoints = async () => {
    if (!selectedConvo) return;
    const amountStr = window.prompt(`請輸入要從 ${selectedConvo.userName} 扣除的點數 (正整數)：`);
    if (!amountStr) return;
    const amount = parseInt(amountStr, 10);
    if (isNaN(amount) || amount <= 0) {
      return alert('請輸入大於 0 的正整數');
    }

    if (selectedConvo.walletBalance < amount) {
      const confirm = window.confirm(`警告：該用戶餘額 (${selectedConvo.walletBalance}) 不足 ${amount}，確定要強行扣除嗎？(可能會失敗)`);
      if (!confirm) return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/support/deduct-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedConvo.userId, amount, note: '由管理員客服手動扣款提領' })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`扣款成功！目前餘額：${data.newBalance}`);
        setSelectedConvo(prev => ({ ...prev, walletBalance: data.newBalance }));
        setConversations(prev => prev.map(c => c.userId === selectedConvo.userId ? { ...c, walletBalance: data.newBalance } : c));
      } else {
        alert(data.error || '扣款失敗');
      }
    } catch (error) {
      alert('扣款失敗');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdminForceReset = async () => {
    const targetUsername = window.prompt('請輸入要重設密碼的「帳號」：');
    if (!targetUsername) return;
    const tempPassword = window.prompt(`請輸入要為 ${targetUsername} 設定的「臨時密碼」(至少6碼)：`);
    if (!tempPassword || tempPassword.length < 6) return alert('臨時密碼無效，必須至少 6 碼');

    setResetLoading(true);
    try {
      const res = await fetch('/api/admin/users/force-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUsername, tempPassword })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        setReply(`您的密碼已由管理員重設，請使用臨時密碼 ${tempPassword} 登入，登入後系統將引導您強制修改密碼。`);
      } else {
        alert(data.error || '重設失敗');
      }
    } catch (error) {
      alert('重設失敗，請稍後再試');
    } finally {
      setResetLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '70vh', background: BG }}>
        <p style={{ color: ORANGE, fontSize: 15, fontWeight: 800 }}>載入收件夾中...</p>
      </div>
    );
  }

  // --- LIST VIEW ---
  if (!selectedConvo) {
    return (
      <div style={{ background: BG, minHeight: '100dvh', paddingBottom: 'calc(80px + env(safe-area-inset-bottom))', color: TEXT_LIGHT, position: 'relative', overflowX: 'hidden' }}>
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
          <div style={{ padding: '20px 16px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <ShieldCheck size={18} color={ORANGE} />
              <p style={{ margin: 0, color: MUTED, fontSize: 12, fontWeight: 760 }}>Admin Inbox</p>
            </div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: TEXT_LIGHT }}>客服與金流收件夾</h1>
            <p style={{ margin: '7px 0 0', color: MUTED, fontSize: 13, lineHeight: 1.55 }}>
              統一處理所有學員儲值、教練與推廣大使提領，並回覆問題。
            </p>
          </div>

          <div style={{ padding: '0 16px 16px' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button
                onClick={() => setActiveTab('user')}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 800,
                  background: activeTab === 'user' ? 'rgba(255,138,61,0.14)' : 'rgba(255,255,255,0.04)',
                  color: activeTab === 'user' ? ORANGE : MUTED,
                  border: `1px solid ${activeTab === 'user' ? 'rgba(255,138,61,0.42)' : BORDER}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                學員端
              </button>
              <button
                onClick={() => setActiveTab('coach')}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 800,
                  background: activeTab === 'coach' ? 'rgba(255,138,61,0.14)' : 'rgba(255,255,255,0.04)',
                  color: activeTab === 'coach' ? ORANGE : MUTED,
                  border: `1px solid ${activeTab === 'coach' ? 'rgba(255,138,61,0.42)' : BORDER}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                教練與大使端
              </button>
              <button
                onClick={() => setActiveTab('anonymous')}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 800,
                  background: activeTab === 'anonymous' ? 'rgba(234,179,8,0.14)' : 'rgba(255,255,255,0.04)',
                  color: activeTab === 'anonymous' ? '#FDE047' : MUTED,
                  border: `1px solid ${activeTab === 'anonymous' ? 'rgba(234,179,8,0.42)' : BORDER}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                訪客求助 (忘記密碼)
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button
                onClick={() => setReadFilter('all')}
                style={{
                  flex: 1,
                  padding: '6px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  background: readFilter === 'all' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.02)',
                  color: readFilter === 'all' ? TEXT_LIGHT : MUTED,
                  border: `1px solid ${readFilter === 'all' ? 'rgba(255,255,255,0.2)' : BORDER}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                全部
              </button>
              <button
                onClick={() => setReadFilter('unread')}
                style={{
                  flex: 1,
                  padding: '6px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  background: readFilter === 'unread' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.02)',
                  color: readFilter === 'unread' ? '#F87171' : MUTED,
                  border: `1px solid ${readFilter === 'unread' ? 'rgba(239,68,68,0.3)' : BORDER}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                待回覆 (未讀)
              </button>
              <button
                onClick={() => setReadFilter('read')}
                style={{
                  flex: 1,
                  padding: '6px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  background: readFilter === 'read' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.02)',
                  color: readFilter === 'read' ? TEXT_LIGHT : MUTED,
                  border: `1px solid ${readFilter === 'read' ? 'rgba(255,255,255,0.2)' : BORDER}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                已回覆 (已讀)
              </button>
            </div>

            <div style={{ position: 'relative' }}>
              <Search style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: MUTED }} size={16} />
              <input
                type="text"
                placeholder="搜尋姓名或 Email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 40px',
                  background: INPUT_BG,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 12,
                  fontSize: 14,
                  color: TEXT_LIGHT,
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {filteredConversations.length === 0 ? (
            <div style={{ padding: '32px 24px', textAlign: 'center', marginTop: 20 }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>📭</div>
              <p style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: TEXT_LIGHT }}>目前還沒有客服紀錄</p>
            </div>
          ) : (
            <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredConversations.map((convo) => (
                <RoomCard key={convo.userId} convo={convo} onClick={() => selectConversation(convo)} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- CHAT VIEW ---
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: BG, color: TEXT_LIGHT, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 16px',
          background: 'var(--color-surface)',
          borderBottom: `1px solid ${BORDER}`,
          position: 'sticky',
          top: 0,
          boxShadow: 'var(--shadow-sm, 0 4px 10px rgba(0,0,0,0.05))',
        }}
      >
        <button
          onClick={() => setSelectedConvo(null)}
          style={{
            background: 'none',
            border: 'none',
            padding: '4px 8px 4px 0',
            cursor: 'pointer',
            color: ORANGE,
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <ArrowLeft size={22} />
        </button>

        <Avatar name={selectedConvo.userName} size={40} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: TEXT_LIGHT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {selectedConvo.userName}
            </p>
          </div>
          <p style={{ margin: 0, fontSize: 11, color: MUTED, fontFamily: 'monospace' }}>
            {selectedConvo.userEmail}
          </p>
        </div>
      </div>

      {/* Finance Actions Card */}
      <section style={{ margin: '14px 14px 0', padding: '14px', borderRadius: 16, background: 'rgba(11,18,32,0.88)', border: `1px solid ${BORDER}`, boxShadow: '0 6px 16px rgba(0,0,0,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, color: MUTED, fontWeight: 650 }}>用戶餘額</p>
          <h2 style={{ margin: '2px 0 0', fontSize: 22, fontWeight: 900, color: '#34D399', fontFamily: 'monospace' }}>
            {selectedConvo.walletBalance}
          </h2>
        </div>
        {selectedConvo.role !== 'anonymous' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleGrantPoints}
              disabled={actionLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: 'rgba(16,185,129,0.12)',
                color: '#34D399',
                border: '1px solid rgba(16,185,129,0.2)',
                padding: '8px 12px',
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              <Plus size={14} /> 儲值
            </button>
            <button
              onClick={handleDeductPoints}
              disabled={actionLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: 'rgba(239,68,68,0.12)',
                color: '#F87171',
                border: '1px solid rgba(239,68,68,0.2)',
                padding: '8px 12px',
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              <Minus size={14} /> 提領
            </button>
          </div>
        )}
        {selectedConvo.role === 'anonymous' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleAdminForceReset}
              disabled={resetLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#F87171',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                padding: '8px 12px',
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 800,
                cursor: resetLoading ? 'not-allowed' : 'pointer'
              }}
            >
              {resetLoading ? <Loader2 size={14} className="spinner" /> : <ShieldCheck size={14} />} 
              強制重設密碼
            </button>
          </div>
        )}
      </section>

      {/* Messages */}
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
        {chatLoading ? (
          <div style={{ margin: 'auto', display: 'flex', alignItems: 'center', gap: 8, color: MUTED }}>
            <Loader2 size={16} className="animate-spin" />
            <span style={{ fontSize: 13, fontWeight: 600 }}>載入訊息中...</span>
          </div>
        ) : messages.length === 0 ? (
          <div style={{ margin: 'auto', textAlign: 'center', color: MUTED }}>
            <p style={{ fontSize: 14, fontWeight: 700 }}>目前尚無對話紀錄</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isMe = message.isFromAdmin || message.isSystem;

            if (message.isSystem) {
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
                {!isMe && <Avatar name={selectedConvo.userName} size={32} />}

                <div style={{ maxWidth: '75%' }}>
                  {!isMe && (
                    <p style={{ margin: '0 0 4px 4px', fontSize: 11, color: MUTED, fontWeight: 600 }}>
                      {selectedConvo.userName}
                    </p>
                  )}
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: 18,
                      background: isMe ? 'linear-gradient(135deg, rgba(255,138,61,0.9), #F97316)' : SECONDARY_BUBBLE,
                      color: isMe ? 'var(--text-light)' : 'var(--color-text)',
                      fontSize: 14,
                      lineHeight: 1.5,
                      borderTopRightRadius: isMe ? 4 : 18,
                      borderTopLeftRadius: isMe ? 18 : 4,
                      boxShadow: isMe ? `0 4px 12px rgba(249, 115, 22, 0.3)` : '0 4px 12px rgba(0,0,0,0.12)',
                      border: isMe ? 'none' : '1px solid var(--color-border)',
                      wordBreak: 'break-word',
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {message.message}
                    
                    {message.imagePath && (() => {
                      const src = message.imagePath.startsWith('http') || message.imagePath.startsWith('/uploads/')
                        ? message.imagePath
                        : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/support_images/${message.imagePath}`;
                      return (
                        <div style={{ marginTop: 8 }}>
                          <a href={src} target="_blank" rel="noopener noreferrer">
                            <img src={src} alt="上傳截圖" style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', maxHeight: 200, objectFit: 'cover' }} />
                          </a>
                        </div>
                      );
                    })()}
                    {message.imageUrl && (
                      <div style={{ marginTop: 8 }}>
                        <a href={message.imageUrl} target="_blank" rel="noopener noreferrer">
                          <img src={message.imageUrl} alt="外部圖片" style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', maxHeight: 200, objectFit: 'cover' }} />
                        </a>
                      </div>
                    )}
                  </div>
                  <p style={{ margin: '4px 4px 0', fontSize: 9, color: 'rgba(255,255,255,0.32)', textAlign: isMe ? 'right' : 'left' }}>
                    {formatTime(message.createdAt)}
                  </p>
                </div>

                {isMe && <Avatar name="管" size={32} />}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
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
          value={reply}
          onChange={(event) => setReply(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              handleSendReply();
            }
          }}
          placeholder="回覆用戶..."
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
          onClick={handleSendReply}
          disabled={actionLoading || !reply.trim()}
          style={{
            width: 42,
            height: 42,
            borderRadius: '50%',
            flexShrink: 0,
            background: reply.trim() ? ORANGE : INPUT_BG,
            border: 'none',
            cursor: reply.trim() && !actionLoading ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            boxShadow: reply.trim() ? `0 4px 12px rgba(249, 115, 22, 0.4)` : 'none'
          }}
        >
          {actionLoading ? (
            <Loader2 size={18} className="animate-spin" color="var(--text-light)" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13" stroke={reply.trim() ? 'var(--text-light)' : MUTED} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke={reply.trim() ? 'var(--text-light)' : MUTED} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
