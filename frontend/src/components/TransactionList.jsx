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

// 날짜별 그룹핑
function groupByDate(txs) {
  const groups = []
  const map = new Map()
  for (const tx of txs) {
    const dateKey = tx.date.slice(0, 10)
    if (!map.has(dateKey)) {
      const entry = { date: dateKey, label: formatDateLabel(dateKey), items: [] }
      map.set(dateKey, entry)
      groups.push(entry)
    }
    map.get(dateKey).items.push(tx)
  }
  return groups
}

function formatDateLabel(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now - d) / 86400000)
  if (diff === 0) return '오늘'
  if (diff === 1) return '어제'
  return `${d.getMonth() + 1}월 ${d.getDate()}일`
}

export default function TransactionList({ data, onQuickAction }) {
  const txs = data.transactions || []
  if (!txs.length) return (
    <div className="ui-card tx-card">
      <div className="tx-card-header">
        <span className="tx-card-title">거래 내역</span>
      </div>
      <div className="tx-empty">거래 내역이 없습니다.</div>
    </div>
  )

  const groups = groupByDate(txs)

  return (
    <div className="ui-card tx-card">
      <div className="tx-card-header">
        <span className="tx-card-title">거래 내역</span>
        <span className="tx-card-count">{data.count}건</span>
      </div>

      <div className="tx-list">
        {groups.map((grp) => (
          <div key={grp.date} className="tx-group">
            <div className="tx-date-header">{grp.label}</div>
            {grp.items.map((tx) => {
              const displayCategory = tx.category || tx.inferredCategory || ''
              const displayCounterpart = tx.counterpart || tx.merchant || ''
              const color = CATEGORY_COLOR[displayCategory] || 'rgba(0,201,167,0.5)'
              const clickMsg = tx.amount < 0
                ? `${displayCounterpart} 지출 내역 자세히 알려줘`
                : `${displayCounterpart} 입금 내역 설명해줘`
              return (
                <button
                  key={tx.id}
                  className="tx-item tx-item-btn"
                  onClick={() => onQuickAction && onQuickAction(clickMsg)}
                >
                  <div className="tx-accent-bar" style={{ background: color }} />
                  <div className="tx-info">
                    <span className="tx-counterpart">{displayCounterpart}</span>
                    <span className="tx-meta">{displayCategory}</span>
                  </div>
                  <span className={`tx-amount ${tx.amount > 0 ? 'income' : 'expense'}`}>
                    {tx.amountFormatted}
                  </span>
                </button>
              )
            })}
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
