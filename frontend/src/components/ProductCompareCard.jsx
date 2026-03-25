export default function ProductCompareCard({ data, onRetry }) {
  if (!data) return null

  const { recommended, others = [], amount_formatted, period_months } = data

  if (!recommended) {
    return (
      <div className="product-compare-card pcc-empty">
        <p className="pcc-empty-title">비교할 상품을 가져오지 못했어요</p>
        <p className="pcc-empty-desc">잠시 후 다시 시도해 주세요.</p>
        {onRetry && (
          <button className="pcc-retry" onClick={onRetry}>다시 시도</button>
        )}
      </div>
    )
  }

  return (
    <div className="product-compare-card">
      <div className="pcc-header">
        <span className="pcc-badge">상품 비교</span>
        <span className="pcc-subtitle">월 {amount_formatted} · {period_months}개월</span>
      </div>

      {/* Featured Hero — 추천 상품 */}
      <div className="pcc-hero">
        <div className="pcc-hero-top">
          <span className="pcc-rec-label">iM뱅크 추천</span>
          <span className="pcc-bank">{recommended.bank}</span>
        </div>
        <p className="pcc-product-name">{recommended.name}</p>
        <div className="pcc-hero-stats">
          <div className="pcc-stat">
            <span className="pcc-stat-label">금리</span>
            <span className="pcc-stat-value">{recommended.rate_formatted}</span>
          </div>
          <div className="pcc-stat">
            <span className="pcc-stat-label">만기 수령액</span>
            <span className="pcc-stat-value">{recommended.maturity_formatted}</span>
          </div>
          <div className="pcc-stat">
            <span className="pcc-stat-label">이자</span>
            <span className="pcc-stat-value">+{recommended.interest_formatted}</span>
          </div>
        </div>
        <ul className="pcc-features">
          {recommended.features.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
        {recommended.cta_url && (
          <a
            className="pcc-cta"
            href={recommended.cta_url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${recommended.bank} ${recommended.name} 가입하기`}
          >
            지금 가입하기
          </a>
        )}
      </div>

      {/* 비교 행 */}
      {others.length > 0 && (
        <div className="pcc-compare">
          <p className="pcc-compare-title">다른 상품과 비교</p>
          <div className="pcc-compare-row">
            {others.map((p) => (
              <div key={p.id} className="pcc-compare-item">
                <span className="pcc-compare-bank">{p.bank}</span>
                <span className="pcc-compare-name">{p.name}</span>
                <span className="pcc-compare-rate">{p.rate_formatted}</span>
                <span className="pcc-compare-maturity">{p.maturity_formatted}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
