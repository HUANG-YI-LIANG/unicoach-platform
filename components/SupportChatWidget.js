'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { MessageCircle, Send, UploadCloud, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

const MAX_SUPPORT_IMAGE_BYTES = 5 * 1024 * 1024;
const SUPPORT_HIDDEN_ROUTES = [
  '/login',
  '/register',
  '/reset-password',
  '/onboarding',
  '/welcome',
  '/role-select',
  '/first-entry',
  '/match',
];

const isHiddenRoute = (pathname) => (
  SUPPORT_HIDDEN_ROUTES.some((route) => pathname === route || pathname?.startsWith(`${route}/`))
);

function normalizeMessages(payload) {
  if (!payload || !Array.isArray(payload.messages)) return [];
  return payload.messages;
}

export default function SupportChatWidget() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const fileInputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const hidden = loading || !user || isHiddenRoute(pathname);

  useEffect(() => {
    if (!open || hidden || loaded) return;

    let cancelled = false;
    async function loadHistory() {
      setBusy(true);
      setStatus(null);
      try {
        const res = await fetch('/api/support/history');
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || '客服紀錄讀取失敗');
        if (!cancelled) {
          setMessages(normalizeMessages(data));
          setLoaded(true);
        }
      } catch (error) {
        if (!cancelled) setStatus({ type: 'error', text: error.message || '客服紀錄讀取失敗' });
      } finally {
        if (!cancelled) setBusy(false);
      }
    }

    loadHistory();
    return () => { cancelled = true; };
  }, [open, hidden, loaded]);

  if (hidden) return null;
  if (!user) return null;

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setStatus({ type: 'error', text: '請上傳 PNG、JPG 或 WebP 圖片' });
      event.target.value = '';
      return;
    }

    if (file.size > MAX_SUPPORT_IMAGE_BYTES) {
      setStatus({ type: 'error', text: '截圖檔案不可超過 5MB' });
      event.target.value = '';
      return;
    }

    setSelectedFile(file);
    setStatus({ type: 'info', text: `已選擇截圖：${file.name}` });
  };

  const uploadSupportImage = async () => {
    if (!selectedFile) return null;

    const formData = new FormData();
    formData.append('file', selectedFile);

    const res = await fetch('/api/support/upload', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || '截圖上傳失敗');
    return data.imagePath;
  };

  const handleSend = async (event) => {
    event.preventDefault();
    const trimmedMessage = message.replace(/\s+/g, ' ').trim();
    if (!trimmedMessage && !selectedFile) {
      setStatus({ type: 'error', text: '請輸入訊息或上傳截圖' });
      return;
    }

    setBusy(true);
    setStatus(null);
    try {
      const imagePath = await uploadSupportImage();
      const res = await fetch('/api/support/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmedMessage || '已上傳匯款截圖', imagePath }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || '客服訊息送出失敗');

      if (data.message) setMessages((current) => [...current, data.message]);
      setMessage('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setStatus({ type: 'success', text: '已送出，客服確認後會回覆您' });
      setLoaded(true);
    } catch (error) {
      setStatus({ type: 'error', text: error.message || '客服訊息送出失敗' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          aria-label="開啟客服"
          onClick={() => setOpen(true)}
          style={{
            position: 'fixed', right: 18, bottom: 92, zIndex: 80,
            width: 56, height: 56, borderRadius: 999, border: 0,
            background: '#FF8A3D', color: '#050816', boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
          }}
        >
          <MessageCircle size={26} />
        </button>
      )}

      {open && (
        <aside
          aria-label="客服中心"
          style={{
            position: 'fixed', left: '50%', bottom: 86, transform: 'translateX(-50%)', zIndex: 90,
            width: 'min(420px, calc(100vw - 24px))', maxHeight: '72vh',
            background: '#0B1220', color: '#fff', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 24, boxShadow: '0 24px 70px rgba(0,0,0,0.45)', overflow: 'hidden',
            display: 'flex', flexDirection: 'column'
          }}
        >
          <div style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>客服中心</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94A3B8' }}>
                {user?.role === 'coach' ? '可上傳存摺封面與提領金額，客服確認後協助出款' : '可上傳截圖回報匯款，客服確認後協助入點'}
              </p>
            </div>
            <button type="button" aria-label="關閉客服" onClick={() => setOpen(false)} style={{ border: 0, background: 'rgba(255,255,255,0.08)', color: '#fff', borderRadius: 10, padding: 8, cursor: 'pointer' }}>
              <X size={18} />
            </button>
          </div>

          <div style={{ padding: 14, overflowY: 'auto', display: 'grid', gap: 10, minHeight: 180 }}>
            {busy && messages.length === 0 && <p style={{ margin: 0, color: '#94A3B8', fontSize: 13 }}>讀取客服紀錄中...</p>}
            {!busy && messages.length === 0 && (
              <div style={{ padding: 14, borderRadius: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ margin: '0 0 6px', fontWeight: 800 }}>{user?.role === 'coach' ? '需要提領收益嗎？' : '需要協助加值嗎？'}</p>
                <p style={{ margin: 0, color: '#94A3B8', fontSize: 13, lineHeight: 1.6 }}>
                  {user?.role === 'coach' 
                    ? '請按「上傳截圖」附上您的存摺封面，並輸入欲提領金額與帳號。' 
                    : '匯款後請按「上傳截圖」，也可以輸入匯款金額或備註。'}
                </p>
              </div>
            )}
            {messages.map((item) => (
              <div key={item.id} style={{ justifySelf: item.isFromAdmin || item.isSystem ? 'start' : 'end', maxWidth: '82%' }}>
                <div style={{ padding: '10px 12px', borderRadius: 14, background: item.isFromAdmin || item.isSystem ? 'rgba(255,255,255,0.07)' : 'rgba(255,138,61,0.18)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  {item.message && <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55 }}>{item.message}</p>}
                  {item.imagePath && <p style={{ margin: item.message ? '6px 0 0' : 0, fontSize: 12, color: '#FDBA74', display: 'flex', alignItems: 'center', gap: 6 }}><ImageIcon size={14} /> 已上傳截圖</p>}
                </div>
              </div>
            ))}
          </div>

          {status && (
            <p style={{ margin: '0 14px 10px', color: status.type === 'error' ? '#FCA5A5' : status.type === 'success' ? '#86EFAC' : '#FDBA74', fontSize: 12, fontWeight: 700 }}>
              {status.text}
            </p>
          )}

          <form onSubmit={handleSend} style={{ padding: 14, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'grid', gap: 10 }}>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value.slice(0, 1000))}
              placeholder={user?.role === 'coach' ? '輸入訊息，例如：欲提領 2000 元至台新銀行 812-xxxx' : '輸入訊息，例如：已匯款 1000 元，請協助確認'}
              rows={3}
              style={{ resize: 'none', borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#fff', padding: 12, outline: 'none', fontSize: 14 }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFileChange} style={{ display: 'none' }} />
              <button type="button" onClick={() => fileInputRef.current?.click()} style={{ flex: 1, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)', color: '#fff', borderRadius: 12, padding: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <UploadCloud size={17} /> 上傳截圖
              </button>
              <button type="submit" disabled={busy} style={{ flex: 1, border: 0, background: '#FF8A3D', color: '#050816', borderRadius: 12, padding: 12, fontWeight: 900, cursor: busy ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: busy ? 0.72 : 1 }}>
                {busy ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />} 送出
              </button>
            </div>
          </form>
        </aside>
      )}
    </>
  );
}
