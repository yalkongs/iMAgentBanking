import { useState } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || ''

export default function TransferCard({ data, sessionId, onDone }) {
  const { to_contact, amountFormatted, from_account_id, memo, contactInfo, availableAccounts } = data

  const accounts = availableAccounts || [{ id: from_account_id, name: '주계좌 (입출금)', balanceFormatted: '' }]
  const [selectedId, setSelectedId] = useState(from_account_id || accounts[0]?.id)
  const [status, setStatus] = useState('pending') // pending | confirming | done

  const selectedAccount = accounts.find((a) => a.id === selectedId) || accounts[0]
  const isInsufficient = selectedAccount?.balance != null && selectedAccount.balance < data.amount

  async function handleConfirm(confirmed) {
    setStatus('confirming')
    try {
      const res = await fetch(`${API_BASE}/api/confirm-transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, confirmed, from_account_id: selectedId }),
      })
      const json = await res.json()
      setStatus('done')
      onDone(confirmed, json)
    } catch {
      setStatus('pending')
    }
  }

  if (status === 'done') return null

  return (
    <div className="transfer-card">
      <div className="transfer-card-label">이체 확인</div>
      <div className="transfer-amount-hero">{amountFormatted}</div>

      {/* 수신자 정보 */}
      <div className="transfer-details">
        <div className="transfer-row">
          <span className="transfer-lbl">받는 분</span>
          <span className="transfer-val">{to_contact}</span>
        </div>
        {contactInfo && (
          <div className="transfer-row">
            <span className="transfer-lbl">받는 계좌</span>
            <span className="transfer-val">{contactInfo.bank} · {contactInfo.accountNo}</span>
          </div>
        )}
        {memo && (
          <div className="transfer-row">
            <span className="transfer-lbl">메모</span>
            <span className="transfer-val">{memo}</span>
          </div>
        )}
      </div>

      {/* 출금 계좌 선택 */}
      <div className="transfer-account-section">
        <div className="transfer-account-label">출금 계좌 선택</div>
        <div className="transfer-account-list">
          {accounts.map((acc) => (
            <button
              key={acc.id}
              className={`transfer-account-btn ${selectedId === acc.id ? 'selected' : ''}`}
              onClick={() => setSelectedId(acc.id)}
              disabled={status === 'confirming'}
            >
              <span className="transfer-account-name">{acc.name}</span>
              <span className="transfer-account-balance">{acc.balanceFormatted}</span>
            </button>
          ))}
        </div>
        {isInsufficient && (
          <div className="transfer-account-warn">잔액이 부족합니다.</div>
        )}
      </div>

      <div className="transfer-actions">
        <button
          className="transfer-btn-cancel"
          onClick={() => handleConfirm(false)}
          disabled={status === 'confirming'}
        >
          취소
        </button>
        <button
          className="transfer-btn-confirm"
          onClick={() => handleConfirm(true)}
          disabled={status === 'confirming' || isInsufficient}
        >
          {status === 'confirming' ? '처리 중…' : '이체 확인'}
        </button>
      </div>
    </div>
  )
}
