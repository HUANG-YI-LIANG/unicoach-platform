'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { ChevronLeft, MessageCircle, Wallet, ShieldCheck, Clock } from 'lucide-react';

const BG = 'var(--bg-primary)';
const CARD = 'var(--bg-card)';
const ORANGE = 'var(--accent)';
const MUTED = 'var(--text-muted)';
const TEXT_LIGHT = 'var(--text-primary)';
const BORDER = 'var(--border)';

export default function SupportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const topic = searchParams.get('topic');
  const isWithdrawalTopic = topic === 'coach-withdrawal';

  return (
    <div className="mobile-container fade-in" style={{ backgroundColor: BG, minHeight: '100vh' }}>
      <header style={{
        padding: 'var(--padding-page)', paddingTop: '40px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button
          type="button"
          aria-label="返回上一頁"
          onClick={() => router.back()}
          className="btn-press"
          style={{
            width: 42, height: 42, borderRadius: 21, border: `1px solid ${BORDER}`,
            background: CARD, color: TEXT_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <p style={{ fontSize: 13, color: MUTED, margin: '0 0 2px' }}>客服中心</p>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: TEXT_LIGHT, margin: 0 }}>
            {isWithdrawalTopic ? '提領收益協助' : '需要幫忙嗎？'}
          </h1>
        </div>
      </header>

      <main style={{ padding: '0 var(--padding-page) 100px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <section style={{
          background: 'rgba(255, 138, 61, 0.08)', border: '1px solid rgba(255, 138, 61, 0.28)',
          borderRadius: 24, padding: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            {isWithdrawalTopic ? <Wallet size={20} color={ORANGE} /> : <MessageCircle size={20} color={ORANGE} />}
            <h2 style={{ fontSize: 17, fontWeight: 900, color: ORANGE, margin: 0 }}>
              {isWithdrawalTopic ? '提領前請先確認資料' : '我們可以協助你處理問題'}
            </h2>
          </div>
          <p style={{ margin: 0, fontSize: 14, color: TEXT_LIGHT, lineHeight: 1.7 }}>
            {isWithdrawalTopic
              ? '教練收益提領會由客服協助確認身分、收款資料與可提領金額，避免款項匯錯或資料不完整。'
              : '請選擇你遇到的問題類型，客服會協助你完成後續處理。'}
          </p>
        </section>

        <section style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 22, padding: 18 }}>
          <h3 style={{ fontSize: 16, fontWeight: 900, color: TEXT_LIGHT, margin: '0 0 14px' }}>客服會協助確認</h3>
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <ShieldCheck size={18} color={ORANGE} style={{ marginTop: 2 }} />
              <div>
                <h4 style={{ fontSize: 14, color: TEXT_LIGHT, margin: '0 0 4px' }}>身分與收款資料</h4>
                <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.55, margin: 0 }}>確認教練本人、收款帳戶與必要資料是否完整。</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <Wallet size={18} color={ORANGE} style={{ marginTop: 2 }} />
              <div>
                <h4 style={{ fontSize: 14, color: TEXT_LIGHT, margin: '0 0 4px' }}>可提領收益</h4>
                <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.55, margin: 0 }}>協助核對已完成課程、平台費用與實際可提領金額。</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <Clock size={18} color={ORANGE} style={{ marginTop: 2 }} />
              <div>
                <h4 style={{ fontSize: 14, color: TEXT_LIGHT, margin: '0 0 4px' }}>處理時間</h4>
                <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.55, margin: 0 }}>客服確認完成後，會告知預估匯款時間與下一步。</p>
              </div>
            </div>
          </div>
        </section>

        <button
          type="button"
          onClick={() => router.push('/chat?topic=coach-withdrawal')}
          className="btn-press"
          style={{
            width: '100%', border: 'none', borderRadius: 16, padding: '15px 18px',
            background: ORANGE, color: '#120B06', fontSize: 15, fontWeight: 900,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            cursor: 'pointer',
          }}
        >
          <MessageCircle size={18} />
          聯絡客服
        </button>
      </main>
    </div>
  );
}
