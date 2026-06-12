export default function PrivacyPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg)',
      color: 'var(--color-text)',
      padding: '40px 24px',
      lineHeight: '1.6'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '900', marginBottom: '24px', color: 'var(--color-primary)' }}>
          隱私權保護政策 (Privacy Policy)
        </h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '16px' }}>
          最後更新日期：2026年6月
        </p>
        <div style={{ background: 'var(--color-surface)', padding: '24px', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '12px', fontWeight: 'bold' }}>1. 隱私權保護政策的適用範圍</h2>
          <p style={{ marginBottom: '16px', color: 'var(--color-text-muted)' }}>
            隱私權保護政策內容，包括本平台如何處理在您使用平台服務時收集到的個人識別資料。隱私權保護政策不適用於本平台以外的相關連結網站，也不適用於非本平台所委託或參與管理的人員。
          </p>
          
          <h2 style={{ fontSize: '18px', marginBottom: '12px', fontWeight: 'bold' }}>2. 個人資料的蒐集、處理及利用方式</h2>
          <p style={{ marginBottom: '16px', color: 'var(--color-text-muted)' }}>
            當您造訪本平台或使用本平台所提供之功能服務時，我們將視該服務功能性質，請您提供必要的個人資料，並在該特定目的範圍內處理及利用您的個人資料。未經您書面同意，本平台不會將個人資料用於其他用途。
          </p>

          <h2 style={{ fontSize: '18px', marginBottom: '12px', fontWeight: 'bold' }}>3. 資料之保護</h2>
          <p style={{ marginBottom: '16px', color: 'var(--color-text-muted)' }}>
            本平台主機均設有防火牆、防毒系統等相關的各項資訊安全設備及必要的安全防護措施，加以保護網站及您的個人資料。只有經過授權的人員才能接觸您的個人資料。
          </p>

          <h2 style={{ fontSize: '18px', marginBottom: '12px', fontWeight: 'bold' }}>4. 網站對外的相關連結</h2>
          <p style={{ marginBottom: '16px', color: 'var(--color-text-muted)' }}>
            本平台的網頁提供其他網站的網路連結，您也可經由本平台所提供的連結，點選進入其他網站。但該連結網站不適用本平台的隱私權保護政策，您必須參考該連結網站中的隱私權保護政策。
          </p>

          <h2 style={{ fontSize: '18px', marginBottom: '12px', fontWeight: 'bold' }}>5. 隱私權保護政策之修正</h2>
          <p style={{ marginBottom: '16px', color: 'var(--color-text-muted)' }}>
            本平台隱私權保護政策將因應需求隨時進行修正，修正後的條款將刊登於網站上。
          </p>
        </div>
      </div>
    </div>
  );
}
