'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Loader2, Search, Filter, ShieldCheck, Mail, Info, RefreshCcw } from 'lucide-react';
import Link from 'next/link';
import UserDetailExpanded from '@/components/admin/UserDetailExpanded';

export default function UserManagementAdmin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const router = useRouter();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(users.map(u => u.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleExpand = (id) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const filteredUsers = users.filter(u => 
    u.account?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="admin-member-page">
      <header className="page-header">
        <div className="header-content">
          <div className="icon-badge">
            <Users size={28} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[var(--text-light)]">會員管理中心</h1>
            <p className="text-sm text-[var(--color-text-muted)]">總覽學員與教練帳號、金流與登入紀錄</p>
          </div>
        </div>
        <div className="header-actions">
          <div className="search-box">
            <Search size={18} className="text-[var(--color-text-muted)]" />
            <input 
              type="text" 
              placeholder="搜尋帳號或名稱..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={fetchUsers} className="refresh-btn">
            <RefreshCcw size={18} />
          </button>
        </div>
      </header>

      <div className="table-container">
        {loading ? (
          <div className="loading-state">
            <Loader2 className="animate-spin" size={40} />
            <p>正在載入會員資料...</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="dense-table">
              <thead>
                <tr>
                  <th className="sticky-col checkbox-col">
                    <input 
                      type="checkbox" 
                      onChange={handleSelectAll} 
                      checked={selectedIds.length === users.length && users.length > 0} 
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
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-[var(--color-text-muted)]">
                      找不到符合條件的會員
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(user => (
                    <tr key={user.id} className={selectedIds.includes(user.id) ? 'selected-row' : ''}>
                      <td className="sticky-col checkbox-col">
                        <input 
                          type="checkbox" 
                          checked={selectedIds.includes(user.id)}
                          onChange={() => handleSelect(user.id)}
                        />
                      </td>
                      <td className="sticky-col action-col">
                        <button 
                          onClick={() => toggleExpand(user.id)}
                          className="detail-btn"
                        >
                          {expandedRows.has(user.id) ? '收起' : '詳細'}
                        </button>
                      </td>
                      <td className="path-col">
                        <div className="path-box">
                          <span>&gt; {user.role === 'coach' ? '教練' : '學員'}</span>
                          <span className="path-sub">/ 系統</span>
                        </div>
                      </td>
                      <td className="account-col">
                        <div className="account-info">
                          <span className="account-id">{user.account}</span>
                          <div className="account-name-row">
                            <span className="account-name">{user.name}</span>
                            <Info size={14} className="text-blue-400" />
                          </div>
                          <span className={`role-badge ${user.role}`}>
                            {user.role === 'coach' ? '認證教練' : '標準學員'}
                          </span>
                        </div>
                      </td>
                      <td className="wallet-col">
                        <div className="wallet-grid">
                          <div className="wallet-item">
                            <span className="label">錢包總餘額</span>
                            <span className="value highlight">{user.wallet_balance.toLocaleString()}</span>
                          </div>
                          <div className="wallet-item">
                            <span className="label">總完課金額</span>
                            <span className="value">{user.total_classes_amount.toLocaleString()}</span>
                          </div>
                          <div className="wallet-item">
                            <span className="label">總出金</span>
                            <span className="value">{user.total_withdrawal.toLocaleString()}</span>
                          </div>
                          <div className="wallet-item">
                            <span className="label">總儲值</span>
                            <span className="value">{user.total_deposit.toLocaleString()}</span>
                          </div>
                        </div>
                      </td>
                      <td className="time-col">
                        <div className="time-info">
                          <div className="time-row">
                            <span className="label">登入 :</span>
                            <span className="value">{new Date(user.last_login_time).toLocaleString()}</span>
                          </div>
                          <div className="time-row">
                            <span className="label">IP :</span>
                            <span className="value ip">{user.last_login_ip}</span>
                          </div>
                          <div className="time-row mt-2">
                            <span className="label">註冊 :</span>
                            <span className="value">{new Date(user.created_at).toLocaleString()}</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )).reduce((acc, row, index) => {
                    const user = filteredUsers[index];
                    acc.push(row);
                    if (expandedRows.has(user.id)) {
                      acc.push(
                        <tr key={`expanded-${user.id}`} className="expanded-row-container">
                          <td colSpan="6" style={{ padding: 0 }}>
                            <UserDetailExpanded userId={user.id} />
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
        .admin-member-page {
          min-height: 100vh;
          background: var(--color-bg);
          padding: 40px 24px;
          color: var(--color-text);
          font-family: 'Noto Sans TC', sans-serif;
        }
        .page-header {
          display: flex;
          flex-direction: column;
          gap: 20px;
          max-width: 1400px;
          margin: 0 auto 30px;
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
          background: rgba(96, 165, 250, 0.1);
          border: 1px solid rgba(96, 165, 250, 0.2);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .header-actions {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .search-box {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          padding: 10px 16px;
          border-radius: 12px;
          width: 300px;
        }
        .search-box input {
          background: transparent;
          border: none;
          color: var(--text-light);
          outline: none;
          width: 100%;
        }
        .refresh-btn {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          color: var(--color-text-muted);
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: 0.2s;
        }
        .refresh-btn:hover {
          background: rgba(255,255,255,0.05);
          color: var(--text-light);
        }

        .table-container {
          max-width: 1400px;
          margin: 0 auto;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 20px;
          overflow: hidden;
        }
        .loading-state {
          height: 400px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--color-text-muted);
          gap: 16px;
        }
        .table-wrapper {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
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

        /* Sticky Columns */
        .sticky-col {
          position: sticky;
          background: var(--color-surface);
          z-index: 10;
        }
        .dense-table tr:hover .sticky-col {
          background: #1a1e27; /* slightly lighter surface */
        }
        .dense-table tr.selected-row .sticky-col {
          background: #1a2233;
        }
        .dense-table th.sticky-col {
          background: #151821;
          z-index: 11;
        }
        .checkbox-col {
          left: 0;
          width: 50px;
          text-align: center;
        }
        .action-col {
          left: 50px;
          width: 80px;
          border-right: 1px solid var(--color-border);
        }
        
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
        .detail-btn:hover {
          background: #4cc9f0;
          color: #000;
        }

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
        .path-sub {
          color: #fbbf24; /* yellow/orange like screenshot */
          padding-left: 12px;
        }

        .account-info {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .account-id {
          color: #f472b6; /* pinkish like screenshot */
          font-family: monospace;
          font-size: 14px;
        }
        .account-name-row {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--text-light);
          font-weight: bold;
        }
        .role-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 800;
          width: fit-content;
        }
        .role-badge.coach { background: rgba(74, 222, 128, 0.15); color: #4ade80; }
        .role-badge.user { background: rgba(96, 165, 250, 0.15); color: #60a5fa; }

        .wallet-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px 24px;
        }
        .wallet-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .wallet-item .label {
          color: #4cc9f0;
          font-weight: 700;
        }
        .wallet-item .value {
          color: var(--color-text-muted);
          font-family: monospace;
          font-size: 14px;
        }
        .wallet-item .value.highlight {
          color: var(--text-light);
          font-weight: bold;
        }

        .time-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .time-row {
          display: flex;
          gap: 8px;
        }
        .time-row .label {
          color: var(--color-text-muted);
          width: 40px;
        }
        .time-row .value {
          color: var(--text-light);
        }
        .time-row .ip {
          color: #f472b6;
          font-family: monospace;
        }
        .mt-2 { margin-top: 8px; }
      `}</style>
    </div>
  );
}
