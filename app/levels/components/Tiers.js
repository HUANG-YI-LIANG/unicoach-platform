import { Star, Shield, Crown, Zap, Gift, Target, Medal } from 'lucide-react';

export function UserTiers({ settings }) {
  const baseDiscount = settings?.user_rebate_discount || '5';
  const tiers = settings?.user_tier_discounts || [];
  const depositBonus = settings?.deposit_bonus_tiers || [];

  const tierColors = ['#CD7F32', '#C0C0C0', '#FFD700', '#E5E4E2', '#B9F2FF'];
  const tierNames = ['青銅學員 (Bronze)', '白銀學員 (Silver)', '黃金學員 (Gold)', '白金學員 (Platinum)', '鑽石學員 (Diamond)'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02))', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 900, margin: '0 0 8px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Gift size={20} color="var(--color-primary)" />
          學員點數回饋機制
        </h2>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          累積消費即可升級，等級越高，預約課程可獲得的點數回饋越多！預設回饋為 {baseDiscount}%。
        </p>
      </div>

      {tiers.length === 0 ? (
        <TierCard 
          level="一般學員" 
          requirement="註冊即享有"
          benefit={`${baseDiscount}% 消費回饋`}
          perks={['基本客服支援']}
          color="#CD7F32"
        />
      ) : (
        tiers.map((tier, idx) => {
          let reqText = [];
          if (tier.requirement?.revenue) reqText.push(`累積消費 ${tier.requirement.revenue} 點`);
          if (tier.requirement?.completed_sessions) reqText.push(`累積完課 ${tier.requirement.completed_sessions} 堂`);
          const reqStr = reqText.length > 0 ? reqText.join(' + ') : '無特殊門檻';
          
          let perks = ['基本客服支援'];
          // Find if there's a deposit bonus that matches or is close to this level (for illustration)
          const bonus = depositBonus[idx] || depositBonus[depositBonus.length - 1];
          if (bonus) {
            perks.push(`單筆儲值滿 ${bonus.deposit} 送 ${bonus.bonus} 點`);
          }

          return (
            <TierCard 
              key={idx}
              level={tierNames[idx % tierNames.length]} 
              requirement={reqStr}
              benefit={`${tier.discount}% 消費回饋`}
              perks={perks}
              color={tierColors[idx % tierColors.length]}
            />
          );
        })
      )}
    </div>
  );
}

export function CoachTiers({ settings }) {
  const baseRate = settings?.commission_rate || '45';
  const tiers = settings?.coach_tier_rates || [];
  const topSettings = settings?.top_coach_settings || { top_n: 50, bonus_discount: 5 };

  const tierColors = ['#4CAF50', '#CD7F32', '#C0C0C0', '#E5E4E2', '#B9F2FF'];
  const tierNames = ['見習教練 (Trainee)', '新銳教練 (Bronze)', '專業教練 (Silver)', '白金教練 (Platinum)', '鑽石教練 (Diamond)'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ background: 'linear-gradient(135deg, #FFDF73 0%, #D4AF37 100%)', padding: '24px 20px', borderRadius: '16px', color: '#000', position: 'relative', overflow: 'hidden', boxShadow: '0 8px 32px rgba(212, 175, 55, 0.2)' }}>
        <Medal size={48} style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.2 }} />
        <h2 style={{ fontSize: '20px', fontWeight: 900, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Crown size={24} />
          創始先鋒教練專屬 (前 {topSettings.top_n} 名)
        </h2>
        <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, lineHeight: 1.5 }}>
          感謝您在平台初期的信任！平台前 {topSettings.top_n} 位註冊審核通過的教練，將永久獲得「Pioneer 創始徽章」，且未來所有的平台抽成 <strong style={{ color: '#D32F2F', fontSize: '16px' }}>終身再減 {topSettings.bonus_discount}%</strong>！
        </p>
      </div>

      <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 900, margin: '0 0 8px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Target size={20} color="var(--color-primary)" />
          教練晉升與抽成制度
        </h2>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          預設未分級抽成為 {baseRate}%。累積完課數並保持高星級評價即可升級。等級越高，平台抽成越低！
        </p>
      </div>

      {tiers.length === 0 ? (
        <CoachTierCard 
          level="一般教練" 
          requirement="預設狀態"
          fee={`${baseRate}%`}
          pioneerFee={`${Math.max(0, Number(baseRate) - Number(topSettings.bonus_discount))}%`}
          perks={['標準排序']}
          color="#4CAF50"
        />
      ) : (
        tiers.map((tier, idx) => {
          let reqText = [];
          if (tier.requirement?.completed_sessions) reqText.push(`${tier.requirement.completed_sessions} 堂課以上`);
          if (tier.requirement?.min_rating) reqText.push(`平均 > ${tier.requirement.min_rating} 星`);
          if (tier.requirement?.revenue) reqText.push(`營收 > ${tier.requirement.revenue}`);
          if (tier.requirement?.required_title) reqText.push(`需有「${tier.requirement.required_title}」`);
          const reqStr = reqText.length > 0 ? reqText.join(' + ') : '無特殊門檻';

          return (
            <CoachTierCard 
              key={idx}
              level={tierNames[idx % tierNames.length]} 
              requirement={reqStr}
              fee={`${tier.rate}%`}
              pioneerFee={`${Math.max(0, Number(tier.rate) - Number(topSettings.bonus_discount))}%`}
              perks={['搜尋排序權重提升']}
              color={tierColors[idx % tierColors.length]}
            />
          );
        })
      )}
    </div>
  );
}

