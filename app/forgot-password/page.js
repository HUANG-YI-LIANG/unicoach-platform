"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, MessageSquarePlus, KeyRound, Send, Loader2, AlertCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [mode, setMode] = useState("menu"); // 'menu', 'enter_pin', 'chat'
  const [pin, setPin] = useState("");
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessionStatus, setSessionStatus] = useState("open");
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (mode === "chat") {
      scrollToBottom();
    }
  }, [messages, mode]);

  const handleStartNewRequest = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/support/anonymous/create", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setPin(data.pin_code);
        setMode("chat");
        fetchMessages(data.pin_code);
      } else {
        setError(data.error || "無法建立請求，請稍後再試。");
      }
    } catch (err) {
      setError("連線失敗，請檢查網路狀態。");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (currentPin) => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/support/anonymous/messages?pin=${currentPin}`);
      const data = await res.json();
      if (res.ok) {
        setMessages(data.messages);
        setSessionStatus(data.session.status);
        if (mode !== "chat") setMode("chat");
      } else {
        setError(data.error || "無法讀取訊息");
      }
    } catch (err) {
      setError("連線失敗");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnterPin = (e) => {
    e.preventDefault();
    if (pin.length !== 6) {
      setError("請輸入 6 位數密碼");
      return;
    }
    fetchMessages(pin);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sessionStatus === 'resolved') return;

    const optimisticMessage = { id: Date.now(), sender: 'user', content: newMessage, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage("");

    try {
      const res = await fetch("/api/support/anonymous/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, content: optimisticMessage.content })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "發送失敗");
        setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id)); // rollback
      }
    } catch (err) {
      setError("連線失敗");
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id)); // rollback
    }
  };

  const renderMenu = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <button 
        onClick={handleStartNewRequest}
        disabled={isLoading}
        style={{
          display: 'flex', alignItems: 'center', gap: '12px', padding: '20px',
          background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)',
          borderRadius: '16px', color: 'var(--text-light)', cursor: 'pointer', textAlign: 'left',
          transition: 'all 0.2s'
        }}
        onMouseOver={e => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)'}
        onMouseOut={e => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)'}
      >
        <div style={{ background: 'var(--color-primary)', padding: '12px', borderRadius: '12px' }}>
          {isLoading ? <Loader2 className="animate-spin" /> : <MessageSquarePlus />}
        </div>
        <div>
          <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 800 }}>發起新的救援請求</h3>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted)' }}>忘記密碼？建立一個專屬客服對話框</p>
        </div>
      </button>

      <button 
        onClick={() => { setMode("enter_pin"); setError(""); }}
        style={{
          display: 'flex', alignItems: 'center', gap: '12px', padding: '20px',
          background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px', color: 'var(--text-light)', cursor: 'pointer', textAlign: 'left',
          transition: 'all 0.2s'
        }}
        onMouseOver={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
        onMouseOut={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
      >
        <div style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '12px', borderRadius: '12px' }}>
          <KeyRound />
        </div>
        <div>
          <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 800 }}>輸入密碼查詢回覆</h3>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted)' }}>輸入 6 位數密碼以查看管理員回覆</p>
        </div>
      </button>
    </div>
  );

  const renderEnterPin = () => (
    <form onSubmit={handleEnterPin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '8px' }}>
          對話密碼 (PIN)
        </label>
        <input
          type="text"
          placeholder="請輸入 6 位數密碼"
          value={pin}
          onChange={(e) => { setPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6)); setError(""); }}
          style={{
            width: '100%', padding: '16px', textAlign: 'center', letterSpacing: '4px',
            background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px', color: 'var(--text-light)', fontSize: '24px', fontWeight: 900, outline: 'none'
          }}
          required
        />
      </div>
      <button
        type="submit"
        disabled={isLoading || pin.length !== 6}
        style={{
          width: '100%', padding: '14px', background: 'var(--color-primary)', color: 'white',
          border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '15px',
          cursor: (isLoading || pin.length !== 6) ? 'not-allowed' : 'pointer', opacity: (isLoading || pin.length !== 6) ? 0.7 : 1
        }}
      >
        {isLoading ? "查詢中..." : "進入聊天室"}
      </button>
      <button type="button" onClick={() => { setMode("menu"); setPin(""); setError(""); }} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '14px', marginTop: '8px' }}>
        取消並返回
      </button>
    </form>
  );

  const renderChat = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '60vh', maxHeight: '600px' }}>
      <div style={{ 
        background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', 
        padding: '12px', borderRadius: '12px', marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' 
      }}>
        <AlertCircle color="#EAB308" size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <h4 style={{ color: '#FDE047', margin: '0 0 4px', fontSize: '14px', fontWeight: 800 }}>請務必記下您的對話密碼</h4>
          <p style={{ color: '#FEF08A', margin: 0, fontSize: '13px', lineHeight: 1.5 }}>
            密碼：<strong style={{ fontSize: '18px', letterSpacing: '2px', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>{pin}</strong><br/>
            關閉網頁後，您必須輸入此密碼才能再次查看管理員的回覆。
          </p>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px', marginBottom: '16px' }}>
        {messages.map(msg => (
          <div key={msg.id} style={{
            alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '85%', padding: '12px 16px', borderRadius: '16px',
            background: msg.sender === 'user' ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)',
            border: msg.sender === 'user' ? 'none' : '1px solid rgba(255,255,255,0.1)',
            color: 'var(--text-light)', fontSize: '14px', lineHeight: 1.5,
            borderBottomRightRadius: msg.sender === 'user' ? '4px' : '16px',
            borderBottomLeftRadius: msg.sender === 'user' ? '16px' : '4px',
            whiteSpace: 'pre-wrap'
          }}>
            {msg.content}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {sessionStatus === 'resolved' ? (
        <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', color: 'var(--color-text-muted)', fontSize: '13px' }}>
          此對話已結案。如果您已取得臨時密碼，請返回登入頁面登入。
        </div>
      ) : (
        <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="請輸入您的帳號名稱..."
            style={{
              flex: 1, padding: '14px 16px', borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)',
              color: 'var(--text-light)', outline: 'none'
            }}
          />
          <button type="submit" disabled={!newMessage.trim()} style={{
            background: 'var(--color-primary)', border: 'none', borderRadius: '12px',
            padding: '0 20px', color: 'white', cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
            opacity: newMessage.trim() ? 1 : 0.5
          }}>
            <Send size={20} />
          </button>
        </form>
      )}
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '20px',
      background: 'var(--color-bg)'
    }}>
      <div style={{
        width: '100%', maxWidth: mode === 'chat' ? '500px' : '400px',
        background: 'var(--color-surface)',
        padding: '32px 24px', borderRadius: '24px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        border: '1px solid rgba(255,255,255,0.05)',
        transition: 'all 0.3s'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-light)', margin: '0 0 8px' }}>
            {mode === 'chat' ? '客服聊天室' : '忘記密碼'}
          </h1>
          {mode === 'menu' && (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', margin: 0, lineHeight: 1.5 }}>
              為保障帳號安全，請聯絡管理員為您核發臨時密碼。
            </p>
          )}
        </div>

        {error && (
          <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', borderRadius: '8px', fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {mode === "menu" && renderMenu()}
        {mode === "enter_pin" && renderEnterPin()}
        {mode === "chat" && renderChat()}

        {mode !== "chat" && (
          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <Link href="/login" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
              <ArrowLeft size={16} /> 返回登入
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
