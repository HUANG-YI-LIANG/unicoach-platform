'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { Check, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'coach') router.replace('/dashboard/coach');
      else if (user.role === 'admin') router.replace('/dashboard/admin');
      else router.replace('/dashboard/user');
    }
  }, [user, loading, router]);

  if (loading && user) {
    return (
      <div style={{ height: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  // If user is logged in, keep showing loading/blank while redirecting
  if (user) {
    return (
      <div style={{ height: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
        正在進入專屬畫面...
      </div>
    );
  }

  return (
    <div className="home-wrapper">
      <div className="home-main">
        <div className="brand-header">UniCoach</div>

        <div className="hero-section">
          <p className="hero-subtext">找到適合你的</p>
          <h1 className="hero-headline">UNI教練</h1>
        </div>

        <div className="cta-wrapper">
          <Link href="/register?role=user" className="cta-primary">
            我要找教練（註冊）
          </Link>
          <Link href="/register?role=coach" className="cta-secondary">
            我要當教練（註冊）
          </Link>
        </div>

        <div className="trust-block">
          {TRUST_ITEMS.map((item, idx) => (
            <div key={idx} className="trust-row">
               <Check size={18} strokeWidth={3} className="trust-icon" />
               <span className="trust-label">{item}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="disclaimer-footer">
        平台僅提供媒合服務，運動課程具有風險，請自行評估身體狀況，未成年需監護人同意。
      </div>
    </div>
  );
}

const TRUST_ITEMS = [
  '已有真實上課評價',
  '每堂課都有學習紀錄卡',
  '平台保障預約與爭議處理'
];