export function AmbassadorTiers({ settings }) {
  const singleRate = settings?.referral_commission_rate || '3';
  const doubleRate = settings?.double_referral_commission_rate || '2.5';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02))', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 900, margin: '0 0 8px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={20} color="var(--color-primary)" />
          推廣大使分潤制度
        </h2>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          邀請好友註冊成為學員或教練。當他們在平台上產生交易，您就能終身抽取該筆訂單總額的分潤！
        </p>
        <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', fontSize: '13px', color: 'var(--text-primary)' }}>
          <strong style={{ color: 'var(--color-primary)' }}>單邊推廣：</strong> 您邀請的會員進行交易，您抽 <strong>{singleRate}%</strong><br/>
          <strong style={{ color: 'var(--color-primary)' }}>雙邊推廣：</strong> 若雙方(教練與學員) 皆綁定推廣人，兩位大使各抽 <strong>{doubleRate}%</strong>
        </div>
      </div>

      <TierCard 
        level="初級大使 (Bronze)" 
        requirement="邀請 1 ~ 4 位活躍用戶"
        benefit="享有上述基礎分潤"
        perks={['基礎推廣連結', '推廣數據後台']}
        color="#CD7F32"
      />
      <TierCard 
        level="進階大使 (Silver)" 
        requirement="邀請 5 ~ 19 位活躍用戶"
        benefit="享有上述基礎分潤"
        perks={['每月 1 次提領免手續費']}
        color="#C0C0C0"
      />
      <TierCard 
        level="高級大使 (Gold)" 
        requirement="邀請 20 ~ 49 位活躍用戶"
        benefit="享有上述基礎分潤"
        perks={['優先客服回應']}
        color="#FFD700"
      />
    </div>
  );
}

function TierCard({ level, requirement, benefit, perks, color }) {
  return (
    <div style={{ background: 'var(--color-surface)', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--color-border)', position: 'relative' }}>
      <div style={{ width: '4px', position: 'absolute', left: 0, top: 0, bottom: 0, background: color }}></div>
      <div style={{ padding: '20px 20px 20px 24px' }}>
        <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 900, color: 'var(--color-text)' }}>{level}</h3>
        <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 600 }}>{requirement}</p>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <div style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#3B82F6', padding: '6px 12px', borderRadius: '100px', fontSize: '14px', fontWeight: 800 }}>
            {benefit}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {perks.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: 'var(--color-text)' }}>
              <Star size={14} color={color} style={{ marginTop: '2px', flexShrink: 0 }} />
              <span style={{ fontWeight: 600 }}>{p}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CoachTierCard({ level, requirement, fee, pioneerFee, perks, color }) {
  return (
    <div style={{ background: 'var(--color-surface)', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--color-border)', position: 'relative' }}>
      <div style={{ width: '4px', position: 'absolute', left: 0, top: 0, bottom: 0, background: color }}></div>
      <div style={{ padding: '20px 20px 20px 24px' }}>
        <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 900, color: 'var(--color-text)' }}>{level}</h3>
        <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 600 }}>{requirement}</p>
        
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--color-border)', padding: '8px 12px', borderRadius: '12px' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 700, marginBottom: '2px' }}>一般抽成</div>
            <div style={{ fontSize: '16px', fontWeight: 900, color: 'var(--color-text)' }}>{fee}</div>
          </div>
          <div style={{ background: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.3)', padding: '8px 12px', borderRadius: '12px' }}>
            <div style={{ fontSize: '11px', color: '#D4AF37', fontWeight: 800, marginBottom: '2px' }}>創始教練抽成</div>
            <div style={{ fontSize: '16px', fontWeight: 900, color: '#D4AF37' }}>{pioneerFee}</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {perks.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: 'var(--color-text)' }}>
              <Shield size={14} color={color} style={{ marginTop: '2px', flexShrink: 0 }} />
              <span style={{ fontWeight: 600 }}>{p}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
