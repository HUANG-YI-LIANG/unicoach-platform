'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { ArrowLeft, CheckCircle2, ExternalLink, Loader2, Wallet } from 'lucide-react';

const BLUE = '#2563EB';
const DARK = '#0F172A';
const MUTED = '#64748B';
const BG = '#F8FAFC';
const WHITE = '#FFFFFF';

export default function AdminPaymentsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [confirmingId, setConfirmingId] = useState(null);
  const [settings, setSettings] = useState({ bank_code: '', bank_account_number: '' });
  const [savingSettings, setSavingSettings] = useState(false);

  const fetchBookings = async () => {
    try {
      const res = await fetch('/api/bookings');
      if (!res.ok) {
        throw new Error('無法取得訂單資料');
      }

      const data = await res.json();
      const pendingReceipts = (data.bookings || []).filter(
        (booking) => booking.status === 'pending_payment' && booking.payment_reference
      );
      setBookings(pendingReceipts);
    } catch (error) {
      console.error('[ADMIN PAYMENTS FETCH ERROR]', error);
      alert('無法取得付款審核列表');
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setSettings({
            bank_code: data.settings.bank_code || '',
            bank_account_number: data.settings.bank_account_number || '',
          });
        }
      }
    } catch (err) {
      console.error('[FETCH SETTINGS ERROR]', err);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.role !== 'admin') {
      router.push('/dashboard/admin');
      return;
    }
    fetchBookings();
    fetchSettings();
  }, [authLoading, router, user]);

  const handleConfirmPayment = async (bookingId) => {
    setConfirmingId(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/confirm-payment`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '確認付款失敗');
      }
      await fetchBookings();
    } catch (error) {
      alert(error.message || '確認付款失敗');
    } finally {
      setConfirmingId(null);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const res1 = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'bank_code', value: settings.bank_code, description: '平台收款銀行代碼' })
      });
      const res2 = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'bank_account_number', value: settings.bank_account_number, description: '平台收款帳號' })
      });
      
      if (!res1.ok || !res2.ok) throw new Error('更新失敗');
      alert('收款帳號已成功更新！');
    } catch (error) {
      alert(error.message || '更新失敗');
    } finally {
      setSavingSettings(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG, color: MUTED }}>
        <Loader2 className="animate-spin" size={30} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, padding: '24px 16px 96px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => router.push('/dashboard/admin')}
              style={{ border: 'none', background: WHITE, width: 44, height: 44, borderRadius: 14, cursor: 'pointer', boxShadow: '0 2px 10px rgba(15,23,42,0.06)' }}
            >
              <ArrowLeft size={20} color={DARK} />
            </button>
            <div>
              <h1 style={{ margin: 0, color: DARK, fontSize: 26, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Wallet size={24} color={BLUE} />
                訂單付款審核
              </h1>
              <p style={{ margin: '6px 0 0', color: MUTED, fontSize: 13 }}>
                檢查學員上傳的轉帳截圖，確認後將訂單切換為正式排程。
              </p>
            </div>
          </div>
        </header>

        {/* Bank Account Settings */}
        <div style={{ background: WHITE, borderRadius: 24, padding: 24, marginBottom: 24, boxShadow: '0 4px 16px rgba(15,23,42,0.04)', border: '1px solid #E2E8F0' }}>
          <h2 style={{ margin: '0 0 16px', color: DARK, fontSize: 16, fontWeight: 900 }}>設定學員匯款專用的平台收款帳號</h2>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 800, color: MUTED }}>銀行代碼</label>
              <input
                type="text"
                value={settings.bank_code}
                onChange={(e) => setSettings({ ...settings, bank_code: e.target.value })}
                placeholder="例如：013"
                style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 14, fontWeight: 700, color: DARK }}
              />
            </div>
            <div style={{ flex: 2, minWidth: 200 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 800, color: MUTED }}>銀行帳號</label>
              <input
                type="text"
                value={settings.bank_account_number}
                onChange={(e) => setSettings({ ...settings, bank_account_number: e.target.value })}
                placeholder="例如：0123-4567-8910"
                style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 14, fontWeight: 700, color: DARK }}
              />
            </div>
            <button
              onClick={handleSaveSettings}
              disabled={savingSettings}
              style={{
                background: BLUE,
                color: WHITE,
                border: 'none',
                padding: '12px 24px',
                borderRadius: 12,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                opacity: savingSettings ? 0.7 : 1,
              }}
            >
              {savingSettings ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
              儲存設定
            </button>
          </div>
        </div>

        {bookings.length === 0 ? (
          <div style={{ background: WHITE, borderRadius: 24, padding: '48px 24px', textAlign: 'center', boxShadow: '0 6px 20px rgba(15,23,42,0.05)' }}>
            <div style={{ fontSize: 42, marginBottom: 10 }}>🧾</div>
            <div style={{ color: DARK, fontWeight: 900, fontSize: 18 }}>目前沒有待審核匯款</div>
            <p style={{ color: MUTED, margin: '8px 0 0', fontSize: 13 }}>待付款且已上傳截圖的訂單會顯示在這裡。</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {bookings.map((booking) => (
              <div
                key={booking.id}
                style={{
                  background: WHITE,
                  borderRadius: 24,
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 8px 24px rgba(15,23,42,0.05)',
                  padding: 20,
                  display: 'grid',
                  gap: 16,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div style={{ display: 'grid', gap: 6 }}>
                    <div style={{ color: DARK, fontWeight: 900, fontSize: 16 }}>
                      {booking.user_name || '學員'} {'->'} {booking.coach_name || '教練'}
                    </div>
                    <div style={{ color: MUTED, fontSize: 12 }}>訂單 #{booking.id.slice(0, 8)}</div>
                    <div style={{ color: MUTED, fontSize: 12 }}>
                      上課時間：{booking.expected_time ? new Date(booking.expected_time).toLocaleString('zh-TW') : '未設定'}
                    </div>
                    <div style={{ color: DARK, fontSize: 14, fontWeight: 800 }}>
                      訂單金額：NT${booking.final_price?.toLocaleString() ?? '--'}
                    </div>
                  </div>

                  <button
                    onClick={() => handleConfirmPayment(booking.id)}
                    disabled={confirmingId === booking.id}
                    style={{
                      border: 'none',
                      borderRadius: 14,
                      padding: '12px 18px',
                      background: '#059669',
                      color: WHITE,
                      fontWeight: 800,
                      fontSize: 13,
                      cursor: 'pointer',
                      minWidth: 140,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      opacity: confirmingId === booking.id ? 0.7 : 1,
                    }}
                  >
                    {confirmingId === booking.id ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                    確認已收款
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 320px) 1fr', gap: 16, alignItems: 'start' }}>
                  <a
                    href={booking.payment_reference}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'block',
                      overflow: 'hidden',
                      borderRadius: 18,
                      border: '1px solid #E2E8F0',
                      background: '#F8FAFC',
                    }}
                  >
                    <img
                      src={booking.payment_reference}
                      alt="付款截圖"
                      style={{ width: '100%', height: 240, objectFit: 'cover', display: 'block' }}
                    />
                  </a>

                  <div style={{ display: 'grid', gap: 10 }}>
                    <div style={{ background: '#F8FAFC', borderRadius: 18, padding: 16, color: DARK, fontSize: 13, lineHeight: 1.6 }}>
                      <div style={{ fontWeight: 900, marginBottom: 8 }}>審核重點</div>
                      <div>1. 確認截圖金額與訂單金額一致。</div>
                      <div>2. 確認匯款時間仍在保留時段內。</div>
                      <div>3. 確認收款帳戶與平台設定一致。</div>
                    </div>

                    <a
                      href={booking.payment_reference}
                      target="_blank"
                      rel="noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: BLUE, fontWeight: 800, textDecoration: 'none' }}
                    >
                      <ExternalLink size={16} />
                      開啟原始截圖
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
