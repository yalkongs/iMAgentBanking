export default function TransactionAlertCard({ data, onQuickAction }) {
  const { counterpart, amountFormatted, isIncome, category, memo, timestamp, aiComment } = data

  return (
    <div
      className={`tx-alert-card ${isIncome ? 'income' : 'expense'}${onQuickAction ? ' clickable' : ''}`}
      onClick={onQuickAction ? () => onQuickAction('잔액 얼마야?') : undefined}
      title={onQuickAction ? '계좌 확인' : undefined}
    >
      <div className="tx-alert-icon">{isIncome ? '↓' : '↑'}</div>
      <div className="tx-alert-body">
        <div className="tx-alert-top">
          <div className="tx-alert-left">
            <span className={`tx-alert-badge ${isIncome ? 'income' : 'expense'}`}>
              {isIncome ? '입금' : '출금'}
            </span>
            <span className="tx-alert-counterpart">{counterpart}</span>
          </div>
          <span className={`tx-alert-amount ${isIncome ? 'income' : 'expense'}`}>
            {amountFormatted}
          </span>
        </div>
        <div className="tx-alert-bottom">
          <span className="tx-alert-meta">{category}{memo ? ` · ${memo}` : ''}</span>
          <span className="tx-alert-time">{timestamp}</span>
        </div>
        {aiComment && (
          <div className="tx-alert-comment">{aiComment}</div>
        )}
      </div>
      {onQuickAction && (
        <span className="tx-alert-enter-hint">›</span>
      )}
    </div>
  )
}
