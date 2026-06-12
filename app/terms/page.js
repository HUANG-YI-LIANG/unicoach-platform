export default function TermsPage() {
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
          服務使用條款 (Terms of Service)
        </h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '16px' }}>
          最後更新日期：2026年6月
        </p>
        <div style={{ background: 'var(--color-surface)', padding: '24px', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '12px', fontWeight: 'bold' }}>1. 認知與接受條款</h2>
          <p style={{ marginBottom: '16px', color: 'var(--color-text-muted)' }}>
            歡迎您使用 UniCoach 平台。本服務條款構成您與平台之間的法律協議。當您完成註冊或開始使用本平台服務，即表示您已閱讀、瞭解並同意接受本條款之所有內容。
          </p>
          
          <h2 style={{ fontSize: '18px', marginBottom: '12px', fontWeight: 'bold' }}>2. 帳號與安全性</h2>
          <p style={{ marginBottom: '16px', color: 'var(--color-text-muted)' }}>
            使用者應妥善保管帳號及密碼。任何人以您的帳號登入平台後所進行之一切行為，均將視為您的行為，並由您負完全之法律責任。若發現帳號遭盜用，請立即通知平台客服。
          </p>

          <h2 style={{ fontSize: '18px', marginBottom: '12px', fontWeight: 'bold' }}>3. 使用者行為準則</h2>
          <p style={{ marginBottom: '16px', color: 'var(--color-text-muted)' }}>
            平台致力於打造優質、安全的媒合環境。使用者嚴禁於平台上發布任何違法、不實、具攻擊性或侵犯他人智慧財產權之內容。若經檢舉查證屬實，平台有權暫停或永久刪除該帳號。
          </p>

          <h2 style={{ fontSize: '18px', marginBottom: '12px', fontWeight: 'bold' }}>4. 交易與退費政策</h2>
          <p style={{ marginBottom: '16px', color: 'var(--color-text-muted)' }}>
            使用者在平台上的交易均由第三方金流服務處理。如遇預約取消或退費需求，請參閱本平台的《退款與取消政策》，雙方應基於互信與溝通來解決糾紛。
          </p>

          <h2 style={{ fontSize: '18px', marginBottom: '12px', fontWeight: 'bold' }}>5. 免責聲明</h2>
          <p style={{ marginBottom: '16px', color: 'var(--color-text-muted)' }}>
            平台僅作為教練與學員之媒合橋樑，對於雙方在實體教學或線上互動過程中的糾紛、人身安全或財產損失，平台不負直接損害賠償責任。建議使用者在交易與會面時保持警覺。
          </p>
        </div>
      </div>
    </div>
  );
}
