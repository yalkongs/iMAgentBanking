import { useState, useEffect, useRef, useCallback } from 'react'
import Message from './components/Message.jsx'
import AnimatedBackground from './components/AnimatedBackground.jsx'
import DrawerBanner from './components/DrawerBanner.jsx'
import VoiceOverlay from './components/VoiceOverlay.jsx'
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
    items: ['잔액 얼마야?', '계좌 목록 보여줘', '최근 거래 내역 보여줘'],
  },
  {
    label: '이체',
    items: ['엄마한테 5만원 보내줘', '최근에 이체한 내역 보여줘'],
  },
  {
    label: '분석',
    items: ['이번 달 지출 분석해줘', '이번 달 카페 얼마 썼어?', '이번 달 어땠어?'],
  },
]

// 컨텍스트 기반 퀵 숏컷 — 마지막 카드 타입에 따라 변경
const CONTEXTUAL_SHORTCUTS = {
  get_balance: [
    { label: '이체', msg: '이체하기' },
    { label: '지출분석', msg: '이번 달 지출 분석해줘' },
    { label: '거래내역', msg: '최근 거래 내역 보여줘' },
    { label: '카드내역', msg: '이번 달 카드 내역 보여줘' },
    { label: '이달이야기', msg: '이번 달 어땠어?' },
  ],
  get_transactions: [
    { label: '지출분석', msg: '이번 달 지출 분석해줘' },
    { label: '카드내역', msg: '이번 달 카드 내역 보여줘' },
    { label: '이체', msg: '이체하기' },
    { label: '잔액조회', msg: '잔액 얼마야?' },
  ],
  analyze_spending: [
    { label: '카드내역', msg: '이번 달 카드 내역 보여줘' },
    { label: '이달이야기', msg: '이번 달 어땠어?' },
    { label: '잔액조회', msg: '잔액 얼마야?' },
    { label: '이체', msg: '이체하기' },
  ],
  analyze_card_spending: [
    { label: '지출분석', msg: '이번 달 지출 분석해줘' },
    { label: '이달이야기', msg: '이번 달 어땠어?' },
    { label: '잔액조회', msg: '잔액 얼마야?' },
    { label: '이체', msg: '이체하기' },
  ],
  get_transfer_suggestion: [
    { label: '이체', msg: '이체하기' },
    { label: '잔액조회', msg: '잔액 얼마야?' },
    { label: '거래내역', msg: '최근 거래 내역 보여줘' },
  ],
  transfer_receipt: [
    { label: '이체내역', msg: '최근 이체 내역 보여줘' },
    { label: '잔액확인', msg: '잔액 얼마야?' },
    { label: '또이체', msg: '이체하기' },
    { label: '지출분석', msg: '이번 달 지출 분석해줘' },
  ],
  monthly_story: [
    { label: '잔액조회', msg: '잔액 얼마야?' },
    { label: '이체', msg: '이체하기' },
    { label: '지출분석', msg: '이번 달 지출 분석해줘' },
    { label: '카드내역', msg: '이번 달 카드 내역 보여줘' },
  ],
  default: [
    { label: '잔액조회', msg: '잔액 얼마야?' },
    { label: '이체', msg: '이체하기' },
    { label: '지출분석', msg: '이번 달 지출 분석해줘' },
    { label: '최근거래', msg: '최근 거래 내역 보여줘' },
    { label: '카드내역', msg: '이번 달 카드 내역 보여줘' },
  ],
}

// 데모 시나리오 메시지 목록
const DEMO_MESSAGES = [
  '잔액 얼마야?',
  '이번 달 지출 분석해줘',
  '엄마한테 5만원 보내줘',
]

// 음성 데모 시나리오
const VOICE_DEMO_MESSAGES = [
  '엄마한테 5만원 보내줘',
  '이번 달 얼마 절약할 수 있어?',
  '적금 뭐가 좋아?',
]

// ── TTS 헬퍼 ──
function speakKorean(text, rate = 1.05, onEnd = null) {
  if (!window.speechSynthesis || !text) return
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.lang = 'ko-KR'
  utt.rate = rate
  utt.pitch = 1.0
  // 너무 긴 텍스트는 첫 100자만
  utt.text = text.length > 120 ? text.slice(0, 120) + '.' : text
  if (onEnd) utt.onend = onEnd
  window.speechSynthesis.speak(utt)
}

