export default function TransactionAlertCard({ data, onQuickAction }) {
  const { counterpart, amountFormatted, isIncome, category, memo, timestamp, aiComment } = data

  return (
    <div className={`tx-alert-card ${isIncome ? 'income' : 'expense'}`}>
      <div className="tx-alert-dot" />
      <div className="tx-alert-body">
        <div className="tx-alert-top">
          <span className="tx-alert-counterpart">{counterpart}</span>
          <span className="tx-alert-amount">{amountFormatted}</span>
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
        <button
          className="tx-alert-action"
          onClick={() => onQuickAction('잔액 얼마야?')}
        >
          잔액 확인
        </button>
      )}
    </div>
  )
}
