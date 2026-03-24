// complex_query, get_recent_transfer 결과용 카드
export default function InsightCard({ cardType, data }) {
  if (cardType === 'get_recent_transfer') {
    if (!data.found) return null
    return (
      <div className="ui-card insight-card">
        <div className="insight-header">
          <span className="insight-title">최근 이체</span>
        </div>
        <div className="insight-big">{data.lastAmountFormatted}</div>
        <div className="insight-rows">
          <div className="insight-row">
            <span className="insight-lbl">받는 분</span>
            <span className="insight-val">{data.contact_nickname}</span>
          </div>
          <div className="insight-row">
            <span className="insight-lbl">날짜</span>
            <span className="insight-val">{data.lastDate}</span>
          </div>
        </div>
      </div>
    )
  }

  if (cardType === 'complex_query') {
    if (data.error) return null
    const label = data.period
      ? `${data.period} ${data.category || ''} 지출`.trim()
      : data.result
      ? data.result.counterpart
      : '조회 결과'

    return (
      <div className="ui-card insight-card">
        <div className="insight-header">
          <span className="insight-title">{label}</span>
        </div>
        {(data.totalFormatted || data.amountFormatted) && (
          <div className="insight-big">{data.totalFormatted || data.amountFormatted}</div>
        )}
        {data.message && (
          <div className="insight-message">{data.message}</div>
        )}
        {data.count !== undefined && data.period === undefined && (
          <div className="insight-rows">
            <div className="insight-row">
              <span className="insight-lbl">건수</span>
              <span className="insight-val">{data.count}건</span>
            </div>
          </div>
        )}
      </div>
    )
  }

  return null
}
