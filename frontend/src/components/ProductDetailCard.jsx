// 상품 상세 카드 (get_product_detail 결과 표시)

const TYPE_COLORS = {
  deposit:     { accent: '#7dd3fc', bg: 'rgba(125,211,252,0.08)', border: 'rgba(125,211,252,0.2)' },
  savings:     { accent: '#34d399', bg: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.2)' },
  loan:        { accent: '#fbbf24', bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.2)' },
  credit_card: { accent: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.2)' },
  debit_card:  { accent: '#60a5fa', bg: 'rgba(96,165,250,0.08)',  border: 'rgba(96,165,250,0.2)' },
  investment:  { accent: '#f472b6', bg: 'rgba(244,114,182,0.08)', border: 'rgba(244,114,182,0.2)' },
}

function RateDisplay({ product }) {
  if (product.baseRate != null) {
    return (
      <div className="product-detail-rate">
        <div className="product-detail-rate-main">
          {product.maxRate && product.maxRate !== product.baseRate
            ? `연 ${product.baseRate}% ~ ${product.maxRate}%`
            : `연 ${product.baseRate}%`
          }
        </div>
        {product.maxRate && product.maxRate !== product.baseRate && (
          <div className="product-detail-rate-sub">최고 연 {product.maxRate}%</div>
        )}
      </div>
    )
  }
  if (product.minRate != null) {
    return (
      <div className="product-detail-rate">
        <div className="product-detail-rate-main">
          연 {product.minRate}% ~ {product.maxRate}%
        </div>
        <div className="product-detail-rate-sub">신용등급에 따라 차등 적용</div>
      </div>
    )
  }
  if (product.annualFee != null) {
    return (
      <div className="product-detail-rate">
        <div className="product-detail-rate-main">
          {product.annualFee === 0 ? '연회비 무료' : `연회비 ${product.annualFee.toLocaleString('ko-KR')}원`}
        </div>
      </div>
    )
  }
  return null
}

export default function ProductDetailCard({ data, onQuickAction }) {
  if (!data?.found || !data?.product) return null

  const { product } = data
  const clr = TYPE_COLORS[product.type] || TYPE_COLORS.deposit

  // 가입 CTA 메시지
  const ctaMsg = product.type === 'loan'
    ? `${product.name} 대출 조건 더 알려줘`
    : `${product.name} 가입 방법 알려줘`

  return (
    <div
      className="ui-card product-detail-card"
      style={{ '--pd-accent': clr.accent, '--pd-bg': clr.bg, '--pd-border': clr.border }}
    >
      <div className="product-detail-header">
        <div className="product-detail-category">{product.typeLabel} · {product.category}</div>
        <div className="product-detail-name">{product.name}</div>
        <RateDisplay product={product} />
      </div>

      {/* 주요 혜택 */}
      <div className="product-detail-section">
        <div className="product-detail-section-title">주요 특징</div>
        <ul className="product-detail-highlights">
          {(product.highlights || []).map((h, i) => (
            <li key={i}>{h}</li>
          ))}
        </ul>
      </div>

      {/* 혜택 테이블 */}
      {product.benefits?.length > 0 && (
        <div className="product-detail-section">
          <div className="product-detail-section-title">혜택 상세</div>
          <div className="product-benefits-table">
            {product.benefits.map((b, i) => (
              <div key={i} className="product-benefit-row">
                <span className="product-benefit-cat">{b.category}</span>
                <span className="product-benefit-rate">{b.rate}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 조건 & 부가 정보 */}
      <div className="product-detail-section">
        <div className="product-detail-meta">
          {product.conditions && (
            <div className="product-meta-row">
              <span className="product-meta-label">가입 조건</span>
              <span className="product-meta-value">{product.conditions}</span>
            </div>
          )}
          {product.period && (
            <div className="product-meta-row">
              <span className="product-meta-label">가입 기간</span>
              <span className="product-meta-value">{product.period}</span>
            </div>
          )}
          {product.maxAmount != null && (
            <div className="product-meta-row">
              <span className="product-meta-label">한도</span>
              <span className="product-meta-value">최대 {(product.maxAmount / 100000000).toFixed(1)}억 원</span>
            </div>
          )}
          {product.repayment && (
            <div className="product-meta-row">
              <span className="product-meta-label">상환 방식</span>
              <span className="product-meta-value">{product.repayment}</span>
            </div>
          )}
          {product.earlyWithdrawal && (
            <div className="product-meta-row">
              <span className="product-meta-label">중도해지</span>
              <span className="product-meta-value">{product.earlyWithdrawal}</span>
            </div>
          )}
        </div>
      </div>

      {/* 태그 */}
      {product.tags?.length > 0 && (
        <div className="product-detail-tags">
          {product.tags.map((t) => (
            <span key={t} className="product-tag">{t}</span>
          ))}
        </div>
      )}

      {/* 액션 버튼 */}
      {onQuickAction && (
        <div className="product-detail-actions">
          <button
            className="product-cta-btn"
            onClick={() => onQuickAction(ctaMsg, {
              view: 'product_detail',
              productId: product.id,
              productName: product.name,
              productType: product.type,
            })}
          >
            {product.type === 'loan' ? '대출 상담' : '가입 안내'}
          </button>
          <button
            className="product-compare-btn"
            onClick={() => onQuickAction(`${product.typeLabel} 다른 상품도 보여줘`, null)}
          >
            다른 상품 보기
          </button>
        </div>
      )}
    </div>
  )
}
