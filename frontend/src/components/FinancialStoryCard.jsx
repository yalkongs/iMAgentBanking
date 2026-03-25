export default function FinancialStoryCard({ data }) {
  const {
    month,
    narrative,
    incomeFormatted,
    expenseFormatted,
    savingsFormatted,
    savingsRate,
    highlights = [],
    grade,      // A~F
    gradeColor, // hex
  } = data

  return (
    <div className="story-card">
      <div className="story-header">
        <div className="story-header-left">
          <span className="story-month">{month}</span>
          <span className="story-subtitle">이달의 금융 이야기</span>
        </div>
        {grade && (
          <div className="story-grade" style={{ '--grade-color': gradeColor || '#00C9A7' }}>
            {grade}
          </div>
        )}
      </div>

      <div className="story-narrative">{narrative}</div>

      <div className="story-stats-row">
        <div className="story-stat">
          <span className="story-stat-label">수입</span>
          <span className="story-stat-value story-income">{incomeFormatted}</span>
        </div>
        <div className="story-stat-divider" />
        <div className="story-stat">
          <span className="story-stat-label">지출</span>
          <span className="story-stat-value story-expense">{expenseFormatted}</span>
        </div>
        <div className="story-stat-divider" />
        <div className="story-stat">
          <span className="story-stat-label">저축률</span>
          <span className="story-stat-value">{savingsRate}%</span>
        </div>
      </div>

      {highlights.length > 0 && (
        <div className="story-highlights">
          {highlights.map((h, i) => (
            <div key={i} className="story-highlight-item">
              <span className="story-highlight-dot" />
              <span className="story-highlight-text">{h}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
