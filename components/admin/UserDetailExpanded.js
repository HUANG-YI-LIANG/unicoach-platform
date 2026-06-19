'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function UserDetailExpanded({ userId, onClose }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [activeTab, setActiveTab] = useState('deposit'); // deposit, withdrawal, class
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await fetch(`/api/admin/users/${userId}`);
        const data = await res.json();
        if (res.ok) {
          setUser(data.user);
        } else {
          setErrorMsg(data.error || 'API Error');
          console.error('API Error:', data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (userId) fetchDetail();
  }, [userId]);

  const handleReview = async (action) => {
    if (!user?.coach_info) return;
    setProcessing(true);
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coachUserId: user.id, action, reason: '' })
      });
      if (res.ok) {
        setUser({
          ...user,
          coach_info: {
            ...user.coach_info,
            approval_status: action === 'approve' ? 'approved' : action === 'suspend' ? 'suspended' : 'rejected'
          }
        });
      }
    } catch (err) {
      alert('操作失敗');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center text-[var(--color-text-muted)] bg-[#11141A]">
        <Loader2 className="animate-spin mr-2" /> 載入詳細資料中...
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="p-8 text-center text-red-400 bg-[#11141A]">
        載入失敗: {errorMsg}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 text-center text-[var(--color-text-muted)] bg-[#11141A]">
        無法載入會員資料
      </div>
    );
  }

  const deposits = user.transactions.filter(t => t.transaction_type === 'deposit' || t.amount > 0);
  const withdrawals = user.transactions.filter(t => t.transaction_type === 'withdrawal' || t.amount < 0);
  const classTxs = user.transactions.filter(t => t.transaction_type === 'class_payment' || t.transaction_type === 'coach_payout');

  const renderTxTable = (txs) => (
    <div className="tx-table-wrapper">
      {txs.length === 0 ? (
        <p className="no-data">尚無任何紀錄</p>
      ) : (
        <table className="tx-table">
          <thead>
            <tr>
              <th>時間</th>
              <th>類型</th>
              <th>金額</th>
              <th>說明</th>
            </tr>
          </thead>
          <tbody>
            {txs.map((t, idx) => (
              <tr key={idx}>
                <td>{new Date(t.created_at).toLocaleString()}</td>
                <td>{t.transaction_type}</td>
                <td className={t.amount > 0 ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                  {t.amount > 0 ? '+' : ''}{t.amount.toLocaleString()}
                </td>
                <td className="text-gray-400">{t.description || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div className="expanded-detail-container">
      <div className="info-sections">
        {/* Section 1: Basic Info */}
        <section className="info-section">
          <div className="section-header">
            <h2>帳號資訊</h2>
            <div className="section-actions">
              <button className="action-btn">修改基本資料</button>
              <button className="action-btn">重設密碼</button>
            </div>
          </div>
          <div className="section-content">
            <h3 className="sub-heading">基本資料</h3>
            <div className="data-list">
              <div className="data-row">
                <span className="label">帳號</span>
                <span className="value">{user.account}</span>
              </div>
              <div className="data-row">
                <span className="label">名稱</span>
                <span className="value">{user.name}</span>
              </div>
              <div className="data-row">
                <span className="label">級別</span>
                <span className="value">{user.level}</span>
              </div>
              <div className="data-row">
                <span className="label">總完課金額 / 總累積儲值</span>
                <span className="value highlight-link">
                  {user.total_classes_amount.toLocaleString()} / {user.total_deposit.toLocaleString()}
                </span>
              </div>
              <div className="data-row">
                <span className="label">手機號碼</span>
                <span className="value">{user.phone}</span>
              </div>
              <div className="data-row">
                <span className="label">手機號碼(備用1)</span>
                <span className="value">無</span>
              </div>
              <div className="data-row">
                <span className="label">手機號碼(備用2)</span>
                <span className="value">無</span>
              </div>
              <div className="data-row">
                <span className="label">電子郵件</span>
                <span className="value">{user.email}</span>
              </div>
              <div className="data-row">
                <span className="label">生日</span>
                <span className="value">未填寫</span>
              </div>
              
              {user.coach_info && (
                <div className="data-row">
                  <span className="label">教練帳號狀態</span>
                  <span className="value" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className={`status-badge ${user.coach_info.approval_status}`}>
                      {user.coach_info.approval_status === 'approved' ? '已核准' : 
                       user.coach_info.approval_status === 'pending' ? '待審核' :
                       user.coach_info.approval_status === 'rejected' ? '已拒絕' : '已停用'}
                    </span>
                    {user.coach_info.approval_status !== 'approved' && (
                      <button disabled={processing} onClick={() => handleReview('approve')} className="action-btn approve" style={{ padding: '4px 8px', fontSize: '12px' }}>核准</button>
                    )}
                    {user.coach_info.approval_status !== 'suspended' ? (
                      <button disabled={processing} onClick={() => handleReview('suspend')} className="action-btn suspend" style={{ padding: '4px 8px', fontSize: '12px' }}>停用</button>
                    ) : (
                      <button disabled={processing} onClick={() => handleReview('approve')} className="action-btn recover" style={{ padding: '4px 8px', fontSize: '12px' }}>恢復</button>
                    )}
                  </span>
                </div>
              )}

              <div className="data-row">
                <span className="label">是否允許登入</span>
                <span className="value flex items-center gap-2">允許登入 <span className="text-yellow-400">🔓</span></span>
              </div>
              <div className="data-row">
                <span className="label">是否允許預約</span>
                <span className="value flex items-center gap-2">允許預約 <span className="text-red-400">⭕</span></span>
              </div>
              <div className="data-row">
                <span className="label">備註</span>
                <span className="value">-</span>
              </div>
            </div>

            <h3 className="sub-heading mt-8">活動記錄</h3>
            <div className="data-list">
              <div className="data-row">
                <span className="label">帳號啟用時間</span>
                <span className="value">{new Date(user.created_at).toLocaleString()}</span>
              </div>
              <div className="data-row">
                <span className="label">最後更新時間</span>
                <span className="value">{new Date(user.created_at).toLocaleString()}</span>
              </div>
              <div className="data-row">
                <span className="label">最後登入 IP</span>
                <span className="value ip-text">2001:b011:7007:bfe9:e5c3:d188:2542:254f</span>
              </div>
              <div className="data-row">
                <span className="label">最後登入時間</span>
                <span className="value">{new Date(user.created_at).toLocaleString()}</span>
              </div>
              <div className="data-row">
                <span className="label">最後活動時間</span>
                <span className="value">無</span>
              </div>
              <div className="data-row">
                <span className="label">最後登入裝置</span>
                <span className="value">無</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Organization Info */}
        <section className="info-section">
          <div className="section-header">
            <h2>組織資訊</h2>
          </div>
          <div className="section-content">
            <div className="org-path">
              <span className="org-arrow">&gt;</span> 系統 / 平台會員
            </div>
            <div className="data-list mt-4">
              <div className="data-row">
                <span className="label">目前層級別名</span>
                <span className="value">{user.level}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="info-section">
          <div className="section-header">
            <h2>銀行帳戶</h2>
          </div>
          <div className="section-content">
            <div className="text-gray-400">目前尚未有任何銀行存摺資料</div>
          </div>
        </section>

        {/* Section 4: Transactions */}
        <section className="info-section">
          <div className="section-header">
            <h2>申請與轉點紀錄 (顯示近五筆紀錄)</h2>
          </div>
          <div className="section-content no-padding">
            <div className="tx-tabs">
              <button 
                className={`tx-tab ${activeTab === 'withdrawal' ? 'active' : ''}`}
                onClick={() => setActiveTab('withdrawal')}
              >出金</button>
              <button 
                className={`tx-tab ${activeTab === 'deposit' ? 'active' : ''}`}
                onClick={() => setActiveTab('deposit')}
              >儲值</button>
              <button 
                className={`tx-tab ${activeTab === 'class' ? 'active' : ''}`}
                onClick={() => setActiveTab('class')}
              >轉點(課程收付)</button>
            </div>
            <div className="tx-content">
              {activeTab === 'deposit' && renderTxTable(deposits)}
              {activeTab === 'withdrawal' && renderTxTable(withdrawals)}
              {activeTab === 'class' && renderTxTable(classTxs)}
            </div>
          </div>
        </section>
      </div>

      <style jsx>{`
        .expanded-detail-container {
          background: #11141A; /* slightly different from surface */
          padding: 30px;
          border-bottom: 2px solid var(--color-border);
          box-shadow: inset 0 4px 12px rgba(0,0,0,0.3);
        }
        
        .info-sections {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
        }
        @media (min-width: 1024px) {
          .info-sections {
            grid-template-columns: 1fr 1fr;
            align-items: start;
          }
          .info-section:first-child {
            grid-row: span 3;
          }
        }

        .info-section {
          background: rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 12px;
          overflow: hidden;
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255,255,255,0.03);
          padding: 12px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .section-header h2 {
          margin: 0;
          font-size: 16px;
          font-weight: 800;
          color: var(--text-light);
        }
        .section-actions {
          display: flex;
          gap: 8px;
        }
        .action-btn {
          background: rgba(255,255,255,0.1);
          border: none;
          color: var(--text-light);
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: bold;
          cursor: pointer;
          transition: 0.2s;
        }
        .action-btn:hover {
          background: rgba(255,255,255,0.2);
        }

        .section-content {
          padding: 20px;
        }
        .section-content.no-padding {
          padding: 0;
        }
        .sub-heading {
          margin: 0 0 16px;
          font-size: 14px;
          color: var(--color-text-muted);
          border-bottom: 1px solid rgba(255,255,255,0.05);
          padding-bottom: 8px;
        }
        .data-list {
          display: flex;
          flex-direction: column;
        }
        .data-row {
          display: flex;
          padding: 12px 0;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .data-row:last-child {
          border-bottom: none;
        }
        .data-row .label {
          width: 140px;
          flex-shrink: 0;
          color: var(--color-text-muted);
          font-size: 14px;
        }
        .data-row .value {
          color: var(--text-light);
          font-size: 14px;
          font-weight: bold;
        }
        .value.highlight-link {
          color: #4cc9f0;
          text-decoration: underline;
          cursor: pointer;
        }
        .ip-text {
          font-family: monospace;
          color: #f472b6 !important;
          font-size: 13px !important;
        }
        .mt-8 { margin-top: 32px; }

        .status-badge {
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
        }
        .status-badge.approved { background: rgba(6, 214, 160, 0.1); color: #06d6a0; }
        .status-badge.pending { background: rgba(255, 140, 66, 0.1); color: #ff8c42; }
        .status-badge.rejected { background: rgba(255, 59, 92, 0.1); color: #ff3b5c; }
        .status-badge.suspended { background: rgba(136, 136, 153, 0.1); color: var(--color-text-muted); }
        .action-btn.approve { background: rgba(74, 222, 128, 0.1); color: #4ade80; border: 1px solid rgba(74, 222, 128, 0.2); }
        .action-btn.recover { background: rgba(96, 165, 250, 0.1); color: #60a5fa; border: 1px solid rgba(96, 165, 250, 0.2); }
        .action-btn.suspend { background: rgba(250, 204, 21, 0.1); color: #facc15; border: 1px solid rgba(250, 204, 21, 0.2); }

        .org-path {
          background: rgba(255,255,255,0.05);
          padding: 12px;
          border-radius: 6px;
          font-weight: bold;
          color: var(--color-text-muted);
        }
        .org-arrow {
          color: var(--text-light);
          margin-right: 8px;
        }
        .mt-4 { margin-top: 16px; }

        .tx-tabs {
          display: flex;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          background: rgba(255,255,255,0.02);
        }
        .tx-tab {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--color-text-muted);
          padding: 12px;
          font-weight: bold;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: 0.2s;
        }
        .tx-tab.active {
          color: #4cc9f0;
          border-bottom: 2px solid #4cc9f0;
          background: rgba(76, 201, 240, 0.05);
        }

        .tx-content {
          padding: 20px;
        }
        .no-data {
          text-align: center;
          color: var(--color-text-muted);
          padding: 20px 0;
        }
        .tx-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .tx-table th {
          text-align: left;
          padding: 10px;
          color: var(--color-text-muted);
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .tx-table td {
          padding: 12px 10px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
      `}</style>
    </div>
  );
}
