'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { UserTiers, CoachTiers, AmbassadorTiers } from './components/Tiers';

export default function LevelsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('coach'); // 'user', 'coach', 'ambassador'
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    fetch('/api/settings/public')
      .then(res => res.json())
      .then(data => {
        if (data.settings) {
          setSettings(data.settings);
        }
      })
      .catch(err => console.error('Error fetching settings:', err));
  }, []);

  return (
    <div style={{ padding: '16px', marginTop: '-16px', paddingBottom: '100px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button 
          onClick={() => router.back()}
          style={{ background: 'transparent', border: 'none', color: 'var(--color-text)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <ArrowLeft size={24} />
        </button>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 900, color: 'var(--color-text)' }}>會員權益中心</h1>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: 'var(--color-surface)', borderRadius: '12px', padding: '6px', marginBottom: '24px', border: '1px solid var(--color-border)' }}>
        <TabButton active={activeTab === 'user'} onClick={() => setActiveTab('user')}>學員權益</TabButton>
        <TabButton active={activeTab === 'coach'} onClick={() => setActiveTab('coach')}>教練抽成</TabButton>
        <TabButton active={activeTab === 'ambassador'} onClick={() => setActiveTab('ambassador')}>推廣分潤</TabButton>
      </div>

      {/* Content */}
      {activeTab === 'user' && <UserTiers settings={settings} />}
      {activeTab === 'coach' && <CoachTiers settings={settings} />}
      {activeTab === 'ambassador' && <AmbassadorTiers settings={settings} />}
      
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: '12px 0',
        borderRadius: '8px',
        border: 'none',
        background: active ? 'var(--color-primary)' : 'transparent',
        color: active ? '#FFF' : 'var(--color-text-muted)',
        fontSize: '14px',
        fontWeight: 800,
        cursor: 'pointer',
        transition: 'all 0.2s ease'
      }}
    >
      {children}
    </button>
  );
}
