'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';

export default function UserDetailExpanded({ userId, onClose }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [activeTab, setActiveTab] = useState('deposit'); // deposit, withdrawal, class
  const [activeBookingTab, setActiveBookingTab] = useState('student'); // student, coach
  const [activeReviewTab, setActiveReviewTab] = useState('received'); // received, given
  const [processing, setProcessing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '' });
  const [saving, setSaving] = useState(false);

  const [isBankEditing, setIsBankEditing] = useState(false);
  const [bankEditForm, setBankEditForm] = useState({ bank_code: '', bank_account_number: '' });
  const [savingBank, setSavingBank] = useState(false);

  const [warningLoading, setWarningLoading] = useState(false);
  
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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

  const openEditModal = () => {
    setEditForm({ name: user?.name || '', phone: user?.phone || '' });
    setIsEditing(true);
  };

  const handleEditSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
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

  const openBankEditModal = () => {
    setBankEditForm({ 
      bank_code: user?.bank_info?.bank_code || '', 
      bank_account_number: user?.bank_info?.bank_account_number || '' 
    });
    setIsBankEditing(true);
  };

  const handleBankEditSave = async () => {
    setSavingBank(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bank_info: bankEditForm })
      });
      if (res.ok) {
        setUser({ ...user, bank_info: bankEditForm });
        setIsBankEditing(false);
      } else {
        alert('儲存銀行資訊失敗');
      }
    } catch (err) {
      alert('發生錯誤');
    } finally {
      setSavingBank(false);
    }
  };

  const handleWarning = async () => {
    if (!confirm('確定要發送警告給此使用者嗎？這會透過客服訊息發送警告。若滿三次將會凍結帳號。')) return;
    setWarningLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/warning`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        setUser({ ...user, warning_count: data.count, is_frozen: data.is_frozen });
        alert(`警告發送成功！目前累計警告次數：${data.count}/3${data.is_frozen ? ' (帳號已凍結)' : ''}`);
      } else {
        alert('發送警告失敗: ' + (data.error || '未知錯誤'));
      }
    } catch (err) {
      alert('發生錯誤');
    } finally {
      setWarningLoading(false);
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

  const renderBookingTable = (bookings) => (
    <div className="tx-table-wrapper">
      {bookings.length === 0 ? (
        <p className="no-data">尚無任何紀錄</p>
      ) : (
        <table className="tx-table">
          <thead>
            <tr>
              <th>上課時間</th>
              <th>課程名稱</th>
              <th>狀態</th>
              <th>時長</th>
              <th>實收/應付</th>
            </tr>
          </thead>
          <tbody>
            {bookings.slice(0, 5).map((b, idx) => (
              <tr key={idx}>
                <td>{new Date(b.expected_time).toLocaleString()}</td>
                <td>{b.plan_title || b.service_title || '-'}</td>
                <td>
                  <span className={`status-badge ${b.status === 'completed' ? 'approved' : b.status === 'cancelled' ? 'rejected' : 'pending'}`} style={{ padding: '2px 6px', fontSize: '11px' }}>
                    {b.status === 'completed' ? '已完成' : b.status === 'cancelled' ? '已取消' : '未完成'}
                  </span>
                </td>
                <td>{b.duration_minutes} 分鐘</td>
                <td>$ {b.final_price?.toLocaleString() || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const renderReviewTable = (reviews) => (
    <div className="tx-table-wrapper">
      {reviews.length === 0 ? (
        <p className="no-data">尚無任何評價</p>
      ) : (
        <table className="tx-table">
          <thead>
            <tr>
              <th>時間</th>
              <th>課程</th>
              <th>評分</th>
              <th>內容</th>
            </tr>
          </thead>
          <tbody>
            {reviews.slice(0, 5).map((r, idx) => (
              <tr key={idx}>
                <td style={{ whiteSpace: 'nowrap' }}>{new Date(r.created_at).toLocaleDateString()}</td>
                <td style={{ maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.booking?.plan_title || r.booking?.service_title || '未知課程'}
                </td>
                <td className="text-yellow-400 font-bold">
                  ★ {r.rating}
                </td>
                <td className="text-gray-400" style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.comment || '-'}
                </td>
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

        {/* Section 2.5: Coach Details (Only for coaches) */}
        {user.role === 'coach' && user.coach_info && (
          <section className="info-section">
            <div className="section-header">
              <h2>教練詳細資訊</h2>
            </div>
            <div className="section-content">
              <div className="data-list">
                <div className="data-row">
                  <span className="label">上課地區 / 縣市</span>
                  <span className="value">{user.coach_info.location || '未填寫'}</span>
                </div>
                <div className="data-row">
                  <span className="label">服務項目 / 分類</span>
                  <span className="value">
                    {Array.isArray(user.coach_info.service_areas) 
                      ? user.coach_info.service_areas.join(', ') 
                      : user.coach_info.service_areas || '未填寫'}
                  </span>
                </div>
                <div className="data-row">
                  <span className="label">預設每小時底價</span>
                  <span className="value">NT$ {user.coach_info.base_price || 0}</span>
                </div>
                <div className="data-row">
                  <span className="label">最高學歷</span>
                  <span className="value">{user.coach_info.university || '未填寫'}</span>
                </div>
                <div className="data-row">
                  <span className="label">相關經歷與證照</span>
                  <span className="value">{user.coach_info.experience || '未填寫'}</span>
                </div>
                <div className="data-row">
                  <span className="label">教學理念</span>
                  <span className="value">
                    <div style={{ whiteSpace: 'pre-wrap', maxHeight: '100px', overflowY: 'auto', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                      {user.coach_info.philosophy || '未填寫'}
                    </div>
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Section: Warnings */}
        <section className="info-section" style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}>
          <div className="section-header">
            <h2 style={{ color: '#ef4444' }}>平台規範與警告</h2>
            <div className="section-actions">
              <button 
                className="action-btn" 
                onClick={handleWarning} 
                disabled={warningLoading || user.is_frozen}
                style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}
              >
                {warningLoading ? '發送中...' : '發出警告通知'}
              </button>
            </div>
          </div>
          <div className="section-content">
            <div className="data-list">
              <div className="data-row">
                <span className="label">累計警告次數</span>
                <span className="value" style={{ color: user.warning_count >= 2 ? '#ef4444' : '#fff' }}>
                  {user.warning_count || 0} / 3
                </span>
              </div>
              <div className="data-row">
                <span className="label">帳號狀態</span>
                <span className="value" style={{ color: user.is_frozen ? '#ef4444' : '#22c55e' }}>
                  {user.is_frozen ? '已凍結 (被踢出)' : '正常'}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="info-section">
          <div className="section-header">
            <h2>銀行帳戶</h2>
            <div className="section-actions">
              <button className="action-btn" onClick={openBankEditModal}>編輯銀行帳戶</button>
            </div>
          </div>
          <div className="section-content">
            {user.bank_info ? (
              <div className="data-list">
                <div className="data-row">
                  <span className="label">銀行代碼</span>
                  <span className="value">{user.bank_info.bank_code}</span>
                </div>
                <div className="data-row">
                  <span className="label">帳號</span>
                  <span className="value">{user.bank_info.bank_account_number}</span>
                </div>
              </div>
            ) : (
              <div className="text-gray-400">目前尚未有任何銀行存摺資料</div>
            )}
          </div>
        </section>

        {/* Section 4: Class Details */}
        <section className="info-section">
          <div className="section-header">
            <h2>上課明細 (顯示近五筆紀錄)</h2>
          </div>
          <div className="section-content no-padding">
            <div className="tx-tabs">
              <button 
                className={`tx-tab ${activeBookingTab === 'student' ? 'active' : ''}`}
                onClick={() => setActiveBookingTab('student')}
              >作為學員</button>
              {user.role === 'coach' && (
                <button 
                  className={`tx-tab ${activeBookingTab === 'coach' ? 'active' : ''}`}
                  onClick={() => setActiveBookingTab('coach')}
                >作為教練</button>
              )}
            </div>
            <div className="tx-content">
              {activeBookingTab === 'student' && renderBookingTable(user.student_bookings || [])}
              {activeBookingTab === 'coach' && user.role === 'coach' && renderBookingTable(user.coach_bookings || [])}
            </div>
          </div>
        </section>

        {/* Section 4.5: Class Reviews */}
        <section className="info-section">
          <div className="section-header">
            <h2>上課評價明細 (顯示近五筆紀錄)</h2>
          </div>
          <div className="section-content no-padding">
            <div className="tx-tabs">
              {user.role === 'coach' && (
                <button 
                  className={`tx-tab ${activeReviewTab === 'received' ? 'active' : ''}`}
                  onClick={() => setActiveReviewTab('received')}
                >收到的評價 (作為教練)</button>
              )}
              <button 
                className={`tx-tab ${activeReviewTab === 'given' ? 'active' : ''}`}
                onClick={() => setActiveReviewTab('given')}
              >給出的評價 (作為學員)</button>
            </div>
            <div className="tx-content">
              {activeReviewTab === 'received' && user.role === 'coach' && renderReviewTable(user.received_reviews || [])}
              {activeReviewTab === 'given' && renderReviewTable(user.given_reviews || [])}
            </div>
          </div>
        </section>

        {/* Section 5: Transactions */}
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

      {mounted && isBankEditing && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div style={{ background: '#1A1D24', padding: '24px', borderRadius: '16px', width: '90%', maxWidth: '400px', border: '1px solid #2A2E35', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#FFF' }}>編輯銀行帳戶</h3>
            <div className="form-group">
              <label>銀行代碼</label>
              <input 
                type="text" 
                value={bankEditForm.bank_code} 
                onChange={e => setBankEditForm({ ...bankEditForm, bank_code: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>銀行帳號</label>
              <input 
                type="text" 
                value={bankEditForm.bank_account_number} 
                onChange={e => setBankEditForm({ ...bankEditForm, bank_account_number: e.target.value })}
              />
            </div>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setIsBankEditing(false)}>取消</button>
              <button className="save-btn" onClick={handleBankEditSave} disabled={savingBank}>
                {savingBank ? '儲存中...' : '儲存'}
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
