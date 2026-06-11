'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { MessageCircle, Send, Plus, Minus, Search, User, Loader2, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';

const ROLE_COLORS = {
  user: { bg: 'rgba(59,130,246,0.1)', color: '#60A5FA', text: '學員' },
  coach: { bg: 'rgba(16,185,129,0.1)', color: '#34D399', text: '教練' },
  ambassador: { bg: 'rgba(168,85,247,0.1)', color: '#C084FC', text: '推廣大使' },
  admin: { bg: 'rgba(239,68,68,0.1)', color: '#F87171', text: '管理員' }
};

export default function AdminSupportPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [filteredConversations, setFilteredConversations] = useState([]);
  const [search, setSearch] = useState('');
  
  const [selectedConvo, setSelectedConvo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (!search) {
      setFilteredConversations(conversations);
    } else {
      const lowerSearch = search.toLowerCase();
      setFilteredConversations(conversations.filter(c => 
        (c.userName && c.userName.toLowerCase().includes(lowerSearch)) ||
        (c.userEmail && c.userEmail.toLowerCase().includes(lowerSearch))
      ));
    }
  }, [search, conversations]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const loadConversations = async () => {
    try {
      const res = await fetch('/api/admin/support/conversations');
      const data = await res.json();
      if (res.ok) {
        setConversations(data.conversations || []);
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
      const res = await fetch(`/api/admin/support/conversations?userId=${convo.userId}`);
      const data = await res.json();
      if (res.ok) {
        setMessages(data.messages || []);
        setConversations(prev => prev.map(c => c.userId === convo.userId ? { ...c, unreadCount: 0 } : c));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!reply.trim() || !selectedConvo) return;
    
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/support/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedConvo.userId, message: reply })
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

  if (loading) return <div className="p-8 text-slate-400">載入中...</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden">
      <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 shrink-0">
        <div>
          <h1 className="text-2xl font-black tracking-wide text-white">客服與金流收件夾</h1>
          <p className="text-sm text-slate-400 mt-1">統一處理所有學員儲值、教練與推廣大使提領，並回覆問題。</p>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-80 border-r border-slate-800 flex flex-col bg-slate-950">
          <div className="p-4 border-b border-slate-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                type="text"
                placeholder="搜尋姓名或 Email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm focus:outline-none focus:border-brand-orange text-white placeholder-slate-500"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">沒有符合的對話紀錄</div>
            ) : (
              filteredConversations.map(c => {
                const roleConfig = ROLE_COLORS[c.role] || ROLE_COLORS.user;
                return (
                  <button
                    key={c.userId}
                    onClick={() => selectConversation(c)}
                    className={`w-full text-left p-4 border-b border-slate-800/50 hover:bg-slate-900/80 transition-colors ${selectedConvo?.userId === c.userId ? 'bg-slate-900 border-l-4 border-l-brand-orange' : 'border-l-4 border-l-transparent'}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="font-bold text-slate-200 truncate">{c.userName}</div>
                      {c.unreadCount > 0 && (
                        <div className="bg-brand-orange text-black text-[10px] font-black px-2 py-0.5 rounded-full shrink-0">
                          {c.unreadCount} 新訊息
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: roleConfig.bg, color: roleConfig.color }}>
                        {roleConfig.text}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">餘額: {c.walletBalance}</span>
                    </div>
                    <div className="text-xs text-slate-400 truncate w-full">{c.latestMessage}</div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Right Chat Area */}
        <div className="flex-1 flex flex-col bg-slate-900">
          {selectedConvo ? (
            <>
              {/* Chat Header */}
              <div className="h-16 border-b border-slate-800 bg-slate-950 flex justify-between items-center px-6 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-slate-400">
                    <User size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white leading-tight">{selectedConvo.userName}</h3>
                    <div className="text-xs text-slate-400 flex items-center gap-2">
                      <span>{selectedConvo.userEmail}</span>
                      <span>•</span>
                      <span className="font-mono text-brand-orange">💰 餘額：{selectedConvo.walletBalance}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={handleGrantPoints}
                    disabled={actionLoading}
                    className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                  >
                    <Plus size={16} /> 儲值發放
                  </button>
                  <button
                    onClick={handleDeductPoints}
                    disabled={actionLoading}
                    className="flex items-center gap-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 px-4 py-2 rounded-lg text-sm font-bold hover:bg-rose-500/20 transition-colors disabled:opacity-50"
                  >
                    <Minus size={16} /> 提領扣除
                  </button>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {chatLoading ? (
                  <div className="flex justify-center items-center h-full text-slate-500">
                    <Loader2 size={24} className="animate-spin" />
                  </div>
                ) : (
                  <>
                    {messages.length === 0 && (
                      <div className="text-center text-slate-500 text-sm py-10">目前尚無對話紀錄</div>
                    )}
                    {messages.map(msg => (
                      <div key={msg.id} className={`flex flex-col ${msg.isFromAdmin || msg.isSystem ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[70%] rounded-2xl px-4 py-3 ${msg.isFromAdmin || msg.isSystem ? 'bg-brand-orange text-black rounded-tr-sm' : 'bg-slate-800 text-white border border-slate-700 rounded-tl-sm'}`}>
                          {msg.message && <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.message}</p>}
                          {msg.imagePath && (
                            <div className="mt-2">
                              <a href={`/uploads/${msg.imagePath}`} target="_blank" rel="noopener noreferrer">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={`/uploads/${msg.imagePath}`} alt="上傳截圖" className="max-w-full rounded-lg border border-white/10 max-h-64 object-cover" />
                              </a>
                            </div>
                          )}
                          {msg.imageUrl && (
                            <div className="mt-2">
                              <a href={msg.imageUrl} target="_blank" rel="noopener noreferrer">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={msg.imageUrl} alt="外部圖片" className="max-w-full rounded-lg border border-white/10 max-h-64 object-cover" />
                              </a>
                            </div>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1 px-1">
                          {format(new Date(msg.createdAt), 'MM/dd HH:mm')} {msg.isSystem ? '• 系統' : ''}
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Chat Input */}
              <div className="p-4 bg-slate-950 border-t border-slate-800 shrink-0">
                <form onSubmit={handleSendReply} className="flex gap-3">
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="輸入回覆訊息給用戶..."
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-orange resize-none h-[60px]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply(e);
                      }
                    }}
                  />
                  <button
                    type="submit"
                    disabled={actionLoading || !reply.trim()}
                    className="w-[60px] h-[60px] flex items-center justify-center bg-brand-orange text-black rounded-xl hover:bg-[#FF9B5A] transition-colors disabled:opacity-50"
                  >
                    {actionLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <MessageCircle size={48} className="mb-4 opacity-50" />
              <p>點擊左側列表開始處理客服與金流</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
