'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, Clock, CheckCircle2, XCircle, 
  ExternalLink, User, Calendar, FileText, Loader2,
  AlertCircle
} from 'lucide-react';
import UserDetailExpanded from '@/components/admin/UserDetailExpanded';

export default function VerificationAdmin() {
  const [activeTab, setActiveTab] = useState('coaches'); // 'pending' or 'coaches'
  const [pendingFiles, setPendingFiles] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const router = useRouter();

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'pending') {
        const res = await fetch('/api/admin/verify');
        if (res.ok) {
          const data = await res.json();
          setPendingFiles(data.files || []);
        } else if (res.status === 403) router.push('/dashboard/coach');
      } else {
        const res = await fetch('/api/admin/coaches');
        if (res.ok) {
          const data = await res.json();
          setCoaches(data.coaches || []);
        }
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [activeTab]);

  const handleReview = async (fileId, coachUserId, action) => {
    let reason = null;
    if (action === 'reject' || action === 'suspend') {
      reason = prompt(`請輸入${action === 'reject' ? '拒絕' : '停用'}原因：`);
      if (!reason && action === 'reject') return;
    }

    const actionText = { approve: '批准', reject: '拒絕', suspend: '停用', delete_coach: '刪除' }[action];

    setProcessingId(fileId || coachUserId);
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, coachUserId, action, reason })
      });
      if (res.ok) {
        if (activeTab === 'pending' && fileId) {
          setPendingFiles(prev => prev.filter(f => f.id !== fileId));
        } else {
          fetchData(); // 重新整理列表以獲取最新狀態
        }
      }
    } catch (err) {
      alert('操作失敗');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading && pendingFiles.length === 0 && coaches.length === 0) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-text-muted)' }}>
      <Loader2 className="animate-spin" size={40} style={{ marginBottom: 16 }} />
      <p>正在載入資料...</p>
    </div>
  );

  const handleSelectAll = (e) => {
    if (e.target.checked) setSelectedIds(coaches.map(c => c.id));
    else setSelectedIds([]);
  };

  const handleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const toggleExpand = (id) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  return (
    <div className="admin-trust-center">
      {/* Header */}
      <header className="page-header">
        <div className="header-content">
          <div className="icon-badge">
            <ShieldCheck size={28} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[var(--text-light)]">信任與安全中心</h1>
            <p className="text-sm text-[var(--color-text-muted)]">教練資歷審核與帳號狀態管理</p>
          </div>
        </div>
        
        <div className="tab-control-wrapper">
          <div className="tab-control">
            <button 
              className={`tab-btn ${activeTab === 'coaches' ? 'active' : ''}`}
              onClick={() => setActiveTab('coaches')}
            >
              教練帳號管理
            </button>
            <button 
              className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
              onClick={() => setActiveTab('pending')}
            >
              待審核文件 ({pendingFiles.length})
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="admin-grid">
        {activeTab === 'pending' ? (
          pendingFiles.length === 0 ? (
            <div className="empty-state">
              <CheckCircle2 size={64} className="text-green-500/20 mb-4" />
              <h2 className="text-xl font-bold text-[var(--text-light)]">暫無待處理文件</h2>
              <p className="text-[var(--color-text-muted)]">目前的信譽防護牆非常穩固！</p>
            </div>
          ) : (
            pendingFiles.map(file => (
              <div key={file.id} className="verification-card-v2">
                <div className="card-preview">
                  <img src={file.compressed_url} alt="文件預覽" className="preview-img" />
                  <div className="preview-overlay">
                    <a href={file.compressed_url} target="_blank" className="view-link">
                      <ExternalLink size={20} />
                    </a>
                  </div>
                </div>
                
                <div className="card-body">
                  <div className="user-info-section">
                     {file.user?.avatar_url ? (
                        <img src={file.user.avatar_url} className="user-avatar-img" />
                     ) : (
                        <div className="user-avatar">{file.user?.name?.charAt(0)}</div>
                     )}
                     <div>
                       <h3 className="font-bold text-[var(--text-light)]">{file.user?.name}</h3>
                       <p className="text-xs text-[var(--color-text-muted)]">{file.user?.email}</p>
                     </div>
                  </div>

                  <div className="file-meta">
                    <div className="meta-item">
                      <FileText size={14} />
                      <span>{file.file_type === 'student_id' ? '學生證' : '專業證照'}</span>
                    </div>
                    <div className="meta-item">
                      <Calendar size={14} />
                      <span>{new Date(file.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="card-actions">
                    <button 
                      disabled={processingId === file.id}
                      onClick={() => handleReview(file.id, file.user_id, 'approve')}
                      className="btn-approve"
                    >
                      {processingId === file.id ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                      <span>批准通過</span>
                    </button>
                    <button 
                      disabled={processingId === file.id}
                      onClick={() => handleReview(file.id, file.user_id, 'reject')}
                      className="btn-reject"
                    >
                      <XCircle size={18} />
                      <span>拒絕</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )
        ) : (
          <div className="table-wrapper">
            <table className="dense-table">
              <thead>
                <tr>
                  <th className="sticky-col checkbox-col">
                    <input 
                      type="checkbox" 
                      onChange={handleSelectAll} 
                      checked={selectedIds.length === coaches.length && coaches.length > 0} 
                    />
                  </th>
                  <th className="sticky-col action-col">操作</th>
                  <th>組織路徑</th>
                  <th>帳號 / 名稱</th>
                  <th>錢包數據 (餘額/完課/出金/儲值)</th>
                  <th>最後登入與註冊時間</th>
                </tr>
              </thead>
              <tbody>
                {coaches.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-[var(--color-text-muted)]">
                      找不到符合條件的教練
                    </td>
                  </tr>
                ) : (
                  coaches.reduce((acc, coach) => {
                    acc.push(
                      <tr key={coach.id} className={selectedIds.includes(coach.id) ? 'selected-row' : ''}>
                        <td className="sticky-col checkbox-col">
                          <input 
                            type="checkbox" 
                            checked={selectedIds.includes(coach.id)}
                            onChange={() => handleSelect(coach.id)}
                          />
                        </td>
                        <td className="sticky-col action-col">
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <button 
                              onClick={() => toggleExpand(coach.user_id)}
                              className="detail-btn"
                            >
                              {expandedRows.has(coach.user_id) ? '收起' : '詳細'}
                            </button>
                          </div>
                        </td>
                        <td className="path-col">
                          <div className="path-box">
                            <span>&gt; 教練</span>
                            <span className="path-sub">/ 系統</span>
                          </div>
                        </td>
                        <td className="account-col">
                          <div className="account-info">
                            <span className="account-id">{coach.user?.email}</span>
                            <div className="account-name-row">
                              <span className="account-name">{coach.user?.name}</span>
                            </div>
                            <span className={`status-badge ${coach.approval_status}`}>
                              {coach.approval_status === 'approved' ? '已核准' : 
                               coach.approval_status === 'pending' ? '待審核' :
                               coach.approval_status === 'rejected' ? '已拒絕' : '已停用'}
                            </span>
                            {coach.average_rating && Number(coach.average_rating) < 4.5 && (
                              <span style={{ fontSize: '11px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', width: 'fit-content' }}>
                                <AlertCircle size={12} /> 評分過低警告
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="wallet-col">
                          <div className="wallet-grid">
                            <div className="wallet-item">
                              <span className="label">錢包總餘額</span>
                              <span className="value highlight">{coach.wallet_balance?.toLocaleString() || '0'}</span>
                            </div>
                            <div className="wallet-item">
                              <span className="label">總完課金額</span>
                              <span className="value">{coach.total_classes_amount?.toLocaleString() || '0'}</span>
                            </div>
                            <div className="wallet-item">
                              <span className="label">總出金</span>
                              <span className="value">{coach.total_withdrawal?.toLocaleString() || '0'}</span>
                            </div>
                            <div className="wallet-item">
                              <span className="label">總儲值</span>
                              <span className="value">{coach.total_deposit?.toLocaleString() || '0'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="time-col">
                          <div className="time-info">
                            <div className="time-row">
                              <span className="label">登入 :</span>
                              <span className="value">{new Date(coach.created_at || Date.now()).toLocaleString()}</span>
                            </div>
                            <div className="time-row">
                              <span className="label">IP :</span>
                              <span className="value ip">{coach.last_login_ip || '2001:b011:7007::'}</span>
                            </div>
                            <div className="time-row mt-2">
                              <span className="label">註冊 :</span>
                              <span className="value">{new Date(coach.created_at || Date.now()).toLocaleString()}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                    if (expandedRows.has(coach.user_id)) {
                      acc.push(
                        <tr key={`expanded-${coach.user_id}`} className="expanded-row-container">
                          <td colSpan="6" style={{ padding: 0 }}>
                            <UserDetailExpanded userId={coach.user_id} />
                          </td>
                        </tr>
                      );
                    }
                    return acc;
                  }, [])
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style jsx>{`
        .tab-control-wrapper {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          padding-bottom: 4px;
        }
        .tab-control {
          display: inline-flex;
          background: rgba(255, 255, 255, 0.05);
          padding: 6px;
          border-radius: 16px;
          gap: 4px;
          white-space: nowrap;
        }
        .tab-btn {
          padding: 10px 20px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 800;
          color: var(--color-text-muted);
          transition: 0.2s;
          border: 1px solid transparent;
        }
        .tab-btn.active {
          background: rgba(76, 201, 240, 0.15);
          color: #4cc9f0;
          border-color: rgba(76, 201, 240, 0.3);
        }
        .user-avatar-img {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          object-fit: cover;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        /* New Coach Card Styles */
        .coach-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 20px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .coach-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }
        .coach-card-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding-top: 12px;
          border-top: 1px dashed rgba(255,255,255,0.1);
        }
        .action-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid transparent;
          white-space: nowrap;
          min-width: fit-content;
        }
        .action-btn.approve {
          background: rgba(74, 222, 128, 0.1);
          color: #4ade80;
          border-color: rgba(74, 222, 128, 0.2);
        }
        .action-btn.recover {
          background: rgba(96, 165, 250, 0.1);
          color: #60a5fa;
          border-color: rgba(96, 165, 250, 0.2);
        }
        .action-btn.suspend {
          background: rgba(250, 204, 21, 0.1);
          color: #facc15;
          border-color: rgba(250, 204, 21, 0.2);
        }
        .action-btn.delete {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border-color: rgba(239, 68, 68, 0.2);
        }
        .status-badge {
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .status-badge.approved { background: rgba(6, 214, 160, 0.1); color: #06d6a0; }
        .status-badge.pending { background: rgba(255, 140, 66, 0.1); color: #ff8c42; }
        .status-badge.rejected { background: rgba(255, 59, 92, 0.1); color: #ff3b5c; }
        .status-badge.suspended { background: rgba(136, 136, 153, 0.1); color: var(--color-text-muted); }

        /* Dense Table Styles */
        .table-wrapper {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 20px;
          grid-column: 1 / -1;
        }
        .dense-table {
          width: 100%;
          min-width: 1000px;
          border-collapse: collapse;
          font-size: 13px;
        }
        .dense-table th {
          background: rgba(0, 0, 0, 0.2);
          color: #4cc9f0;
          font-weight: 700;
          padding: 16px 20px;
          text-align: left;
          border-bottom: 2px solid var(--color-border);
          white-space: nowrap;
        }
        .dense-table td {
          padding: 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          vertical-align: top;
        }
        .dense-table tr:hover {
          background: rgba(255, 255, 255, 0.02);
        }
        .dense-table tr.selected-row {
          background: rgba(96, 165, 250, 0.05);
        }
        .sticky-col {
          position: sticky;
          background: var(--color-surface);
          z-index: 10;
        }
        .dense-table tr:hover .sticky-col { background: #1a1e27; }
        .dense-table tr.selected-row .sticky-col { background: #1a2233; }
        .dense-table th.sticky-col { background: #151821; z-index: 11; }
        .checkbox-col { left: 0; width: 50px; text-align: center; }
        .action-col { left: 50px; width: 80px; border-right: 1px solid var(--color-border); }
        .detail-btn {
          display: inline-block;
          background: rgba(255, 255, 255, 0.1);
          color: var(--text-light);
          padding: 6px 16px;
          border-radius: 6px;
          font-weight: 700;
          text-decoration: none;
          transition: 0.2s;
          text-align: center;
          width: 100%;
        }
        .detail-btn:hover { background: #4cc9f0; color: #000; }
        .path-box {
          background: rgba(255,255,255,0.03);
          padding: 10px;
          border-radius: 8px;
          display: inline-flex;
          flex-direction: column;
          gap: 4px;
          font-weight: 700;
          color: var(--text-light);
        }
        .path-sub { color: #fbbf24; padding-left: 12px; }
        .account-info { display: flex; flex-direction: column; gap: 6px; }
        .account-id { color: #f472b6; font-family: monospace; font-size: 14px; }
        .account-name-row { display: flex; alignItems: center; gap: 6px; color: var(--text-light); font-weight: bold; }
        .wallet-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; }
        .wallet-item { display: flex; flex-direction: column; gap: 4px; }
        .wallet-item .label { color: #4cc9f0; font-weight: 700; }
        .wallet-item .value { color: var(--color-text-muted); font-family: monospace; font-size: 14px; }
        .wallet-item .value.highlight { color: var(--text-light); font-weight: bold; }
        .time-info { display: flex; flex-direction: column; gap: 4px; }
        .time-row { display: flex; gap: 8px; }
        .time-row .label { color: var(--color-text-muted); width: 40px; }
        .time-row .value { color: var(--text-light); }
        .time-row .ip { color: #f472b6; font-family: monospace; }
        .mt-2 { margin-top: 8px; }

        .admin-trust-center {
          min-height: 100vh;
          background: var(--color-bg);
          padding: 40px 24px;
          color: var(--color-text);
          font-family: 'Noto Sans TC', sans-serif;
        }
        .page-header {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 30px;
        }
        @media (min-width: 768px) {
          .page-header {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
          }
        }
        .header-content {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .icon-badge {
          width: 60px;
          height: 60px;
          background: rgba(76, 201, 240, 0.1);
          border: 1px solid rgba(76, 201, 240, 0.2);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .stats-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 140, 66, 0.1);
          color: #ff8c42;
          padding: 8px 16px;
          border-radius: 100px;
          font-weight: 800;
          font-size: 13px;
        }
        .admin-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 24px;
        }
        .empty-state {
          grid-column: 1 / -1;
          height: 400px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.02);
          border: 1px dashed rgba(255, 255, 255, 0.1);
          border-radius: 32px;
        }
        .verification-card-v2 {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 24px;
          overflow: hidden;
          transition: transform 0.3s;
        }
        .verification-card-v2:hover {
          transform: translateY(-5px);
          border-color: #4cc9f0;
        }
        .card-preview {
          position: relative;
          height: 200px;
          background: var(--color-text);
        }
        .preview-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .preview-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.3s;
        }
        .card-preview:hover .preview-overlay {
          opacity: 1;
        }
        .view-link {
          width: 48px;
          height: 48px;
          background: var(--color-surface);
          color: var(--color-text);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .card-body {
          padding: 20px;
        }
        .user-info-section {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        }
        .user-avatar {
          width: 40px;
          height: 40px;
          background: #4cc9f0;
          color: var(--color-text);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
        }
        .file-meta {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 12px;
        }
        .meta-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--color-text-muted);
        }
        .card-actions {
          display: flex;
          gap: 12px;
        }
        .btn-approve {
          flex: 1.5;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: #06d6a0;
          color: var(--color-text);
          padding: 12px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
        }
        .btn-reject {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: rgba(255, 59, 92, 0.1);
          color: #ff3b5c;
          border: 1px solid rgba(255, 59, 92, 0.2);
          padding: 12px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
        }
        .btn-reject:hover {
          background: #ff3b5c;
          color: var(--text-light);
        }
      `}</style>
    </div>
  );
}
