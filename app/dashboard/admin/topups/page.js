'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { ShieldCheck, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function AdminTopupsPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/');
      return;
    }
    fetchRequests();
  }, [user]);

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/admin/topups');
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id, userId, amount) => {
    if (!confirm(`確定要核准這筆 ${amount} 點的儲值嗎？\n這將會發放 ${amount} 點到該用戶錢包。`)) return;
    
    setProcessingId(id);
    try {
      const res = await fetch('/api/admin/topups/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: id, userId, amount })
      });
      if (res.ok) {
        alert('核准成功，點數已發放！');
        fetchRequests();
      } else {
        const data = await res.json();
        alert(data.error || '核准失敗');
      }
    } catch (err) {
      alert('伺服器錯誤');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id) => {
    if (!confirm('確定要拒絕這筆儲值申請嗎？')) return;
    
    setProcessingId(id);
    try {
      const res = await fetch('/api/admin/topups/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: id })
      });
      if (res.ok) {
        alert('已拒絕申請！');
        fetchRequests();
      } else {
        const data = await res.json();
        alert(data.error || '拒絕失敗');
      }
    } catch (err) {
      alert('伺服器錯誤');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><Loader2 className="animate-spin" /></div>;

  return (
    <main style={{ padding: '24px 16px', maxWidth: 800, margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 24, fontWeight: 900 }}>
        <ShieldCheck size={28} color="#2563EB" /> 儲值申請審核
      </h1>
      <p style={{ color: '#64748B', marginBottom: 24 }}>在這裡核對家長的匯款資料，確認收到款項後發放點數。</p>

      {requests.length === 0 ? (
        <div style={{ background: '#F8FAFC', padding: 40, textAlign: 'center', borderRadius: 16 }}>
          <p style={{ color: '#64748B', margin: 0 }}>目前沒有待審核的儲值申請。</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {requests.map(req => (
            <div key={req.id} style={{ 
              border: '1px solid #E2E8F0', borderRadius: 16, padding: 20, 
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: '#FFF', boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
            }}>
              <div>
                <p style={{ margin: '0 0 4px', fontSize: 13, color: '#64748B' }}>申請時間：{new Date(req.created_at).toLocaleString()}</p>
                <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700 }}>用戶：{req.users?.name || '未知'} ({req.users?.email})</p>
                <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                  <span style={{ fontSize: 16, fontWeight: 900, color: '#FF8A3D' }}>金額：NT$ {req.amount}</span>
                  <span style={{ fontSize: 16, fontWeight: 900, color: '#0F172A' }}>帳號末五碼：{req.bank_last_5}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button 
                  onClick={() => handleReject(req.id)}
                  disabled={processingId === req.id}
                  style={{ background: '#FEE2E2', color: '#DC2626', border: 0, padding: '10px 16px', borderRadius: 12, fontWeight: 800, cursor: 'pointer' }}
                >
                  <XCircle size={18} style={{ verticalAlign: 'middle', marginRight: 4 }} /> 拒絕
                </button>
                <button 
                  onClick={() => handleApprove(req.id, req.user_id, req.amount)}
                  disabled={processingId === req.id}
                  style={{ background: '#10B981', color: '#FFF', border: 0, padding: '10px 16px', borderRadius: 12, fontWeight: 800, cursor: 'pointer' }}
                >
                  <CheckCircle size={18} style={{ verticalAlign: 'middle', marginRight: 4 }} /> 收到款項，發放
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
