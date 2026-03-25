const CATEGORY_COLOR = {
  카페: '#7dd3fc',
  식비: '#86efac',
  쇼핑: '#fbbf24',
  송금: '#a78bfa',
  교통: '#60a5fa',
  문화: '#f472b6',
  의료: '#f87171',
  구독: '#34d399',
  이체: '#a78bfa',
  자동이체: '#94a3b8',
  카드대금: '#fb923c',
}

export default function SpendingCard({ data, onQuickAction }) {
  const items = data.items || []
  if (!items.length) return null

  const max = items[0]?.total || 1

  return (
    <div className="ui-card spending-card">
      <div className="spending-header">
        <span className="spending-title">지출 분석</span>
        {data.period && (
          <span className="spending-period">
            {data.period.start?.slice(5)} ~ {data.period.end?.slice(5)}
          </span>
        )}
      </div>
      <div className="spending-hero">
        <div className="spending-hero-label">총 지출</div>
        <div className="spending-hero-amount">{data.totalFormatted}</div>
      </div>
      <div className="spending-list">
        {items.slice(0, 6).map((item) => {
          const key = data.groupBy === 'counterpart' ? item.counterpart : item.category
          const pct = Math.round((item.total / max) * 100)
          const color = CATEGORY_COLOR[key] || 'rgba(0,201,167,0.7)'
          const clickMsg = data.groupBy === 'counterpart'
            ? `${key} 거래 내역 보여줘`
            : `이번 달 ${key} 지출 내역 보여줘`
          return (
            <button
              key={key}
              className="spending-item spending-item-btn"
              onClick={() => onQuickAction && onQuickAction(clickMsg)}
            >
              <div className="spending-item-row">
                <div className="spending-dot" style={{ background: color }} />
                <span className="spending-label">{key}</span>
                <span className="spending-count">{item.count}건</span>
                <span className="spending-amount">{item.totalFormatted}</span>
              </div>
              <div className="spending-bar-track">
                <div
                  className="spending-bar-fill"
                  style={{ width: pct + '%', background: color + 'a0' }}
                />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
