'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useAdminMode } from '@/components/AdminModeContext';
import { 
  ShieldCheck, LayoutDashboard, Settings, Wallet, 
  MessageSquare, Users, Receipt, Activity 
} from 'lucide-react';

export default function AdminSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { toggleDesktopMode } = useAdminMode();

  const navItems = [
    { label: '總覽', path: '/dashboard/admin', icon: <LayoutDashboard size={20} /> },
    { label: '用戶與教練', path: '/admin/users', icon: <Users size={20} /> },
    { label: '客服收件匣', path: '/dashboard/admin/support', icon: <MessageSquare size={20} /> },
    { label: '信任與安全', path: '/admin/verification', icon: <ShieldCheck size={20} /> },
    { label: '儲值與訂單', path: '/dashboard/admin/topups', icon: <Wallet size={20} /> },
    { label: '提領與對帳', path: '/admin/settlements', icon: <Receipt size={20} /> },
    { label: '平台參數設定', path: '/admin/settings', icon: <Settings size={20} /> },
    { label: '福利與通知推播', path: '/admin/promotions', icon: <Activity size={20} /> },
  ];

  return (
    <aside style={{
      width: '240px',
      height: '100dvh',
      background: 'var(--color-surface)',
      borderRight: '1px solid var(--color-border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 16px',
      position: 'sticky',
      top: 0,
      overflowY: 'auto'
    }}>
      <div style={{ marginBottom: '32px', paddingLeft: '8px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--color-text)' }}>
          UniCoach<span style={{ color: 'var(--color-primary)' }}>.</span>
        </h2>
        <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--color-text-muted)' }}>管理員中心</p>
      </div>

      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {navItems.map((item) => {
          const isActive = pathname === item.path || (item.path !== '/dashboard/admin' && pathname.startsWith(item.path));
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                width: '100%',
                background: isActive ? 'var(--color-primary-bg, rgba(255, 138, 61, 0.1))' : 'transparent',
                color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                border: 'none',
                borderRadius: '12px',
                fontWeight: isActive ? 700 : 500,
                fontSize: '14px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={e => !isActive && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
              onMouseOut={e => !isActive && (e.currentTarget.style.background = 'transparent')}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </nav>

      <div style={{ marginTop: 'auto', paddingTop: '24px', borderTop: '1px solid var(--color-border)' }}>
        <button
          onClick={toggleDesktopMode}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px',
            width: '100%',
            background: 'transparent',
            color: 'var(--color-text-muted)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
          onMouseOut={e => e.currentTarget.style.background = 'transparent'}
        >
          📱 返回手機版模式
        </button>
      </div>
    </aside>
  );
}
