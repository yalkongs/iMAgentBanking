export default function SavingsInsightCard({ data, onCta }) {
  if (!data) return null

  const { period, savings = [], total_saveable_formatted, total_saveable } = data

  if (savings.length === 0) {
    return (
      <div className="savings-insight-card sic-empty">
        <p className="sic-empty-title">분석할 지출 내역이 없어요</p>
        <p className="sic-empty-desc">카드 지출이 발생하면 절약 포인트를 찾아드릴게요.</p>
      </div>
    )
  }

  const maxSaveable = Math.max(...savings.map((s) => s.saveable))

  return (
    <div className="savings-insight-card">
      <div className="sic-header">
        <span className="sic-period">{period}</span>
        <span className="sic-badge">절약 분석</span>
      </div>

      <div className="sic-total">
        <span className="sic-total-label">이달 절약 가능</span>
        <span className="sic-total-amount">{total_saveable_formatted}</span>
      </div>

      <ul className="sic-list">
        {savings.map((item) => (
          <li key={item.category} className="sic-item">
            <div className="sic-item-top">
              <span className="sic-category">{item.category}</span>
              <span className="sic-saveable">-{item.saveableFormatted}</span>
            </div>
            <div className="sic-bar-wrap">
              <div
                className="sic-bar-fill"
                style={{ width: `${Math.round((item.saveable / maxSaveable) * 100)}%` }}
              />
            </div>
            <p className="sic-reason">{item.reason}</p>
          </li>
        ))}
      </ul>

      {total_saveable > 0 && (
        <button
          className="sic-cta"
          onClick={() => onCta?.(total_saveable)}
          aria-label={`월 ${total_saveable_formatted} 적금 상품 찾기`}
        >
          이 금액으로 적금 상품 찾기 →
        </button>
      )}
    </div>
  )
}
