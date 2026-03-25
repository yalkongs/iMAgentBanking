import { useState, useRef, useCallback, useEffect } from 'react'
import { useVoiceConfirm } from '../hooks/useVoiceConfirm.js'

const API_BASE = import.meta.env.VITE_API_URL || ''

// ── 스와이프 확인 슬라이더 ──
function SwipeConfirm({ onConfirm, disabled }) {
  const trackRef = useRef(null)
  const [offset, setOffset] = useState(0)
  const [swiping, setSwiping] = useState(false)
  const [done, setDone] = useState(false)
  const startXRef = useRef(0)
  const THUMB = 48

  const getMax = useCallback(() => {
    const w = trackRef.current?.offsetWidth || 280
    return w - THUMB - 8
  }, [])

  function onTouchStart(e) {
    if (disabled || done) return
    setSwiping(true)
    startXRef.current = e.touches[0].clientX
  }

  function onTouchMove(e) {
    if (!swiping || disabled || done) return
    e.preventDefault()
    const dx = e.touches[0].clientX - startXRef.current
    const max = getMax()
    const clamped = Math.max(0, Math.min(dx, max))
    setOffset(clamped)
    if (clamped / max >= 0.92) {
      setSwiping(false)
      setDone(true)
      setOffset(max)
      setTimeout(onConfirm, 260)
    }
  }

  function onTouchEnd() {
    if (!swiping) return
    setSwiping(false)
    setOffset(0)
  }

  // 마우스 지원 (데스크톱 테스트용)
  function onMouseDown(e) {
    if (disabled || done) return
    setSwiping(true)
    startXRef.current = e.clientX
    const move = (ev) => {
      const dx = ev.clientX - startXRef.current
      const max = getMax()
      const clamped = Math.max(0, Math.min(dx, max))
      setOffset(clamped)
      if (clamped / max >= 0.92) {
        setSwiping(false)
        setDone(true)
        setOffset(max)
        window.removeEventListener('mousemove', move)
        window.removeEventListener('mouseup', up)
        setTimeout(onConfirm, 260)
      }
    }
    const up = () => {
      setSwiping(false)
      setOffset(0)
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }

  const max = getMax()
  const progress = max > 0 ? offset / max : 0

  return (
    <div
      ref={trackRef}
      className={`swipe-track ${disabled ? 'disabled' : ''} ${done ? 'confirmed' : ''}`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseDown={onMouseDown}
    >
      <div className="swipe-fill" style={{ width: `${progress * 100}%` }} />
      <span className="swipe-label" style={{ opacity: done ? 0 : Math.max(0, 1 - progress * 2.5) }}>
        {done ? '' : '밀어서 이체 확인'}
      </span>
      <div
        className="swipe-thumb"
        style={{
          transform: `translateX(${offset}px)`,
          transition: swiping ? 'none' : 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {done ? '✓' : '›'}
      </div>
    </div>
  )
}

export default function TransferCard({ data, sessionId, onDone, voiceMode }) {
  const { to_contact, amountFormatted, from_account_id, memo, contactInfo, availableAccounts } = data

  const accounts = availableAccounts || [{ id: from_account_id, name: '주계좌 (입출금)', balanceFormatted: '' }]
  const [selectedId, setSelectedId] = useState(from_account_id || accounts[0]?.id)
  const [status, setStatus] = useState('pending') // pending | confirming | done
  const [voiceHint, setVoiceHint] = useState(voiceMode ? '"네" 또는 "아니오"라고 말씀해 주세요' : null)

  const selectedAccount = accounts.find((a) => a.id === selectedId) || accounts[0]
  const isInsufficient = selectedAccount?.balance != null && selectedAccount.balance < data.amount

  // 음성 확인 (voiceMode일 때 자동 활성화)
  useVoiceConfirm({
    isActive: voiceMode && status === 'pending',
    onConfirm: () => handleConfirm(true),
    onCancel: () => handleConfirm(false),
    onTimeout: () => setVoiceHint('음성 인식 시간이 초과되었습니다. 버튼을 눌러 확인해 주세요.'),
    timeoutMs: 5000,
  })

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
      {voiceHint && <div className="transfer-voice-hint">{voiceHint}</div>}
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
        <div className="transfer-account-label">출금 계좌</div>
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

      {/* 스와이프 확인 + 취소 */}
      <div className="transfer-swipe-row">
        {!isInsufficient && status !== 'confirming' ? (
          <SwipeConfirm
            onConfirm={() => handleConfirm(true)}
            disabled={isInsufficient || status === 'confirming'}
          />
        ) : (
          <button
            className="transfer-btn-confirm"
            onClick={() => handleConfirm(true)}
            disabled={status === 'confirming' || isInsufficient}
          >
            {status === 'confirming' ? '처리 중…' : '이체 확인'}
          </button>
        )}
      </div>

      <button
        className="transfer-btn-cancel"
        onClick={() => handleConfirm(false)}
        disabled={status === 'confirming'}
        style={{ width: '100%', marginTop: 6 }}
      >
        취소
      </button>
    </div>
  )
}
