'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Wallet, CalendarDays, CheckCircle2 } from 'lucide-react';

const BLUE   = '#2563EB';
const BG     = '#F1F5F9';
const CARD   = '#FFFFFF';
const MUTED  = '#94A3B8';
const DARK   = '#0F172A';
const SHADOW = '0 2px 16px rgba(0,0,0,0.06)';

function getDayOfWeek(dateString) {
  if (!dateString) return '--';
  const days = ['日', '一', '二', '三', '四', '五', '六'];
  const d = new Date(dateString);
  return `星期${days[d.getDay()]}`;
}

function formatTime(dateString) {
  if (!dateString) return '--';
  return new Intl.DateTimeFormat('zh-TW', {
    hour: '2-digit', minute: '2-digit', hour12: false
  }).format(new Date(dateString));
}

function formatDate(dateString) {
  if (!dateString) return '--';
  return new Intl.DateTimeFormat('zh-TW', {
    month: 'numeric', day: 'numeric'
  }).format(new Date(dateString));
}

export default function EarningsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/bookings')
      .then(r => r.json())
      .then(d => {
        if (d.bookings) {
          // Filter completed bookings
          const completed = d.bookings.filter(b => b.status === 'completed');
          // Sort by completion time descending (newest first)
          completed.sort((a, b) => new Date(b.completed_at || 0) - new Date(a.completed_at || 0));
          setBookings(completed);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const totalEarnings = bookings.reduce((sum, b) => sum + (b.coach_payout || 0), 0);

  // Group by month
  const groupedBookings = bookings.reduce((acc, b) => {
    const d = b.completed_at ? new Date(b.completed_at) : new Date();
    const monthKey = `${d.getFullYear()}年${d.getMonth() + 1}月`;
    if (!acc[monthKey]) acc[monthKey] = [];
    acc[monthKey].push(b);
    return acc;
  }, {});

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'70vh' }}>
      <p style={{ color: MUTED, fontSize: 15, fontWeight: 600 }}>載入中…</p>
    </div>
  );

  return (
    <div style={{ background: BG, minHeight: '100vh', paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ background: CARD, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: SHADOW, position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', color: DARK }}>
          <ChevronLeft size={24} />
        </button>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: DARK }}>收入明細表</h1>
      </div>

      <div style={{ padding: '20px 16px' }}>
        <div style={{ background: 'linear-gradient(135deg, #059669, #10B981)', borderRadius: 16, padding: 24, color: '#fff', boxShadow: '0 8px 24px rgba(5,150,105,0.25)', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, opacity: 0.9 }}>
            <Wallet size={18} />
            <span style={{ fontSize: 13, fontWeight: 700 }}>歷史累計實拿總額</span>
          </div>
          <p style={{ margin: 0, fontSize: 32, fontWeight: 900 }}>${totalEarnings.toLocaleString()}</p>
        </div>

        {Object.entries(groupedBookings).map(([month, monthBookings]) => (
          <div key={month} style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12, paddingLeft: 4 }}>
              <h2 style={{ fontSize: 16, fontWeight: 900, color: DARK, margin: 0 }}>{month}</h2>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#059669' }}>
                +${monthBookings.reduce((sum, b) => sum + (b.coach_payout || 0), 0).toLocaleString()}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {monthBookings.map(b => (
                <div key={b.id} style={{ background: CARD, borderRadius: 16, padding: '16px 20px', boxShadow: SHADOW }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: DARK }}>{b.user_name || '學員'}</span>
                        <span style={{ fontSize: 11, background: '#F1F5F9', color: '#475569', padding: '2px 8px', borderRadius: 100, fontWeight: 800 }}>
                          {getDayOfWeek(b.completed_at || b.expected_time)}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: MUTED, fontSize: 12, marginBottom: 4 }}>
                        <CalendarDays size={12} />
                        <span>上課：{formatDate(b.expected_time)} {formatTime(b.expected_time)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: MUTED, fontSize: 12 }}>
                        <CheckCircle2 size={12} />
                        <span>完課：{formatDate(b.completed_at)} {formatTime(b.completed_at)}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: 0, fontSize: 11, color: MUTED, fontWeight: 700, marginBottom: 2 }}>教練實拿</p>
                      <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#059669' }}>${(b.coach_payout || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {bookings.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: CARD, borderRadius: 16 }}>
            <p style={{ margin: 0, color: MUTED, fontSize: 14, fontWeight: 600 }}>目前尚無完課紀錄</p>
          </div>
        )}
      </div>
    </div>
  );
}
