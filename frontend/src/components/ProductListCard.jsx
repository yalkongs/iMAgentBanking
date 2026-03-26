// 상품 목록 카드 (search_products 결과 표시)

const TYPE_ICONS = {
  deposit:     '🏦',
  savings:     '💰',
  loan:        '🏠',
  credit_card: '💳',
  debit_card:  '💴',
  investment:  '📈',
}

const TYPE_COLORS = {
  deposit:     { accent: '#7dd3fc', bg: 'rgba(125,211,252,0.08)', border: 'rgba(125,211,252,0.2)' },
  savings:     { accent: '#34d399', bg: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.2)' },
  loan:        { accent: '#fbbf24', bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.2)' },
  credit_card: { accent: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.2)' },
  debit_card:  { accent: '#60a5fa', bg: 'rgba(96,165,250,0.08)',  border: 'rgba(96,165,250,0.2)' },
  investment:  { accent: '#f472b6', bg: 'rgba(244,114,182,0.08)', border: 'rgba(244,114,182,0.2)' },
}

export default function ProductListCard({ data, onQuickAction }) {
  if (!data?.products?.length) return null

  const { products, typeLabel, count, query } = data

  // 유형별 그룹핑
  const groups = {}
  for (const p of products) {
    if (!groups[p.type]) groups[p.type] = { typeLabel: p.typeLabel, type: p.type, items: [] }
    groups[p.type].items.push(p)
  }

  const title = query?.keyword
    ? `"${query.keyword}" 관련 상품`
    : `${typeLabel || '전체'} 상품`

  return (
    <div className="ui-card product-list-card">
      <div className="product-list-header">
        <span className="product-list-title">{title}</span>
        <span className="product-list-count">{count}개</span>
      </div>

      {Object.values(groups).map(({ type, typeLabel: tl, items }) => {
        const clr = TYPE_COLORS[type] || TYPE_COLORS.deposit
        return (
          <div key={type} className="product-group">
            {Object.keys(groups).length > 1 && (
              <div className="product-group-label" style={{ color: clr.accent }}>
                {TYPE_ICONS[type]} {tl}
              </div>
            )}
            <div className="product-items">
              {items.map((p) => (
                <button
                  key={p.id}
                  className="product-item-btn"
                  style={{ '--p-accent': clr.accent, '--p-bg': clr.bg, '--p-border': clr.border }}
                  onClick={() => onQuickAction && onQuickAction(
                    `${p.name} 상품 자세히 알려줘`,
                    { view: 'product_inquiry', productId: p.id, productName: p.name, productType: p.type }
                  )}
                >
                  <div className="product-item-top">
                    <span className="product-item-name">{p.name}</span>
                    {p.rateInfo && (
                      <span className="product-item-rate">{p.rateInfo}</span>
                    )}
                    {p.annualFee === 0 && (
                      <span className="product-item-fee-free">연회비 무료</span>
                    )}
                  </div>
                  <div className="product-item-summary">{p.summary}</div>
                  {p.tags?.length > 0 && (
                    <div className="product-item-tags">
                      {p.tags.slice(0, 3).map((t) => (
                        <span key={t} className="product-tag">{t}</span>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )
      })}

      {onQuickAction && (
        <div className="product-list-footer">
          <button
            className="product-consult-btn"
            onClick={() => onQuickAction('내 소비 패턴에 맞는 카드 추천해줘', null)}
          >
            맞춤 상품 추천 받기
          </button>
        </div>
      )}
    </div>
  )
}
