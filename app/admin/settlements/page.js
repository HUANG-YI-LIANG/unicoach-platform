'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const STATUS_LABEL = {
  pending: '待撥款',
  paid: '已撥款',
  cancelled: '已取消',
};

const STATUS_STYLE = {
  pending: { bg: '#FEF3C7', color: '#92400E' },
  paid: { bg: '#D1FAE5', color: '#065F46' },
  cancelled: { bg: '#FEE2E2', color: '#991B1B' },
};

export default function AdminSettlementsPage() {
  const router = useRouter();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [batches, setBatches] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchBatches();
  }, []);

  async function fetchBatches() {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/settlements');
      const payload = await response.json();
      if (!response.ok) {
        alert(payload.error || '無法讀取結算資料');
        return;
      }
      setBatches(payload.batches || []);
    } finally {
      setLoading(false);
    }
  }

  async function generateSettlements() {
    setGenerating(true);
    try {
      const response = await fetch('/api/admin/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month }),
      });
      const payload = await response.json();
      if (!response.ok) {
        alert(payload.error || '結算產生失敗');
        return;
      }
      alert(payload.message || '結算完成');
      fetchBatches();
    } finally {
      setGenerating(false);
    }
  }

  async function loadDetail(batch) {
    setSelected(batch);
    setDetail(null);
    const response = await fetch(`/api/admin/settlements/${batch.id}`);
    const payload = await response.json();
    if (!response.ok) {
      alert(payload.error || '無法讀取明細');
      return;
    }
    setDetail(payload);
  }

  async function updateStatus(batchId, status) {
    const response = await fetch(`/api/admin/settlements/${batchId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const payload = await response.json();
    if (!response.ok) {
      alert(payload.error || '狀態更新失敗');
      return;
    }
    await fetchBatches();
    await loadDetail(payload.batch);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', padding: 24 }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <button onClick={() => router.push('/dashboard/admin')} style={linkButtonStyle}>← 回管理後台</button>
        <header style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16, alignItems: 'center', marginBottom: 22 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, color: '#0F172A', fontWeight: 900, whiteSpace: 'nowrap' }}>結算管理</h1>
            <p style={{ margin: '8px 0 0', color: '#64748B', fontSize: 14 }}>依月份產生教練撥款批次，避免重複納入已結算訂單。</p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} style={inputStyle} />
            <button onClick={generateSettlements} disabled={generating} style={primaryButtonStyle}>
              {generating ? '產生中...' : '產生結算'}
            </button>
          </div>
        </header>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'flex-start' }}>
          <section style={{ ...cardStyle, flex: '1 1 300px', minWidth: 0 }}>
            <h2 style={sectionTitleStyle}>結算批次</h2>
            {loading ? (
              <p style={mutedStyle}>載入中...</p>
            ) : batches.length === 0 ? (
              <p style={mutedStyle}>目前沒有結算批次。</p>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {batches.map((batch) => {
                  const style = STATUS_STYLE[batch.status] || STATUS_STYLE.pending;
                  return (
                    <button key={batch.id} onClick={() => loadDetail(batch)} style={{
                      textAlign: 'left',
                      border: selected?.id === batch.id ? '2px solid #2563EB' : '1px solid #E2E8F0',
                      background: '#FFFFFF',
                      borderRadius: 16,
                      padding: 16,
                      cursor: 'pointer',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                        <div>
                          <strong style={{ color: '#0F172A', fontSize: 15 }}>{batch.coach?.name || '未知教練'}</strong>
                          <div style={{ color: '#64748B', fontSize: 12, marginTop: 4 }}>{batch.month} · {batch.booking_count || 0} 筆訂單</div>
                        </div>
                        <span style={{ ...pillStyle, background: style.bg, color: style.color }}>{STATUS_LABEL[batch.status] || batch.status}</span>
                      </div>
                      <div style={{ color: '#059669', fontWeight: 900, fontSize: 20, marginTop: 10 }}>
                        NT${Number(batch.total_amount || 0).toLocaleString()}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section style={{ ...cardStyle, flex: '1 1 360px', minWidth: 0 }}>
            <h2 style={sectionTitleStyle}>批次明細</h2>
            {!detail ? (
              <p style={mutedStyle}>請選擇左側批次查看明細。</p>
            ) : (
              <div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: '#0F172A', fontWeight: 900, fontSize: 18 }}>{detail.batch.coach?.name}</div>
                  <div style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>{detail.batch.month} · NT${Number(detail.batch.total_amount || 0).toLocaleString()}</div>
                </div>

                {detail.batch.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                    <button onClick={() => updateStatus(detail.batch.id, 'paid')} style={primaryButtonStyle}>標記已撥款</button>
                    <button onClick={() => updateStatus(detail.batch.id, 'cancelled')} style={dangerButtonStyle}>取消批次</button>
                  </div>
                )}

                <div style={{ display: 'grid', gap: 10 }}>
                  {(detail.bookings || []).map((booking) => (
                    <div key={booking.id} style={{ border: '1px solid #E2E8F0', borderRadius: 14, padding: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                        <strong style={{ color: '#0F172A', fontSize: 13 }}>{booking.user_name || '學員'}</strong>
                        <span style={{ color: '#059669', fontWeight: 900 }}>NT${Number(booking.coach_payout || 0).toLocaleString()}</span>
                      </div>
                      <div style={{ color: '#64748B', fontSize: 12, marginTop: 4 }}>
                        {booking.completed_at ? new Date(booking.completed_at).toLocaleDateString('zh-TW') : '完課日不明'}
                        {booking.plan_title ? ` · ${booking.plan_title}` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

const cardStyle = {
  background: '#FFFFFF',
  border: '1px solid #E2E8F0',
  borderRadius: 20,
  padding: 18,
  boxShadow: '0 2px 12px rgba(15,23,42,0.04)',
};

const sectionTitleStyle = { margin: '0 0 14px', color: '#0F172A', fontSize: 18, fontWeight: 900, whiteSpace: 'nowrap' };
const mutedStyle = { color: '#64748B', fontSize: 14 };
const pillStyle = { borderRadius: 999, padding: '4px 9px', fontSize: 11, fontWeight: 900, whiteSpace: 'nowrap' };
const linkButtonStyle = { border: 'none', background: 'transparent', color: '#2563EB', fontWeight: 800, cursor: 'pointer', marginBottom: 18, whiteSpace: 'nowrap' };
const inputStyle = { border: '1px solid #CBD5E1', borderRadius: 12, padding: '11px 12px', color: '#0F172A', fontWeight: 800, width: '100%', maxWidth: '180px' };
const primaryButtonStyle = { border: 'none', background: '#2563EB', color: '#FFFFFF', borderRadius: 12, padding: '11px 14px', fontWeight: 900, cursor: 'pointer', whiteSpace: 'nowrap' };
const dangerButtonStyle = { border: 'none', background: '#FEE2E2', color: '#991B1B', borderRadius: 12, padding: '11px 14px', fontWeight: 900, cursor: 'pointer', whiteSpace: 'nowrap' };
