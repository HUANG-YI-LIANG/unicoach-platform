/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, User as UserIcon, Loader2, Building, CreditCard, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';

export default function UserDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('deposit'); // deposit, withdrawal, class
  const [processing, setProcessing] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '' });
  const [saving, setSaving] = useState(false);
  
  const [isCoachProfileOpen, setIsCoachProfileOpen] = useState(false);
  
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const fetchDetail = async () => {
      try {
        const res = await fetch(`/api/admin/users/${id}`);
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          router.push('/admin/users');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchDetail();
  }, [id, router]);

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

  const openEditModal = () => {
    setEditForm({ name: user?.name || '', phone: user?.phone || '' });
    setIsEditing(true);
  };

  const handleEditSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      if (res.ok) {
        setUser({ ...user, name: editForm.name, phone: editForm.phone });
        setIsEditing(false);
      } else {
        alert('儲存失敗');
      }
    } catch (err) {
      alert('發生錯誤');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-[var(--color-text-muted)]">
        <Loader2 className="animate-spin mr-2" /> 載入詳細資料中...
      </div>
    );
  }

  if (!user) return null;

  const deposits = user.transactions.filter(t => t.transaction_type === 'deposit' || t.amount > 0);
  const withdrawals = user.transactions.filter(t => t.transaction_type === 'withdrawal' || t.amount < 0);
  // Using all transactions for the third tab to show general flow if needed, or filter by class
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
    <div className="user-detail-page">
      <div className="page-header">
        <div className="breadcrumbs">
          <Link href="/dashboard/admin" className="crumb-link">首頁</Link> / 
          <Link href="/admin/users" className="crumb-link">會員管理</Link> / 
          <span className="crumb-current">會員帳號</span>
        </div>
        <h1 className="page-title">會員詳細</h1>
        <p className="page-subtitle">{new Date().toLocaleString()}</p>
      </div>

      <div className="content-card">
        <div className="card-top-actions">
          <Link href="/admin/users" className="back-btn">
            <ArrowLeft size={16} /> 返回列表
          </Link>
        </div>

        <div className="info-sections">
          {/* Section 1: Basic Info */}
          <section className="info-section">
            <div className="section-header">
              <h2>帳號資訊</h2>
              <div className="section-actions">
                <button className="action-btn" onClick={openEditModal}>修改基本資料</button>
                <button className="action-btn" onClick={() => alert('重設密碼功能開發中')}>重設密碼</button>
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

          {/* Section 1.5: Coach Detailed Profile */}
          {user.coach_info && (
            <section className="info-section">
              <div 
                className="section-header" 
                style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onClick={() => setIsCoachProfileOpen(!isCoachProfileOpen)}
              >
                <h2>教練詳細履歷 (認證審查用)</h2>
                <button style={{ background: 'transparent', border: 'none', color: 'var(--text-light)', display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '4px' }}>
                  {isCoachProfileOpen ? <><ChevronUp size={20} /> 收起</> : <><ChevronDown size={20} /> 展開</>}
                </button>
              </div>
              
              {isCoachProfileOpen && (
                <div className="section-content">
                  <div className="data-list">
                    <div className="data-row">
                      <span className="label">期望薪資 (底價)</span>
                      <span className="value">{user.coach_info.base_price ? `$${user.coach_info.base_price}` : '未填寫'}</span>
                    </div>
                    <div className="data-row">
                      <span className="label">上課地點 / 服務區域</span>
                      <span className="value">{user.coach_info.service_areas || user.coach_info.location || '未填寫'}</span>
                    </div>
                    <div className="data-row">
                      <span className="label">學歷與教學經驗</span>
                      <span className="value" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{user.coach_info.experience || '未填寫'}</span>
                    </div>
                    <div className="data-row">
                      <span className="label">核心教學理念</span>
                      <span className="value" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{user.coach_info.philosophy || '未填寫'}</span>
                    </div>
                    <div className="data-row">
                      <span className="label">教學特色與風格</span>
                      <span className="value" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{user.coach_info.teaching_features || '未填寫'}</span>
                    </div>
                    <div className="data-row">
                      <span className="label">溝通與互動方式</span>
                      <span className="value" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{user.coach_info.communication_style || '未填寫'}</span>
                    </div>
                    <div className="data-row">
                      <span className="label">請假與退費規則</span>
                      <span className="value" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{user.coach_info.policy_rules || '未填寫'}</span>
                    </div>
                    <div className="data-row">
                      <span className="label">照片與影片</span>
                      <span className="value" style={{ width: '100%' }}>
                        {(() => {
                          let photosList = [];
                          let videoUrl = user.coach_info.videos || '';
                          try {
                            if (Array.isArray(user.coach_info.photos)) {
                              photosList = user.coach_info.photos;
                            } else if (typeof user.coach_info.photos === 'string') {
                              photosList = JSON.parse(user.coach_info.photos);
                            }
                          } catch(e) {}

                          if (photosList.length === 0 && !videoUrl) return <span style={{ color: 'var(--color-text-muted)' }}>無提供多媒體內容</span>;

                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
                              {videoUrl && (
                                <div>
                                  <h4 style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>教學影片</h4>
                                  <a href={videoUrl} target="_blank" rel="noreferrer" style={{ color: '#60a5fa', textDecoration: 'underline' }}>{videoUrl}</a>
                                </div>
                              )}
                              {photosList.length > 0 && (
                                <div>
                                  <h4 style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>教學照片</h4>
                                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                    {photosList.map((photo, i) => (
                                      <a key={i} href={photo} target="_blank" rel="noreferrer" style={{ display: 'block', width: '120px', height: '120px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={photo} alt={`coach photo ${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

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
      </div>

      {mounted && isEditing && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div style={{ background: '#1A1D24', padding: '24px', borderRadius: '16px', width: '90%', maxWidth: '400px', border: '1px solid #2A2E35', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#FFF' }}>修改基本資料</h3>
            <div className="form-group">
              <label>名稱</label>
              <input 
                type="text" 
                value={editForm.name} 
                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>手機號碼</label>
              <input 
                type="text" 
                value={editForm.phone} 
                onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </div>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setIsEditing(false)}>取消</button>
              <button className="save-btn" onClick={handleEditSave} disabled={saving}>
                {saving ? '儲存中...' : '儲存'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <style jsx>{`
        /* === Edit Modal Styles === */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          padding: 24px;
          border-radius: 16px;
          width: 100%;
          max-width: 400px;
        }
        .modal-content h3 {
          margin-top: 0;
          margin-bottom: 20px;
          color: var(--color-text);
        }
        .form-group {
          margin-bottom: 16px;
        }
        .form-group label {
          display: block;
          margin-bottom: 8px;
          color: var(--color-text-muted);
          font-size: 14px;
        }
        .form-group input {
          width: 100%;
          padding: 10px;
          border-radius: 8px;
          border: 1px solid var(--color-border);
          background: rgba(0,0,0,0.2);
          color: var(--color-text);
        }
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
        }
        .cancel-btn {
          background: transparent;
          border: 1px solid var(--color-border);
          color: var(--color-text);
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
        }
        .save-btn {
          background: var(--color-primary);
          border: none;
          color: #000;
          font-weight: bold;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
        }

        .admin-user-detail-container {
          min-height: 100vh;
          background: var(--color-bg);
          padding: 30px 20px;
          color: var(--color-text);
          font-family: 'Noto Sans TC', sans-serif;
          max-width: 1000px;
          margin: 0 auto;
        }
        .page-header {
          margin-bottom: 24px;
        }
        .breadcrumbs {
          display: flex;
          gap: 8px;
          font-size: 13px;
          color: var(--color-text-muted);
          margin-bottom: 12px;
        }
        .crumb-link {
          color: #4cc9f0;
          text-decoration: none;
        }
        .crumb-current {
          color: var(--text-light);
        }
        .page-title {
          font-size: 24px;
          font-weight: 900;
          color: var(--text-light);
          margin: 0 0 4px;
        }
        .page-subtitle {
          font-size: 12px;
          color: var(--color-text-muted);
          margin: 0;
        }

        .content-card {
          background: var(--color-surface);
          border-radius: 12px;
          border: 1px solid var(--color-border);
          overflow: hidden;
        }
        .card-top-actions {
          padding: 16px 24px;
          border-bottom: 1px solid var(--color-border);
          background: rgba(255,255,255,0.02);
        }
        .back-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #4cc9f0;
          font-weight: bold;
          font-size: 14px;
          text-decoration: none;
          transition: 0.2s;
        }
        .back-btn:hover {
          opacity: 0.8;
        }

        .info-sections {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 32px;
        }
        .info-section {
          background: rgba(0,0,0,0.2);
          border: 1px solid var(--color-border);
          border-radius: 8px;
          overflow: hidden;
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255,255,255,0.03);
          padding: 12px 20px;
          border-bottom: 1px solid var(--color-border);
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
          border-bottom: 1px solid var(--color-border);
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
