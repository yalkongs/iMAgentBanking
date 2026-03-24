export default function TransferSuggestionCard({ data, onQuickAction }) {
  if (!data.found) return null

  return (
    <div className="ui-card suggestion-card">
      <div className="suggestion-header">
        <span className="suggestion-title">이체 금액 제안</span>
        <span className="suggestion-meta">{data.frequency}회 기준</span>
      </div>
      <div className="suggestion-body">
        <div className="suggestion-name">{data.realName}</div>
        <div className="suggestion-amount">{data.suggestedAmountFormatted}</div>
        <div className="suggestion-sub">마지막 이체 {data.lastDate?.slice(5)}</div>
      </div>
      {onQuickAction && (
        <div className="card-quick-actions">
          <button
            className="cqa-btn cqa-btn-primary"
            onClick={() =>
              onQuickAction(`네, ${data.suggestedAmountFormatted}으로 이체해줘.`)
            }
          >
            이 금액으로 이체
          </button>
          <button
            className="cqa-btn"
            onClick={() => onQuickAction('다른 금액으로 이체할게.')}
          >
            다른 금액
          </button>
        </div>
      )}
    </div>
  )
}
