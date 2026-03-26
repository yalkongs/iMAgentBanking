import { useState, useEffect, useRef } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || ''

const TYPE_CONFIG = {
  checking:            { label: '입출금', accent: '#00C9A7', bg: 'rgba(0,201,167,0.10)',   border: 'rgba(0,201,167,0.30)',   icon: '⇄' },
  installment_savings: { label: '적금',   accent: '#818CF8', bg: 'rgba(129,140,248,0.10)', border: 'rgba(129,140,248,0.30)', icon: '↑' },
  term_deposit:        { label: '예금',   accent: '#FBBF24', bg: 'rgba(251,191,36,0.10)',  border: 'rgba(251,191,36,0.30)',  icon: '◈' },
  savings:             { label: '저축',   accent: '#F472B6', bg: 'rgba(244,114,182,0.10)', border: 'rgba(244,114,182,0.30)', icon: '♦' },
  cma:                 { label: 'CMA',    accent: '#A78BFA', bg: 'rgba(167,139,250,0.10)', border: 'rgba(167,139,250,0.30)', icon: '◉' },
}

function maskAccountNo(no) {
  const last4 = no.replace(/[^0-9]/g, '').slice(-4)
  return `···· ${last4}`
}

function AccountDetailView({ accountId, sessionId, onBack, onQuickAction }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const url = `${API_BASE}/api/account/${accountId}${sessionId ? `?sessionId=${sessionId}` : ''}`
    fetch(url)
      .then((r) => r.json())
      .then(setDetail)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [accountId, sessionId])

  if (loading) {
    return (
      <div className="acct-detail-loading">
        <div className="typing-dots inline"><span /><span /><span /></div>
      </div>
    )
  }
  if (!detail) return (
    <div className="acct-detail">
      <button className="acct-detail-back" onClick={onBack}>← 전체 계좌</button>
      <div className="acct-detail-error">계좌 정보를 불러올 수 없습니다.</div>
    </div>
  )

  const { account: acc, recentTransactions: txs } = detail
  const cfg = TYPE_CONFIG[acc.type] || TYPE_CONFIG.checking

  return (
    <div className="acct-detail">
      <button className="acct-detail-back" onClick={onBack}>
        ← 전체 계좌
      </button>

      <div className="acct-detail-header" style={{ '--acct-accent': cfg.accent, '--acct-bg': cfg.bg, '--acct-border': cfg.border }}>
        <div className="acct-detail-top-row">
          <span className="acct-detail-badge" style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.accent }}>
            {cfg.label}
          </span>
          <span className="acct-detail-bank">{acc.bank}</span>
        </div>
        <div className="acct-detail-name">{acc.name}</div>
        <div className="acct-detail-no">{acc.accountNo}</div>
        <div className="acct-detail-balance" style={{ color: cfg.accent }}>
          {acc.balance.toLocaleString('ko-KR')}<span className="acct-detail-unit">원</span>
        </div>
        {(acc.interestRate || acc.maturityDate) && (
          <div className="acct-detail-meta">
            {acc.interestRate && <span style={{ color: cfg.accent }}>연 {acc.interestRate}%</span>}
            {acc.maturityDate && <span>만기 {acc.maturityDate}</span>}
            {acc.monthlyDeposit && <span>월 {acc.monthlyDeposit.toLocaleString('ko-KR')}원</span>}
          </div>
        )}
      </div>

      <div className="acct-detail-tx-section">
        <div className="acct-detail-tx-title">최근 거래</div>
        {txs.length === 0 ? (
          <div className="acct-detail-empty">거래 내역이 없습니다.</div>
        ) : (
          <div className="acct-detail-txs">
            {txs.map((tx) => (
              <div key={tx.id} className="acct-detail-tx">
                <div className="acct-detail-tx-left">
                  <div className="acct-detail-tx-counterpart">{tx.counterpart}</div>
                  <div className="acct-detail-tx-meta">{tx.date} · {tx.category}</div>
                </div>
                <div className={`acct-detail-tx-amount ${tx.amount > 0 ? 'income' : 'expense'}`}>
                  {tx.amountFormatted}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {onQuickAction && (
        <button
          className="acct-detail-more"
          style={{ color: cfg.accent, borderColor: cfg.border }}
          onClick={() => onQuickAction(`${acc.name} 전체 거래내역 보여줘`)}
        >
          전체 거래내역 보기 →
        </button>
      )}
    </div>
  )
}

export default function BalanceCard({ data, sessionId, onQuickAction, onClearScope, guiScope: cardGuiScope, initialAccountId, onGuiContextChange }) {
  const accounts = data.accounts || []
  const [selectedId, setSelectedId] = useState(initialAccountId || null)
  // 이 카드에서 드릴-다운 시 생성되는 메시지의 scope ID
  const detailScopeRef = useRef(null)

  function drillIn(accId) {
    // 기존 detail scope가 있으면 먼저 제거 (다른 계좌로 재진입)
    if (detailScopeRef.current) {
      onClearScope?.(detailScopeRef.current)
    }
    detailScopeRef.current = `balance-detail-${accId}-${Date.now()}`
    setSelectedId(accId)

    // Model C: 현재 GUI 위치를 AI에게 알림 (계좌 상세 진입)
    const acc = accounts.find((a) => a.id === accId)
    if (acc && onGuiContextChange) {
      const today = new Date()
      const daysToMaturity = acc.maturityDate
        ? Math.ceil((new Date(acc.maturityDate) - today) / 86400000)
        : undefined
      onGuiContextChange({
        view: 'account_detail',
        accountId: accId,
        accountName: acc.name,
        accountType: acc.type,
        balance: acc.balance,
        ...(acc.interestRate && { interestRate: acc.interestRate }),
        ...(acc.maturityDate && { maturityDate: acc.maturityDate }),
        ...(daysToMaturity !== undefined && { daysToMaturity }),
      })
    }
  }

  function drillOut() {
    if (detailScopeRef.current) {
      onClearScope?.(detailScopeRef.current)
      detailScopeRef.current = null
    }
    setSelectedId(null)

    // Model C: 계좌 목록 overview로 복귀
    if (onGuiContextChange) {
      onGuiContextChange({
        view: 'balance_overview',
        totalBalance: data.totalBalance,
        accountCount: accounts.length,
      })
    }
  }

  if (selectedId) {
    return (
      <div className="ui-card balance-card">
        <AccountDetailView
          accountId={selectedId}
          sessionId={sessionId}
          onBack={drillOut}
          onQuickAction={(text) => onQuickAction?.(text, detailScopeRef.current)}
        />
      </div>
    )
  }

  return (
    <div className="ui-card balance-card">
      {accounts.length > 1 && (
        <div className="balance-hero">
          <div className="balance-hero-label">총 자산</div>
          <div className="balance-hero-amount">{data.totalBalanceFormatted}</div>
        </div>
      )}

      <div className="balance-acct-grid">
        {accounts.map((acc) => {
          const cfg = TYPE_CONFIG[acc.type] || TYPE_CONFIG.checking
          return (
            <button
              key={acc.id}
              className="acct-obj"
              style={{ '--acct-accent': cfg.accent, '--acct-bg': cfg.bg, '--acct-border': cfg.border }}
              onClick={() => drillIn(acc.id)}
            >
              <div className="acct-obj-top">
                <span className="acct-obj-badge">{cfg.label}</span>
                <span className="acct-obj-icon">{cfg.icon}</span>
              </div>
              <div className="acct-obj-name">{acc.name}</div>
              <div className="acct-obj-no">{maskAccountNo(acc.accountNo)}</div>
              <div className="acct-obj-balance">{acc.balanceFormatted}</div>
              {acc.interestRate && (
                <div className="acct-obj-rate">연 {acc.interestRate}%</div>
              )}
              <div className="acct-obj-enter">›</div>
            </button>
          )
        })}
      </div>

      {onQuickAction && (
        <div className="card-quick-actions">
          <button className="cqa-btn" onClick={() => onQuickAction('이체하기')}>이체</button>
          <button className="cqa-btn" onClick={() => onQuickAction('이번 달 지출 분석해줘')}>지출분석</button>
        </div>
      )}
    </div>
  )
}
