'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, Clock, CheckCircle2, XCircle, 
  ExternalLink, User, Calendar, FileText, Loader2,
  AlertCircle
} from 'lucide-react';

export default function VerificationAdmin() {
  const [activeTab, setActiveTab] = useState('coaches'); // 'pending' or 'coaches'
  const [pendingFiles, setPendingFiles] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
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
    // if (!confirm(`確定要 ${actionText} 此${fileId ? '文件' : '教練'}嗎？`)) return;

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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0a0f', color: '#888899' }}>
      <Loader2 className="animate-spin" size={40} style={{ marginBottom: 16 }} />
      <p>正在載入資料...</p>
    </div>
  );

  return (
    <div className="admin-trust-center">
      {/* Header */}
      <header className="page-header">
        <div className="header-content">
          <div className="icon-badge">
            <ShieldCheck size={28} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">信任與安全中心</h1>
            <p className="text-sm text-[#888899]">教練資歷審核與帳號狀態管理</p>
          </div>
        </div>
        
        <div className="tab-control">
          <button 
            className={`tab-btn ${activeTab === 'coaches' ? 'active' : ''}`}
            onClick={() => setActiveTab('coaches')}
          >
            教練帳號審核與管理
          </button>
          <button 
            className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            待審核補充文件 ({pendingFiles.length})
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="admin-grid">
        {activeTab === 'pending' ? (
          pendingFiles.length === 0 ? (
            <div className="empty-state">
              <CheckCircle2 size={64} className="text-green-500/20 mb-4" />
              <h2 className="text-xl font-bold text-white">暫無待處理文件</h2>
              <p className="text-[#888899]">目前的信譽防護牆非常穩固！</p>
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
                       <h3 className="font-bold text-white">{file.user?.name}</h3>
                       <p className="text-xs text-[#888899]">{file.user?.email}</p>
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
          <div className="coach-list-full">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>教練</th>
                  <th>聯絡方式</th>
                  <th>目前狀態</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {coaches.map(coach => (
                  <tr key={coach.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {coach.user?.avatar_url ? (
                          <img src={coach.user.avatar_url} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa', fontWeight: 'bold' }}>
                            {coach.user?.name?.charAt(0)}
                          </div>
                        )}
                        <span style={{ fontWeight: 'bold' }}>{coach.user?.name}</span>
                      </div>
                    </td>
                    <td><span style={{ fontSize: '12px', color: '#888899' }}>{coach.user?.email}</span></td>
                    <td>
                      <span className={`status-badge ${coach.approval_status}`}>
                        {coach.approval_status === 'approved' ? '已核准' : 
                         coach.approval_status === 'pending' ? '待審核' :
                         coach.approval_status === 'rejected' ? '已拒絕' : '已停用'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {coach.approval_status !== 'approved' && (
                          <button onClick={() => handleReview(null, coach.user_id, 'approve')} style={{ fontSize: '12px', color: '#4ade80', background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>核准</button>
                        )}
                        {coach.approval_status !== 'suspended' ? (
                          <button onClick={() => handleReview(null, coach.user_id, 'suspend')} style={{ fontSize: '12px', color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>停用</button>
                        ) : (
                          <button onClick={() => handleReview(null, coach.user_id, 'approve')} style={{ fontSize: '12px', color: '#60a5fa', background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>恢復權限</button>
                        )}
                        <button 
                          onClick={() => {
                            if(window.confirm('確定要刪除這位教練的資格嗎？他們將會被降級為一般學員。')) {
                              handleReview(null, coach.user_id, 'delete_coach');
                            }
                          }} 
                          style={{ fontSize: '12px', color: '#888899', background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline', marginLeft: '4px' }}
                        >
                          刪除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style jsx>{`
        .tab-control {
          display: flex;
          background: rgba(255, 255, 255, 0.05);
          padding: 4px;
          border-radius: 12px;
          gap: 4px;
        }
        .tab-btn {
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          color: #888899;
          transition: 0.2s;
        }
        .tab-btn.active {
          background: #4cc9f0;
          color: #000;
        }
        .user-avatar-img {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          object-fit: cover;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .coach-list-full {
          grid-column: 1 / -1;
          background: #111118;
          border: 1px solid #2a2a35;
          border-radius: 24px;
          overflow-x: auto;
        }
        .admin-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }
        .admin-table th {
          text-align: left;
          padding: 16px 24px;
          background: rgba(255, 255, 255, 0.02);
          color: #888899;
          font-weight: 500;
        }
        .admin-table td {
          padding: 16px 24px;
          border-top: 1px solid #2a2a35;
        }
        .status-badge {
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
        }
        .status-badge.approved { background: rgba(6, 214, 160, 0.1); color: #06d6a0; }
        .status-badge.pending { background: rgba(255, 140, 66, 0.1); color: #ff8c42; }
        .status-badge.rejected { background: rgba(255, 59, 92, 0.1); color: #ff3b5c; }
        .status-badge.suspended { background: rgba(136, 136, 153, 0.1); color: #888899; }

        .admin-trust-center {
          min-height: 100vh;
          background: #0a0a0f;
          padding: 40px 24px;
          color: #e8e8f0;
          font-family: 'Noto Sans TC', sans-serif;
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          max-width: 1200px;
          margin: 0 auto 40px;
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
          max-width: 1200px;
          margin: 0 auto;
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
          background: #111118;
          border: 1px solid #2a2a35;
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
          background: #000;
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
          background: #fff;
          color: #000;
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
          color: #000;
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
          color: #888899;
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
          color: #000;
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
          color: #fff;
        }
      `}</style>
    </div>
  );
}
