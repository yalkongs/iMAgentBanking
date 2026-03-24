export default function BalanceCard({ data, onQuickAction }) {
  const accounts = data.accounts || []

  return (
    <div className="ui-card balance-card">
      {accounts.length > 1 && (
        <div className="balance-hero">
          <div className="balance-hero-label">총 자산</div>
          <div className="balance-hero-amount">{data.totalBalanceFormatted}</div>
        </div>
      )}
      <div className="balance-accounts">
        {accounts.map((acc) => (
          <div key={acc.id} className="balance-account">
            <div className="balance-account-left">
              <div className="balance-acct-bar" />
              <div>
                <div className="balance-account-name">{acc.name}</div>
                <div className="balance-account-no">{acc.bank} · {acc.accountNo}</div>
              </div>
            </div>
            <div className="balance-amount">{acc.balanceFormatted}</div>
          </div>
        ))}
      </div>
      {onQuickAction && (
        <div className="card-quick-actions">
          <button className="cqa-btn" onClick={() => onQuickAction('이체하기')}>이체</button>
          <button className="cqa-btn" onClick={() => onQuickAction('최근 거래 내역 보여줘')}>거래내역</button>
          <button className="cqa-btn" onClick={() => onQuickAction('이번 달 지출 분석해줘')}>지출분석</button>
        </div>
      )}
    </div>
  )
}
