'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import {
  ShieldCheck, ArrowRight, Activity, Settings, Wallet, Receipt, LogOut
} from 'lucide-react';

const BLUE = '#2563EB';
const DARK = '#0F172A';
const MUTED = '#64748B';
const BG = '#F8FAFC';
const WHITE = '#FFFFFF';

export default function AdminDashboard() {
  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { logout } = useAuth();

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/profile'),
      fetch('/api/bookings')
    ]).then(async ([profRes, bookRes]) => {
      if (!profRes.ok) return router.push('/login');
      const pData = await profRes.json();
      const bData = await bookRes.json();
      if (pData.profile) setProfile(pData.profile);
      if (bData.bookings) setBookings(bData.bookings);
      setLoading(false);
    });
  }, [router]);

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: MUTED }}>載入中...</div>;

  return (
    <div style={{ padding: '16px', marginTop: '-16px', position: 'relative', zIndex: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: DARK }}>管理員中心</h1>
        <button
          onClick={logout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: '#FEE2E2',
            color: '#DC2626',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={e => e.currentTarget.style.background = '#FECACA'}
          onMouseOut={e => e.currentTarget.style.background = '#FEE2E2'}
        >
          <LogOut size={18} />
          登出
        </button>
      </div>

      {/* -- Admin Management Center -- */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '16px',
        marginBottom: '24px'
      }}>
        
        {/* Verification */}
        <div 
          onClick={() => router.push('/admin/verification')}
          style={cardStyle('#DBEAFE', '#2563EB')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: '#DBEAFE', padding: '12px', borderRadius: '12px', color: '#2563EB' }}>
              <ShieldCheck size={28} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontWeight: 800, color: DARK }}>教練驗證中心</h3>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: MUTED }}>審核證照與學生證</p>
            </div>
          </div>
          <ArrowRight color="#CBD5E1" />
        </div>

        {/* Settings */}
        <div 
          onClick={() => router.push('/admin/settings')}
          style={cardStyle('#F1F5F9', '#475569')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: '#F1F5F9', padding: '12px', borderRadius: '12px', color: '#475569' }}>
              <Settings size={28} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontWeight: 800, color: DARK }}>全域參數設定</h3>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: MUTED }}>調整曠課、抽成等參數</p>
            </div>
          </div>
          <ArrowRight color="#CBD5E1" />
        </div>

        {/* Settlements */}
        <div 
          onClick={() => router.push('/admin/settlements')}
          style={cardStyle('#D1FAE5', '#059669')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: '#D1FAE5', padding: '12px', borderRadius: '12px', color: '#059669' }}>
              <Wallet size={28} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontWeight: 800, color: DARK }}>結算管理</h3>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: MUTED }}>產生與確認教練撥款</p>
            </div>
          </div>
          <ArrowRight color="#CBD5E1" />
        </div>

        {/* Payments */}
        <div
          onClick={() => router.push('/admin/payments')}
          style={cardStyle('#FEF3C7', '#D97706')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: '#FEF3C7', padding: '12px', borderRadius: '12px', color: '#D97706' }}>
              <Receipt size={28} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontWeight: 800, color: DARK }}>訂單付款審核</h3>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: MUTED }}>管理與修改平台收款帳號</p>
            </div>
          </div>
          <ArrowRight color="#CBD5E1" />
        </div>

        {/* Promotions and Discounts */}
        <div
          onClick={() => router.push('/admin/promotions')}
          style={cardStyle('#FCE7F3', '#DB2777')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: '#FCE7F3', padding: '12px', borderRadius: '12px', color: '#DB2777' }}>
              <Activity size={28} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontWeight: 800, color: DARK }}>抽成與折扣</h3>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: MUTED }}>個別教練抽成與全站通知</p>
            </div>
          </div>
          <ArrowRight color="#CBD5E1" />
        </div>
      </div>

      <h2 style={{ fontSize: '20px', fontWeight: 800, padding: '0 8px', color: DARK, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <Activity size={20} color={BLUE} />
        全站交易紀錄
      </h2>
      
      {bookings.length === 0 ? (
        <div style={{ background: WHITE, padding: '32px', textAlign: 'center', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', color: MUTED }}>
          系統尚無訂單
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {bookings.map(b => (
            <div key={b.id} style={{ background: WHITE, padding: '16px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', border: '1px solid #F1F5F9' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 800, fontSize: '14px', color: DARK }}>#{b.id.substring(0,8)}</span>
                <span style={{ background: '#F1F5F9', color: '#475569', fontSize: '12px', padding: '4px 8px', borderRadius: '6px', fontWeight: 800 }}>{b.status}</span>
               </div>
               <div style={{ fontSize: '12px', color: MUTED }}>從 {b.user_id.substring(0,6)} 到教練 {b.coach_id.substring(0,6)}</div>
               <div style={{ fontSize: '12px', fontWeight: 800, marginTop: '4px', color: '#059669' }}>
                 總付: NT${(b.final_price ?? b.base_price ?? 0).toLocaleString()} / 平台費: NT${(b.platform_fee ?? 0).toLocaleString()}
               </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function cardStyle(borderColor, hoverColor) {
  return {
    background: WHITE,
    padding: '24px',
    borderRadius: '16px',
    boxShadow: '0 4px 12px rgba(15,23,42,0.05)',
    border: `1px solid ${borderColor}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  };
}
