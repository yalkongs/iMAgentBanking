import { useState, useEffect, useRef, useCallback } from 'react'
import Message from './components/Message.jsx'
import AnimatedBackground from './components/AnimatedBackground.jsx'
import { useWebSocket } from './hooks/useWebSocket.js'
import { useVoiceInput } from './hooks/useVoiceInput.js'

const API_BASE = import.meta.env.VITE_API_URL || ''

function getSessionId() {
  const id = 'sess_' + Math.random().toString(36).slice(2, 10)
  return id
}

const QUICK_CATEGORIES = [
  {
    label: '조회',
    items: ['잔액 얼마야?', '최근 거래 내역 보여줘', '이번 달 카드 내역 보여줘'],
  },
  {
    label: '이체',
    items: ['엄마한테 5만원 보내줘', '최근에 이체한 내역 보여줘'],
  },
  {
    label: '분석',
    items: ['이번 달 지출 분석해줘', '이번 달 카페 얼마 썼어?', '지난 달 가장 큰 지출은?'],
  },
]

// 데모 시나리오 메시지 목록
const DEMO_MESSAGES = [
  '잔액 얼마야?',
  '이번 달 지출 분석해줘',
  '엄마한테 5만원 보내줘',
]

export default function App() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId] = useState(getSessionId)
  const [alert, setAlert] = useState(null)

  // 프로액티브 AI 인사이트
  const [proactiveInsights, setProactiveInsights] = useState([])
  const [insightsLoading, setInsightsLoading] = useState(true)

  // 데모 모드
  const [demoMode, setDemoMode] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const demoQueueRef = useRef([])
  const demoTimeoutRef = useRef(null)
  const prevLoadingRef = useRef(false)

  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)
  const streamingIdRef = useRef(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  // 프로액티브 알림 로드
  useEffect(() => {
    fetch(`${API_BASE}/api/proactive`)
      .then((r) => r.json())
      .then((d) => { if (d.alert) setAlert(d.alert) })
      .catch(() => {})
  }, [])

  // 프로액티브 AI 인사이트 로드
  useEffect(() => {
    setInsightsLoading(true)
    fetch(`${API_BASE}/api/insights`)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.insights)) setProactiveInsights(d.insights) })
      .catch(() => {})
      .finally(() => setInsightsLoading(false))
  }, [])

  // WebSocket — 이벤트 처리
  useWebSocket(sessionId, useCallback((event) => {
    if (event.type === 'PENDING_TRANSFER') {
      const msgId = 'transfer_' + Date.now()
      setMessages((prev) => [
        ...prev,
        { id: msgId, type: 'transfer_pending', data: event.data },
      ])
    } else if (event.type === 'TRANSFER_COMPLETE') {
      const r = event.data
      setMessages((prev) => [
        ...prev,
        {
          id: 'tr_done_' + Date.now(),
          type: 'transfer_receipt',
          data: r,
        },
      ])
    } else if (event.type === 'TRANSFER_CANCELLED') {
      setMessages((prev) => [
        ...prev,
        {
          id: 'tr_cancel_' + Date.now(),
          type: 'transfer_result',
          success: false,
          text: '이체가 취소되었습니다.',
        },
      ])
    } else if (event.type === 'TRANSFER_FAILED') {
      setMessages((prev) => [
        ...prev,
        {
          id: 'tr_fail_' + Date.now(),
          type: 'transfer_result',
          success: false,
          text: `이체 실패: ${event.error}`,
        },
      ])
    } else if (event.type === 'TRANSACTION_ALERT') {
      setMessages((prev) => [
        ...prev,
        {
          id: 'tx_alert_' + event.data.alertId,
          type: 'transaction_alert',
          data: event.data,
        },
      ])
    } else if (event.type === 'TRANSACTION_ALERT_COMMENT') {
      const { alertId, comment } = event.data
      setMessages((prev) =>
        prev.map((m) =>
          m.type === 'transaction_alert' && m.data.alertId === alertId
            ? { ...m, data: { ...m.data, aiComment: comment } }
            : m
        )
      )
    }
  }, []))

  // 메시지 전송
  const sendMessage = useCallback(async (text) => {
    const msg = text.trim()
    if (!msg || isLoading) return

    setInput('')
    setIsLoading(true)

    setMessages((prev) => [
      ...prev,
      { id: 'user_' + Date.now(), role: 'user', type: 'text', text: msg },
    ])

    const assistantId = 'assistant_' + Date.now()
    streamingIdRef.current = assistantId
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', type: 'text', text: '', streaming: true },
    ])

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, sessionId }),
      })

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))

            if (data.type === 'text') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, text: m.text + data.delta }
                    : m
                )
              )
            } else if (data.type === 'ui_card') {
              setMessages((prev) => [
                ...prev,
                { id: 'card_' + Date.now() + Math.random(), type: 'ui_card', cardType: data.cardType, data: data.data },
              ])
            } else if (data.type === 'done') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, streaming: false } : m
                )
              )
            } else if (data.type === 'error') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, text: '오류가 발생했습니다. 다시 시도해주세요.', streaming: false }
                    : m
                )
              )
            }
          } catch {}
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === streamingIdRef.current
            ? { ...m, text: '연결 오류. 서버를 확인해주세요.', streaming: false }
            : m
        )
      )
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, sessionId])

  // 데모 모드: isLoading false 전환 시 다음 큐 실행
  useEffect(() => {
    if (prevLoadingRef.current && !isLoading && demoMode) {
      if (demoQueueRef.current.length > 0) {
        const next = demoQueueRef.current.shift()
        sendMessage(next)
      }
    }
    prevLoadingRef.current = isLoading
  }, [isLoading, demoMode, sendMessage])

  // 데모 모드: messages 변화 감지 → ContactCandidatesCard 자동 선택 / TransferCard 정지
  useEffect(() => {
    if (!demoMode) return

    const lastMsg = messages[messages.length - 1]
    if (!lastMsg) return

    // ContactCandidatesCard 감지 → 첫 번째 후보 자동 선택
    if (lastMsg.type === 'ui_card' && lastMsg.cardType === 'resolve_contact_candidates') {
      const d = lastMsg.data
      if (d.candidates && d.candidates.length > 0) {
        const c = d.candidates[0]
        const autoMsg = `${d.query}은(는) ${c.realName} (${c.bank} ${c.accountNoMasked})이야. 이 분으로 진행해줘.`
        // 잠시 후 자동 전송 (카드가 렌더될 시간 확보)
        setTimeout(() => sendMessage(autoMsg), 800)
      }
    }

    // TransferCard 감지 → 데모 중단, 입력창 재활성화
    if (lastMsg.type === 'transfer_pending') {
      demoQueueRef.current = []
      if (demoTimeoutRef.current) clearTimeout(demoTimeoutRef.current)
      setDemoMode(false)
    }
  }, [messages, demoMode, sendMessage])

  // 데모 시작
  function startDemo() {
    setMenuOpen(false)
    demoQueueRef.current = [...DEMO_MESSAGES.slice(1)] // 첫 번째는 즉시, 나머지는 큐에
    setDemoMode(true)

    // 15초 timeout guard
    demoTimeoutRef.current = setTimeout(() => {
      demoQueueRef.current = []
      setDemoMode(false)
    }, 15000)

    sendMessage(DEMO_MESSAGES[0])
  }

  // mock 데이터 리셋
  async function handleResetMock() {
    setMenuOpen(false)
    await fetch(`${API_BASE}/api/reset-mock`, { method: 'POST' })
    await fetch(`${API_BASE}/api/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    })
    setMessages([])
    setAlert(null)
    setDemoMode(false)
    demoQueueRef.current = []
    // 인사이트 새로고침
    setInsightsLoading(true)
    setProactiveInsights([])
    fetch(`${API_BASE}/api/insights`)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.insights)) setProactiveInsights(d.insights) })
      .catch(() => {})
      .finally(() => setInsightsLoading(false))
  }

  // 대화 초기화 (세션만)
  async function handleReset() {
    await fetch(`${API_BASE}/api/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    })
    setMessages([])
    setAlert(null)
    setDemoMode(false)
    demoQueueRef.current = []
  }

  const { isRecording, toggleRecording, error: voiceError } = useVoiceInput(
    useCallback((text) => {
      setInput(text)
      textareaRef.current?.focus()
    }, [])
  )

  function handleInputChange(e) {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const isEmpty = messages.length === 0

  return (
    <div className="app">
      <AnimatedBackground />
      {/* 헤더 */}
      <header className="header">
        <div className="header-title">
          <img src="/imbank-mark.png" alt="iM Bank" className="header-logo" />
          <div>
            <div className="header-name">iM Agent</div>
            <div className="header-subtitle">AI 금융 어시스턴트</div>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn-icon" onClick={handleReset} title="대화 초기화">
            ↺
          </button>
          <div className="menu-wrapper">
            <button
              className="btn-icon"
              onClick={() => setMenuOpen((o) => !o)}
              title="메뉴"
            >
              ⋯
            </button>
            {menuOpen && (
              <div className="dropdown-menu">
                <button className="dropdown-item" onClick={startDemo}>
                  ▷ 자동실행
                </button>
                <button className="dropdown-item" onClick={handleResetMock}>
                  ⟳ 리셋
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 메시지 영역 */}
      <div className="messages">
        {alert && (
          <div className="alert-banner">
            <span className="alert-icon">💡</span>
            <span className="alert-text">{alert.message}</span>
          </div>
        )}

        {isEmpty ? (
          <div className="empty-state">
            <div className="empty-icon">
              <img src="/imbank-mark.png" alt="iM Bank" style={{ width: 48, height: 48, objectFit: 'contain' }} />
            </div>
            <div className="empty-title">무엇을 도와드릴까요?</div>
            <div className="empty-desc">
              아래 항목을 탭하거나 직접 입력하세요.
            </div>

            {/* 프로액티브 AI 인사이트 — assistant 버블 스타일 */}
            {insightsLoading && (
              <div className="insights-loading">
                <div className="typing-indicator" style={{ justifyContent: 'flex-start', padding: '8px 0' }}>
                  <div className="message-avatar" style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', padding: 4 }}>
                    <img src="/imbank-mark.png" alt="iM" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                  <div className="typing-dots"><span /><span /><span /></div>
                </div>
              </div>
            )}
            {!insightsLoading && proactiveInsights.map((insight, i) => (
              <div key={i} className="message assistant" style={{ alignSelf: 'flex-start', width: '100%' }}>
                <div className="message-avatar">
                  <img src="/imbank-mark.png" alt="iM" />
                </div>
                <div className="message-bubble">{insight}</div>
              </div>
            ))}

            <div className="quick-categories">
              {QUICK_CATEGORIES.map((cat) => (
                <div key={cat.label} className="quick-category">
                  <div className="quick-category-label">{cat.label}</div>
                  <div className="quick-category-items">
                    {cat.items.map((p) => (
                      <button key={p} className="quick-btn" onClick={() => sendMessage(p)}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <Message
                key={msg.id}
                msg={msg}
                sessionId={sessionId}
                onQuickAction={sendMessage}
                onTransferDone={() => {}}
              />
            ))}
            {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="typing-indicator">
                <div className="message-avatar" style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', padding: 4 }}>
                  <img src="/imbank-mark.png" alt="iM Bank" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <div className="typing-dots">
                  <span /><span /><span />
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {voiceError && (
        <div style={{ padding: '6px 16px', fontSize: 12, color: 'var(--error)', background: 'var(--error-dim)' }}>
          {voiceError}
        </div>
      )}

      {/* 입력 영역 */}
      <div className="input-area">
        <div className="input-wrapper">
          <textarea
            ref={textareaRef}
            className="input-text"
            rows={1}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={isRecording ? '녹음 중...' : '메시지를 입력하세요'}
            disabled={isLoading || isRecording || demoMode}
          />
          <div className="input-actions">
            <button
              className={`btn-mic ${isRecording ? 'recording' : ''}`}
              onClick={toggleRecording}
              title={isRecording ? '녹음 중지' : '음성 입력'}
              disabled={demoMode}
            >
              🎤
            </button>
            <button
              className="btn-send"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading || demoMode}
              title="전송"
            >
              ↑
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
