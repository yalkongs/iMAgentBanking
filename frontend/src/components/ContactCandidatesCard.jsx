export default function ContactCandidatesCard({ data, onQuickAction }) {
  const { query, candidates } = data

  return (
    <div className="ui-card candidates-card">
      <div className="candidates-header">
        <span className="candidates-title">'{query}' 후보 선택</span>
        <span className="candidates-hint">탭하여 선택</span>
      </div>
      <div className="candidates-list">
        {candidates.map((c, i) => (
          <button
            key={c.accountNo}
            className="candidate-item"
            onClick={() =>
              onQuickAction(
                `${query}은(는) ${c.realName} (${c.bank} ${c.accountNoMasked})이야. 이 분으로 진행해줘.`
              )
            }
          >
            <div className="candidate-index">{i + 1}</div>
            <div className="candidate-info">
              <div className="candidate-name">{c.realName}</div>
              <div className="candidate-bank">{c.bank} · {c.accountNoMasked}</div>
            </div>
            <div className="candidate-meta">
              <div className="candidate-count">{c.transferCount}회</div>
              {c.lastTransferDate && (
                <div className="candidate-date">{c.lastTransferDate.slice(5)}</div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
