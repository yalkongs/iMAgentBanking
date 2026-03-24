const CATEGORY_COLOR = {
  카페: '#7dd3fc',
  식비: '#86efac',
  쇼핑: '#fbbf24',
  송금: '#a78bfa',
  급여: '#34d399',
  교통: '#60a5fa',
  문화: '#f472b6',
  의료: '#f87171',
  입금: '#34d399',
  이체: '#a78bfa',
  이자: '#7dd3fc',
  자동이체: '#94a3b8',
  카드대금: '#fb923c',
}

export default function TransactionList({ data, onQuickAction }) {
  const txs = data.transactions || []
  if (!txs.length) return null

  return (
    <div className="ui-card tx-card">
      <div className="tx-card-header">
        <span className="tx-card-title">거래 내역</span>
        <span className="tx-card-count">{data.count}건</span>
      </div>
      <div className="tx-list">
        {txs.map((tx) => (
          <div key={tx.id} className="tx-item">
            <div
              className="tx-dot"
              style={{ background: CATEGORY_COLOR[tx.category] || 'rgba(0,201,167,0.5)' }}
            />
            <div className="tx-info">
              <span className="tx-counterpart">{tx.counterpart}</span>
              <span className="tx-meta">{tx.date.slice(5)} · {tx.category}</span>
            </div>
            <span className={`tx-amount ${tx.amount > 0 ? 'income' : 'expense'}`}>
              {tx.amountFormatted}
            </span>
          </div>
        ))}
      </div>
      {onQuickAction && (
        <div className="card-quick-actions">
          <button className="cqa-btn" onClick={() => onQuickAction('지출 분석해줘')}>지출분석</button>
          <button className="cqa-btn" onClick={() => onQuickAction('이번 달 카드 내역 보여줘')}>카드내역</button>
          <button className="cqa-btn" onClick={() => onQuickAction('이체하기')}>이체</button>
        </div>
      )}
    </div>
  )
}
