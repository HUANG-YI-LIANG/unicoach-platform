/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Loader2, Search, RefreshCcw } from 'lucide-react';

export default function UserManagementAdmin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const filterCycle = ['all', 'user', 'coach', 'ambassador'];
  const filterLabels = {
    all: '全部帳號管理',
    user: '學員帳號管理',
    coach: '教練帳號管理',
    ambassador: '推廣大使管理'
  };
  const [currentFilterIdx, setCurrentFilterIdx] = useState(0);

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

  const activeRoleFilter = filterCycle[currentFilterIdx];
  const filteredUsers = users.filter(u => {
    const matchSearch = u.account?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        u.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = activeRoleFilter === 'all' ? true : u.role === activeRoleFilter;
    return matchSearch && matchRole;
  });

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
          <button 
            className="role-cycle-btn"
            onClick={() => setCurrentFilterIdx((prev) => (prev + 1) % 4)}
          >
            {filterLabels[activeRoleFilter]}
          </button>
          <button onClick={fetchUsers} className="refresh-btn">
            <RefreshCcw size={18} />
          </button>
        </div>
      </header>

      <div className="grid-container">
        {loading ? (
          <div className="loading-state">
            <Loader2 className="animate-spin" size={40} />
            <p>正在載入會員資料...</p>
          </div>
        ) : (
          <div className="users-grid">
            {filteredUsers.length === 0 ? (
              <div className="empty-state">
                找不到符合條件的會員
              </div>
            ) : (
              filteredUsers.map(user => (
                <div 
                  key={user.id} 
                  className={`user-circle-card ${user.role || 'user'}`}
                  onClick={() => router.push(`/admin/users/${user.id}`)}
                  title={`${user.name || '未命名'} (${user.account})`}
                >
                  <div className="avatar-circle">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.name} />
                    ) : (
                      <span>{(user.name || user.account || '?').charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="user-name-tag">{user.name || '未命名'}</div>
                  <div className={`role-dot ${user.role || 'user'}`}></div>
                </div>
              ))
            )}
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
          flex-wrap: wrap;
        }
        .search-box {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          padding: 10px 16px;
          border-radius: 12px;
          width: 250px;
        }
        .search-box input {
          background: transparent;
          border: none;
          color: var(--text-light);
          outline: none;
          width: 100%;
        }
        .role-cycle-btn {
          background: rgba(96, 165, 250, 0.15);
          color: #60a5fa;
          border: 1px solid rgba(96, 165, 250, 0.3);
          padding: 10px 20px;
          border-radius: 12px;
          font-weight: 800;
          cursor: pointer;
          transition: 0.2s;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .role-cycle-btn:hover {
          background: rgba(96, 165, 250, 0.25);
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

        .grid-container {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 20px;
          padding: 24px;
          min-height: 400px;
        }
        .loading-state {
          height: 300px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--color-text-muted);
          gap: 16px;
        }
        .users-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          gap: 30px;
        }
        .user-circle-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          position: relative;
          transition: transform 0.2s;
        }
        .user-circle-card:hover {
          transform: translateY(-5px);
        }
        .avatar-circle {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: rgba(255,255,255,0.05);
          border: 3px solid var(--color-border);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          color: var(--text-light);
          font-size: 28px;
          font-weight: bold;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        .avatar-circle img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .user-circle-card.coach .avatar-circle {
          border-color: #4ade80;
        }
        .user-circle-card.ambassador .avatar-circle {
          border-color: #f472b6;
        }
        .user-circle-card.user .avatar-circle {
          border-color: #60a5fa;
        }
        .user-name-tag {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-light);
          text-align: center;
          max-width: 100px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .role-dot {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          position: absolute;
          top: 0;
          right: 5px;
          border: 3px solid var(--color-surface);
        }
        .role-dot.coach { background: #4ade80; }
        .role-dot.user { background: #60a5fa; }
        .role-dot.ambassador { background: #f472b6; }
        
        .empty-state {
          grid-column: 1 / -1;
          text-align: center;
          padding: 60px 0;
          color: var(--color-text-muted);
          font-size: 16px;
        }
      `}</style>
    </div>
  );
}
