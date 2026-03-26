const MOMENT_CONFIG = {
  salary: {
    accent: '#34D399',
    bg: 'rgba(52,211,153,0.08)',
    border: 'rgba(52,211,153,0.22)',
    tag: 'SALARY',
    tagLabel: '급여 입금',
    actions: [
      { label: '잔액 확인', msg: '잔액 얼마야?' },
      { label: '지출 분석', msg: '이번 달 지출 분석해줘' },
      { label: '이달 이야기', msg: '이번 달 어땠어?' },
    ],
  },
  card_due: {
    accent: '#FBBF24',
    bg: 'rgba(251,191,36,0.07)',
    border: 'rgba(251,191,36,0.22)',
    tag: 'NOTICE',
    tagLabel: '카드 결제 예정',
    actions: [
      { label: '카드 내역', msg: '이번 달 카드 내역 보여줘' },
      { label: '잔액 확인', msg: '잔액 얼마야?' },
    ],
  },
  overspending: {
    accent: '#F87171',
    bg: 'rgba(248,113,113,0.07)',
    border: 'rgba(248,113,113,0.22)',
    tag: 'ALERT',
    tagLabel: '과소비 감지',
    actions: [
      { label: '지출 분석', msg: '이번 달 지출 분석해줘' },
      { label: '카드 내역', msg: '이번 달 카드 내역 보여줘' },
    ],
  },
}

export default function FinancialMomentCard({ data, onQuickAction }) {
  const { momentType = 'salary', title, amountFormatted, description, daysLeft, dueAmount, dueDate } = data
  const cfg = MOMENT_CONFIG[momentType] || MOMENT_CONFIG.salary

  // Model C: 이 모먼트 카드의 컨텍스트 — quickAction 발화 시 AI에게 전달
  const momentContext = onQuickAction ? {
    view: 'financial_moment',
    momentType,
    title,
    amountFormatted,
    ...(daysLeft !== undefined && { daysLeft }),
    ...(dueAmount !== undefined && { dueAmount }),
    ...(dueDate && { dueDate }),
  } : undefined

  return (
    <div
      className="moment-card"
      style={{ '--m-accent': cfg.accent, '--m-bg': cfg.bg, '--m-border': cfg.border }}
    >
      <div className="moment-top-row">
        <span className="moment-tag">{cfg.tag}</span>
        <span className="moment-tag-label">{cfg.tagLabel}</span>
        {daysLeft !== undefined && <span className="moment-days-badge">D-{daysLeft}</span>}
      </div>

      <div className="moment-title">{title}</div>

      {amountFormatted && (
        <div className="moment-amount">{amountFormatted}</div>
      )}

      {description && (
        <div className="moment-desc">{description}</div>
      )}

      {onQuickAction && cfg.actions.length > 0 && (
        <div className="moment-actions">
          {cfg.actions.map((a) => (
            <button key={a.label} className="moment-btn" onClick={() => onQuickAction(a.msg, momentContext)}>
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
