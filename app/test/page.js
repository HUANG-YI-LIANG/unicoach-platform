'use client';
import PromotionCard from '@/components/PromotionCard';

export default function TestPage() {
  const dummyUser = { promotion_code: 'TEST1234', wallet_balance: 500 };
  return (
    <div style={{ padding: 50 }}>
      <h1>Test Page</h1>
      <PromotionCard user={dummyUser} />
    </div>
  );
}