// 헬스 등급 계산
function getHealthGrade(score) {
  if (score >= 80) return { grade: 'A', color: '#34D399', cls: 'good' }
  if (score >= 60) return { grade: 'B', color: '#7dd3fc', cls: 'good' }
  if (score >= 40) return { grade: 'C', color: '#FBBF24', cls: 'fair' }
  return { grade: 'D', color: '#F87171', cls: 'poor' }
}

export default function App() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('계좌 목록 보여줘')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId] = useState(getSessionId)
  const [alert, setAlert] = useState(null)

  // 프로액티브 AI 인사이트
  const [proactiveInsights, setProactiveInsights] = useState([])
  const [insightsLoading, setInsightsLoading] = useState(true)
  const [insightsError, setInsightsError] = useState(false)

  // 초기 화면 fade-out
  const [leavingEmpty, setLeavingEmpty] = useState(false)

  // 데모 모드
  const [demoMode, setDemoMode] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const demoQueueRef = useRef([])
  const demoTimeoutRef = useRef(null)
  const prevLoadingRef = useRef(false)

  // 음성 모드
  const [voiceMode, setVoiceMode] = useState(false)
  const [isTtsSpeaking, setIsTtsSpeaking] = useState(false)
  const voiceModeRef = useRef(false)
  const pendingDemoRef = useRef(false)

  // voiceModeRef를 최신 voiceMode와 동기화
  useEffect(() => { voiceModeRef.current = voiceMode }, [voiceMode])

  // 상단 오버레이 입출금 알림
  const [txNotif, setTxNotif] = useState(null)
  const [txNotifVisible, setTxNotifVisible] = useState(false)
  const txNotifTimersRef = useRef([])

  // TTS 활성 여부
  const [ttsEnabled, setTtsEnabled] = useState(false)

  // 마지막 카드 타입 (컨텍스트 숏컷)
  const [lastCardType, setLastCardType] = useState(null)

  // 헬스 인덱스
  const [healthScore, setHealthScore] = useState(null)
  const [healthOpen, setHealthOpen] = useState(false)

  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const textareaRef = useRef(null)
  const streamingIdRef = useRef(null)
  const prevMsgCountRef = useRef(0)
  // GUI 드릴-다운에서 발생한 메시지를 scope별로 제거하기 위한 ref
  const currentGuiScopeRef = useRef(null)

  // 컨텍스트 숏컷 계산
  const currentShortcuts = CONTEXTUAL_SHORTCUTS[lastCardType] || CONTEXTUAL_SHORTCUTS.default

  // 스크롤 컨테이너 기준으로 즉시 스크롤
  const scrollToBottom = useCallback(() => {
    const el = messagesContainerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [])

  const isNearBottom = useCallback(() => {
    const el = messagesContainerRef.current
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight < 150
  }, [])

  const scrollToCardTop = useCallback(() => {
    const el = messagesContainerRef.current
    if (!el) return
    const all = el.querySelectorAll(
      '.message, .ui-card, .tx-alert-card, .transfer-card, .transfer-result, .transfer-receipt, .moment-card, .story-card'
    )
    const last = all[all.length - 1]
    if (last) el.scrollTop = last.offsetTop - 8
  }, [])

  useEffect(() => {
    const newCount = messages.length
    const added = newCount > prevMsgCountRef.current
    prevMsgCountRef.current = newCount

    if (added) {
      const lastMsg = messages[messages.length - 1]

      if (lastMsg?.noAutoScroll) {
        if (isNearBottom()) {
          const t = setTimeout(scrollToBottom, 60)
          return () => clearTimeout(t)
        }
        return
      }

      if (lastMsg?.type === 'ui_card' || lastMsg?.type === 'transfer_pending') {
        const t = setTimeout(scrollToCardTop, 80)
        return () => clearTimeout(t)
      }

      const t = setTimeout(scrollToBottom, 60)
      return () => clearTimeout(t)
    } else if (isNearBottom()) {
      scrollToBottom()
    }
  }, [messages, scrollToBottom, scrollToCardTop, isNearBottom])

  useEffect(() => () => txNotifTimersRef.current.forEach(clearTimeout), [])

  // visualViewport → CSS 변수 동기화
  // resize: Android Chrome 키보드 (viewport 높이 변화)
  // scroll: iOS Safari 키보드 (offsetTop 변화 — 이걸 빠뜨리면 입력창이 위로 사라짐)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => {
      document.documentElement.style.setProperty('--vvh', `${vv.height}px`)
      document.documentElement.style.setProperty('--vvtop', `${vv.offsetTop}px`)
    }
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

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
    setInsightsError(false)
    fetch(`${API_BASE}/api/insights`)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.insights)) setProactiveInsights(d.insights) })
      .catch(() => setInsightsError(true))
      .finally(() => setInsightsLoading(false))
  }, [])

  // 헬스 스코어 로드
  useEffect(() => {
    fetch(`${API_BASE}/api/health-score`)
      .then((r) => r.json())
      .then((d) => { if (d.score !== undefined) setHealthScore(d.score) })
      .catch(() => {})
  }, [])

  // WebSocket — 이벤트 처리
  useWebSocket(sessionId, useCallback((event) => {
    if (event.type === 'PENDING_TRANSFER') {
      // voiceMode일 때 녹음 일시 정지 → useVoiceConfirm이 처리
      if (voiceModeRef.current) stopRecording()
      const msgId = 'transfer_' + Date.now()
      setMessages((prev) => [
        ...prev,
        { id: msgId, type: 'transfer_pending', data: event.data },
      ])
    } else if (event.type === 'TRANSFER_COMPLETE') {
      const r = event.data
      setMessages((prev) => [
        ...prev,
        { id: 'tr_done_' + Date.now(), type: 'transfer_receipt', data: r },
      ])
      setLastCardType('transfer_receipt')
    } else if (event.type === 'TRANSFER_CANCELLED') {
      setMessages((prev) => [
        ...prev,
        { id: 'tr_cancel_' + Date.now(), type: 'transfer_result', success: false, text: '이체가 취소되었습니다.' },
      ])
    } else if (event.type === 'TRANSFER_FAILED') {
      setMessages((prev) => [
        ...prev,
        { id: 'tr_fail_' + Date.now(), type: 'transfer_result', success: false, text: `이체 실패: ${event.error}` },
      ])
    } else if (event.type === 'TRANSACTION_ALERT') {
      const data = event.data
      txNotifTimersRef.current.forEach(clearTimeout)
      txNotifTimersRef.current = []
      setTxNotif(data)
      const t1 = setTimeout(() => setTxNotifVisible(true), 30)
      const t2 = setTimeout(() => setTxNotifVisible(false), 5000)
      const t3 = setTimeout(() => setTxNotif(null), 5350)
      txNotifTimersRef.current = [t1, t2, t3]
    } else if (event.type === 'TRANSACTION_ALERT_COMMENT') {
      const { alertId, comment } = event.data
      setTxNotif((prev) =>
        prev && prev.alertId === alertId ? { ...prev, aiComment: comment } : prev
      )
    } else if (event.type === 'FINANCIAL_MOMENT') {
      // 금융 모먼트 카드 (급여, 카드대금, 과소비)
      setMessages((prev) => [
        ...prev,
        {
          id: 'moment_' + Date.now(),
          type: 'financial_moment',
          data: event.data,
          noAutoScroll: false,
        },
      ])
    }
  }, []))

  // Model C: 현재 GUI 위치/상태를 추적하는 ref (sendMessage 클로저에서 읽음)
  const currentGuiContextRef = useRef(null)

  // GUI 드릴-다운 scope 메시지 일괄 제거 (UI + 서버 AI 히스토리 동시 정리)
  const removeGuiScope = useCallback((scopeId) => {
    if (!scopeId) return
    setMessages((prev) => prev.filter((m) => m.guiScope !== scopeId))
    fetch(`${API_BASE}/api/clear-gui-scope`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, guiScope: scopeId }),
    }).catch(() => {})
  }, [sessionId])

  // 메시지 전송 (guiContext: undefined = ref 값 사용, null = 명시적 없음, object = override)
  const sendMessage = useCallback(async (text, guiScope = null, guiContext = undefined) => {
    const msg = text.trim()
    if (!msg || isLoading) return

    currentGuiScopeRef.current = guiScope

    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setIsLoading(true)
    setLeavingEmpty(true)

    setMessages((prev) => [
      ...prev,
      { id: 'user_' + Date.now(), role: 'user', type: 'text', text: msg, guiScope },
    ])

    const assistantId = 'assistant_' + Date.now()
    streamingIdRef.current = assistantId
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', type: 'text', text: '', streaming: true, guiScope },
    ])

    let finalText = ''

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          sessionId,
          guiScope,
          guiContext: guiContext !== undefined ? guiContext : currentGuiContextRef.current,
        }),
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
              finalText += data.delta
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
                { id: 'card_' + Date.now() + Math.random(), type: 'ui_card', cardType: data.cardType, data: data.data, guiScope: currentGuiScopeRef.current },
              ])
              setLastCardType(data.cardType)
              // voiceMode Path 2: ui_card 수신 시 요약 TTS
              if (voiceModeRef.current) {
                const summaryMap = {
                  get_balance: '잔액을 확인했습니다.',
                  get_savings_advice: '절약 분석 결과를 확인해보세요.',
                  compare_products: 'iM뱅크 추천 적금 상품을 확인해보세요.',
                  get_transactions: '거래 내역입니다.',
                  analyze_spending: '지출 분석 결과입니다.',
                }
                const summary = summaryMap[data.cardType]
                if (summary) {
                  setIsTtsSpeaking(true)
                  speakKorean(summary, 1.0, () => setIsTtsSpeaking(false))
                }
              }
            } else if (data.type === 'done') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, streaming: false } : m
                )
              )
              // voiceMode Path 1 억제: ui_card TTS(Path 2)와 충돌 방지
              if (voiceModeRef.current) {
                // voiceMode에서는 Path 2(ui_card TTS)만 사용
              } else if (ttsEnabled && finalText && finalText.length < 200) {
                // 일반 TTS Path 1
                speakKorean(finalText)
              }
            } else if (data.type === 'error') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, text: '오류가 발생했습니다. 다시 시도해주세요.', streaming: false, isError: true, failedMsg: msg }
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
            ? { ...m, text: '연결 오류. 서버를 확인해주세요.', streaming: false, isError: true, failedMsg: msg }
            : m
        )
      )
    } finally {
      setIsLoading(false)
      currentGuiScopeRef.current = null
    }
  }, [isLoading, sessionId, ttsEnabled])

  // Model C: 카드별 quickAction — overrideContext가 있으면 guiContext ref도 갱신
  const handleQuickAction = useCallback((text, overrideContext) => {
    if (overrideContext !== undefined) {
      currentGuiContextRef.current = overrideContext
    }
    sendMessage(text, null, overrideContext)
  }, [sendMessage])

  // 데모 모드: isLoading false 전환 시 다음 큐 실행 (TTS 완료 대기)
  useEffect(() => {
    if (prevLoadingRef.current && !isLoading && demoMode) {
      if (demoQueueRef.current.length > 0) {
        if (!isTtsSpeaking) {
          const next = demoQueueRef.current.shift()
          sendMessage(next)
        } else {
          pendingDemoRef.current = true // TTS 끝나면 발송
        }
      }
    }
    prevLoadingRef.current = isLoading
  }, [isLoading, demoMode, sendMessage, isTtsSpeaking])

  // TTS 완료 → 대기 중인 데모 메시지 발송
  useEffect(() => {
    if (!isTtsSpeaking && pendingDemoRef.current && demoMode && !isLoading) {
      pendingDemoRef.current = false
      if (demoQueueRef.current.length > 0) {
        const next = demoQueueRef.current.shift()
        sendMessage(next)
      }
    }
  }, [isTtsSpeaking, demoMode, isLoading, sendMessage])

  // 데모 모드: ContactCandidatesCard 자동 선택 / TransferCard 정지
  useEffect(() => {
    if (!demoMode) return
    const lastMsg = messages[messages.length - 1]
    if (!lastMsg) return

    if (lastMsg.type === 'ui_card' && lastMsg.cardType === 'resolve_contact_candidates') {
      const d = lastMsg.data
      if (d.candidates && d.candidates.length > 0) {
        const c = d.candidates[0]
        const autoMsg = `${d.query}은(는) ${c.realName} (${c.bank} ${c.accountNoMasked})이야. 이 분으로 진행해줘.`
        setTimeout(() => sendMessage(autoMsg), 800)
      }
    }

    if (lastMsg.type === 'transfer_pending') {
      demoQueueRef.current = []
      if (demoTimeoutRef.current) clearTimeout(demoTimeoutRef.current)
      setDemoMode(false)
    }
  }, [messages, demoMode, sendMessage])

  // 데모 시작
  function startDemo() {
    setMenuOpen(false)
    demoQueueRef.current = [...DEMO_MESSAGES.slice(1)]
    setDemoMode(true)
    demoTimeoutRef.current = setTimeout(() => {
      demoQueueRef.current = []
      setDemoMode(false)
    }, 15000)
    sendMessage(DEMO_MESSAGES[0])
  }

  // 음성 데모 시작
  function startVoiceDemo() {
    setMenuOpen(false)
    setVoiceMode(true)
    setTtsEnabled(true)
    demoQueueRef.current = [...VOICE_DEMO_MESSAGES.slice(1)]
    setDemoMode(true)
    demoTimeoutRef.current = setTimeout(() => {
      demoQueueRef.current = []
      setDemoMode(false)
      setVoiceMode(false)
    }, 30000)
    sendMessage(VOICE_DEMO_MESSAGES[0])
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
    setLastCardType(null)
    demoQueueRef.current = []
    setInsightsLoading(true)
    setInsightsError(false)
    setProactiveInsights([])
    fetch(`${API_BASE}/api/insights`)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.insights)) setProactiveInsights(d.insights) })
      .catch(() => setInsightsError(true))
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
    setLeavingEmpty(false)
    setLastCardType(null)
    demoQueueRef.current = []
    if (window.speechSynthesis) window.speechSynthesis.cancel()
  }

  const { isRecording, toggleRecording, stopRecording, error: voiceError } = useVoiceInput(
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
  const healthInfo = healthScore !== null ? getHealthGrade(healthScore) : null

  return (
    <div className="app">
      <AnimatedBackground />
      {/* 헤더 */}
      <header className="header">
        <div className="header-top">
          <div className="header-title">
            <img src="/imbank-mark.png" alt="iM Bank" className="header-logo" />
            <div>
              <div className="header-name">iM Agent</div>
              <div className="header-subtitle">AI 금융 어시스턴트</div>
            </div>
          </div>
          <div className="header-actions">
            {/* 헬스 인덱스 */}
            {healthInfo && (
              <button
                className={`health-index ${healthInfo.cls}`}
                onClick={() => setHealthOpen((o) => !o)}
                title="금융 건강도"
                aria-label="금융 건강도"
              >
                <span className="health-score">{healthScore}</span>
                <span className="health-label">건강도</span>
              </button>
            )}
            {/* TTS 토글 */}
            <button
              className={`btn-tts ${ttsEnabled ? 'active' : ''}`}
              onClick={() => {
                const next = !ttsEnabled
                setTtsEnabled(next)
                if (!next && window.speechSynthesis) window.speechSynthesis.cancel()
              }}
              title={ttsEnabled ? 'TTS 끄기' : 'TTS 켜기'}
              aria-label={ttsEnabled ? 'TTS 끄기' : 'TTS 켜기'}
            >
              {ttsEnabled ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" opacity="0.5">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                </svg>
              )}
            </button>
            <button className="btn-icon" onClick={handleReset} title="대화 초기화" aria-label="대화 초기화">
              ↺
            </button>
            <div className="menu-wrapper">
              <button
                className="btn-icon"
                onClick={() => setMenuOpen((o) => !o)}
                title="메뉴"
                aria-label="메뉴"
                aria-expanded={menuOpen}
              >
                ⋯
              </button>
              {menuOpen && (
                <div className="dropdown-menu">
                  <button className="dropdown-item" onClick={startDemo}>
                    ▷ 자동실행
                  </button>
                  <button className="dropdown-item" onClick={startVoiceDemo}>
                    ◎ 음성 데모
                  </button>
                  <button className="dropdown-item" onClick={handleResetMock}>
                    ⟳ 리셋
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* 입출금 알림 오버레이 */}
        {txNotif && (
          <div className={`tx-notif-wrap${txNotifVisible ? ' visible' : ''}`}>
            <div className={`tx-notif-inner ${txNotif.isIncome ? 'income' : 'expense'}`}>
              <span className={`tx-notif-badge ${txNotif.isIncome ? 'income' : 'expense'}`}>
                {txNotif.isIncome ? '입금' : '출금'}
              </span>
              <span className="tx-notif-counterpart">{txNotif.counterpart}</span>
              <span className={`tx-notif-amount ${txNotif.isIncome ? 'income' : 'expense'}`}>
                {txNotif.amountFormatted}
              </span>
              {txNotif.aiComment && (
                <span className="tx-notif-comment">{txNotif.aiComment}</span>
              )}
            </div>
          </div>
        )}
        {/* 금융 팁 배너 */}
        <DrawerBanner />
      </header>

      {/* 메시지 영역 */}
      <div className="messages" ref={messagesContainerRef} role="log" aria-live="polite" aria-label="대화 내역">
        <div className="messages-inner">

        {isEmpty ? (
          <div className={`empty-state${leavingEmpty ? ' leaving' : ''}`}>
            <div className="empty-icon">
              <img src="/imbank-mark.png" alt="iM Bank" style={{ width: 48, height: 48, objectFit: 'contain' }} />
            </div>
            <div className="empty-title">무엇을 도와드릴까요?</div>
            <div className="empty-desc">
              아래 항목을 탭하거나 직접 입력하세요.
            </div>

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

            {insightsError && (
              <div className="insights-error">AI 인사이트를 불러올 수 없습니다.</div>
            )}
            {!insightsLoading && !insightsError && proactiveInsights.map((insight, i) => (
              <div key={i} className="message assistant" style={{ alignSelf: 'flex-start', width: '100%' }}>
                <div className="message-avatar">
                  <img src="/imbank-mark.png" alt="iM" />
                </div>
                <div className="message-bubble">{insight}</div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <Message
                key={msg.id}
                msg={msg}
                sessionId={sessionId}
                onQuickAction={handleQuickAction}
                onTransferDone={() => {}}
                onClearScope={removeGuiScope}
                onGuiContextChange={(ctx) => { currentGuiContextRef.current = ctx }}
                voiceMode={voiceMode}
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
      </div>

      {voiceError && (
        <div style={{ padding: '6px 16px', fontSize: 12, color: 'var(--error)', background: 'var(--error-dim)' }}>
          {voiceError}
        </div>
      )}

      {/* 컨텍스트 퀵 숏컷 */}
      {!isEmpty && (
        <div className="quick-shortcuts">
          {currentShortcuts.map((s) => (
            <button
              key={s.label}
              className="qs-btn"
              onClick={() => sendMessage(s.msg)}
              disabled={isLoading || demoMode}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* 음성 오버레이 */}
      {voiceMode && (
        <VoiceOverlay
          state={isTtsSpeaking ? 'SPEAKING' : isLoading ? 'PROCESSING' : isRecording ? 'RECORDING' : 'IDLE'}
          onClose={() => {
            setVoiceMode(false)
            setDemoMode(false)
            demoQueueRef.current = []
            if (window.speechSynthesis) window.speechSynthesis.cancel()
            setIsTtsSpeaking(false)
          }}
          onMicTap={toggleRecording}
        />
      )}

      {/* 입력 영역 */}
      <div className="input-area">
        <div className={`input-wrapper${isRecording ? ' is-recording' : ''}`}>
          <textarea
            ref={textareaRef}
            className="input-text"
            rows={1}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={isRecording ? '말씀하세요...' : '메시지를 입력하세요'}
            disabled={isLoading || isRecording || demoMode}
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            inputMode="text"
          />
          <div className="input-actions">
            <button
              className={`btn-mic ${isRecording ? 'recording' : ''}`}
              onClick={toggleRecording}
              title={isRecording ? '녹음 중지' : '음성 입력'}
              aria-label={isRecording ? '녹음 중지' : '음성 입력'}
              disabled={demoMode}
            >
              {isRecording ? (
                <svg className="mic-wave" width="18" height="18" viewBox="0 0 20 18" fill="currentColor">
                  <rect className="wave-bar" x="0"  y="5"  width="3" height="8"  rx="1.5"/>
                  <rect className="wave-bar" x="4.5" y="2" width="3" height="14" rx="1.5"/>
                  <rect className="wave-bar" x="9"  y="4"  width="3" height="10" rx="1.5"/>
                  <rect className="wave-bar" x="13.5" y="1" width="3" height="16" rx="1.5"/>
                  <rect className="wave-bar" x="18" y="5"  width="2" height="8"  rx="1"/>
                </svg>
              ) : (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="23"/>
                  <line x1="8"  y1="23" x2="16" y2="23"/>
                </svg>
              )}
            </button>
            <button
              className="btn-send"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading || demoMode}
              title="전송"
              aria-label="전송"
            >
              ↑
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
