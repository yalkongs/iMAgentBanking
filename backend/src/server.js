import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { put } from '@vercel/blob'
import { toolDefinitions, handleToolCall, executeTransfer, handleAnalyzeSpending, handleAnalyzeCardSpending } from './tools.js'
import { getProactiveAlert, getInitialAccounts, getInitialTransactions, contacts } from './mockData.js'

const app = express()
const httpServer = createServer(app)

// ──────────────────────────────────────────────
// WebSocket 서버
// ──────────────────────────────────────────────
const wss = new WebSocketServer({ server: httpServer })
// sessionId → WebSocket 클라이언트
const wsClients = new Map()

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'ws://localhost')
  const sessionId = url.searchParams.get('sessionId')
  if (sessionId) {
    wsClients.set(sessionId, ws)
    ws.on('close', () => wsClients.delete(sessionId))
  }
})

function sendWsEvent(sessionId, event) {
  const ws = wsClients.get(sessionId)
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify(event))
  }
}

function broadcastWsEvent(event) {
  for (const ws of wsClients.values()) {
    if (ws.readyState === 1) ws.send(JSON.stringify(event))
  }
}

// ── 백그라운드 입출금 시뮬레이터 ──
const BG_TRANSACTIONS = [
  { counterpart: '국민건강보험공단', amount: -139230, category: '자동이체', memo: '건강보험료 자동이체' },
  { counterpart: '한국전력', amount: -52400, category: '자동이체', memo: '전기요금' },
  { counterpart: '(주)카카오뱅크', amount: 3000000, category: '이체', memo: '전세자금 입금' },
  { counterpart: '쿠팡', amount: -87900, category: '이체', memo: '쿠팡 결제' },
  { counterpart: '박재원', amount: 150000, category: '송금', memo: '' },
  { counterpart: 'LG유플러스', amount: -55000, category: '자동이체', memo: '통신요금' },
]

let bgTxIndex = 0
setInterval(async () => {
  if (wsClients.size === 0) return
  const tx = BG_TRANSACTIONS[bgTxIndex % BG_TRANSACTIONS.length]
  bgTxIndex++
  const alertId = Date.now().toString()
  const alertData = {
    ...tx,
    alertId,
    amountFormatted: (tx.amount > 0 ? '+' : '') + tx.amount.toLocaleString('ko-KR') + '원',
    isIncome: tx.amount > 0,
    timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
  }
  // 1. 먼저 코멘트 없이 알림 전송
  broadcastWsEvent({ type: 'TRANSACTION_ALERT', data: alertData })

  // 2. Claude 비동기 코멘트 생성 (2500ms timeout)
  const txDesc = `${tx.amount > 0 ? '입금' : '출금'}: ${tx.counterpart}, ${Math.abs(tx.amount).toLocaleString('ko-KR')}원, 카테고리: ${tx.category}`
  try {
    const commentRes = await Promise.race([
      anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 150,
        messages: [{
          role: 'user',
          content: `다음 금융 거래에 대해 유용한 1-2문장 코멘트를 한국어 격식체(~입니다, ~하세요)로 작성하라. 이모지 절대 사용 금지: ${txDesc}`,
        }],
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500)),
    ])
    const comment = commentRes.content[0]?.text?.trim()
    if (comment) {
      broadcastWsEvent({ type: 'TRANSACTION_ALERT_COMMENT', data: { alertId, comment } })
    }
  } catch {
    // timeout or error — 코멘트 없이 표시 (이미 알림은 전송됨)
  }
}, 90000) // 90초마다 (1회/분 이하)

// ── 금융 모먼트 시뮬레이터 (급여, 카드대금 D-3) ──
const FINANCIAL_MOMENTS = [
  {
    momentType: 'salary',
    title: '(주)ABC테크에서 급여가 입금되었습니다',
    amountFormatted: '3,000,000원',
    description: '3월 급여가 주계좌에 입금되었습니다.',
  },
  {
    momentType: 'card_due',
    title: '신한카드 결제일이 3일 남았습니다',
    amountFormatted: '485,000원',
    dueAmount: 485000,
    dueDate: '2026-04-15',
    description: '3월 카드 이용금액 485,000원이 4월 15일에 자동 결제됩니다.',
    daysLeft: 3,
  },
]

let momentIndex = 0
setInterval(() => {
  if (wsClients.size === 0) return
  const moment = FINANCIAL_MOMENTS[momentIndex % FINANCIAL_MOMENTS.length]
  momentIndex++
  broadcastWsEvent({ type: 'FINANCIAL_MOMENT', data: moment })
}, 180000) // 3분마다

// ──────────────────────────────────────────────
// 세션 관리 (대화 히스토리 + 대기 중인 이체)
// ──────────────────────────────────────────────
const sessions = new Map()
// sessionId → { messages, pendingTransfer, accounts, transactions, aliasStore }
// 새 세션마다 독립적인 데이터 스냅샷을 생성해 사용자 간 상태 격리

function getSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      messages: [],
      pendingTransfer: null,
      accounts: getInitialAccounts(),
      transactions: getInitialTransactions(),
      aliasStore: new Map(),
    })
  }
  return sessions.get(sessionId)
}

function getSessionCtx(session) {
  return { accounts: session.accounts, transactions: session.transactions, aliasStore: session.aliasStore }
}

// ──────────────────────────────────────────────
// 미들웨어
// ──────────────────────────────────────────────
app.use(cors())
app.use(express.json())

const upload = multer({ storage: multer.memoryStorage() })

// ──────────────────────────────────────────────
// SDK 초기화
// ──────────────────────────────────────────────
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ──────────────────────────────────────────────
// 대화 아카이빙 — Vercel Blob (백그라운드, 사용자 비노출)
// ──────────────────────────────────────────────
async function archiveConversation({ sessionId, userMessage, assistantText, toolCalls }) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return
  const now = new Date()
  const dateStr = [now.getFullYear(), String(now.getMonth()+1).padStart(2,'0'), String(now.getDate()).padStart(2,'0')].join('-')
  const entry = {
    id: `${sessionId}-${now.getTime()}`,
    sessionId,
    timestamp: now.toISOString(),
    userMessage,
    assistantText,
    toolCalls,
  }
  const path = `archive/${dateStr}/${sessionId}/${now.getTime()}.json`
  await put(path, JSON.stringify(entry), {
    access: 'private',
    contentType: 'application/json',
    token: process.env.BLOB_READ_WRITE_TOKEN,
  })
}

// ──────────────────────────────────────────────
// System Prompt
// ──────────────────────────────────────────────
const SYSTEM_PROMPT = `당신은 iM뱅크의 AI 금융 어시스턴트입니다.
사용자의 자연어 요청을 정확히 파악하고 적절한 도구로 금융 업무를 처리합니다.

## 이체 요청 처리 절차 (반드시 순서 준수)

### STEP 1. resolve_contact 로 수신자 확인
결과에 따라 아래 분기를 따르세요.

**status:"known"** (이미 등록된 닉네임)
→ 저장된 실명·은행 안내 후 STEP 2로 진행

**status:"candidates"** (거래 이력 기반 후보 있음)
→ 후보를 번호 목록으로 제시. 계좌번호는 accountNoMasked(뒤 4자리)만 표시.
→ "번호로 선택해 주시면 '\${닉네임}'으로 저장하겠습니다." 안내
→ 사용자 선택 확인 후 save_alias 저장 → STEP 2로 진행

**status:"no_history"** (거래 이력 없음)
→ "아직 \${닉네임} 계좌가 등록되어 있지 않습니다. 이름 또는 계좌번호를 알려주시면 등록해 드리겠습니다." 안내
→ 사용자가 이름을 제공하면 → resolve_contact(이름)으로 재조회 후 "이 분이 \${닉네임}이 맞습니까?" 확인
→ 확인 완료 후 save_alias 저장 → STEP 2로 진행

### STEP 2. 금액 확인
- 금액이 명시된 경우 → STEP 3으로 바로 진행
- 금액 미명시 → get_transfer_suggestion(real_name) 호출
  → "이전에 가장 자주 보내신 금액은 N원입니다. 이번에도 같은 금액으로 보내드릴까요?" 제안

### STEP 3. transfer 호출
- to_contact에는 resolve_contact 또는 save_alias로 확인된 실명을 전달
- transfer 호출 시 사용자 확인 UI가 자동 표시됨

## 일반 규칙
- 항상 한국어로 응답하세요.
- 계좌/잔액 관련 요청("계좌 목록", "내 계좌", "보유 계좌", "잔액", "얼마야" 등)은 이전 대화에서 잔액을 이미 알고 있더라도 반드시 get_balance 를 새로 호출하세요.
- 도구 결과는 UI 카드로 자동 표시됩니다. 도구 결과의 숫자·목록·내역을 절대 텍스트로 반복하지 마세요. 잔액·거래금액·계좌번호 등을 텍스트로 언급하지 마세요.
- 도구 호출 후에는 "확인하였습니다", "조회하였습니다" 등 1문장 안내만 하세요. 결과 데이터는 말하지 마세요.
- 조회 요청에 닉네임이 포함되면 resolve_contact 로 실명을 먼저 확인하세요.
- 어투는 반드시 '~입니다', '~까?', '~드리겠습니다' 형식의 정중한 격식체를 사용하세요. '~요', '~해요', '~할게요' 같은 구어체는 절대 사용하지 마세요.
- 이모지는 사용하지 마세요.

## 데이터 출처 안내
- 은행 계좌 거래내역(get_transactions): 급여·이체·자동이체·송금·이자 등 직접 거래
- 카드 거래내역(get_card_transactions): 가맹점명만 기록, 품목 상세 불명. 마이데이터 연동 포함.
- 지출 분석 시 카드 데이터 기반이면 "추정 카테고리 기반 집계로 실제와 다를 수 있습니다"를 반드시 안내하세요.

## 상품 안내 처리 절차

### 상품 유형 분류
- 예금/저축 관련: "예금", "적금", "파킹통장", "청년도약계좌", "금리 높은 상품" → search_products(type: 'deposit' 또는 'savings')
- 대출 관련: "대출", "신용대출", "주택담보대출", "전세자금" → search_products(type: 'loan')
- 카드 관련: "카드", "신용카드", "체크카드", "캐시백", "마일리지" → search_products(type: 'credit_card' 또는 'debit_card')
- 투자/연금: "IRP", "ISA", "퇴직연금", "절세", "연금" → search_products(type: 'investment')
- 특정 혜택 검색: "해외 여행 카드", "교통 할인", "청년 상품" → keyword 파라미터 활용

### 상세 조회
- 특정 상품을 더 자세히 알고 싶을 때 → get_product_detail(product_id) 호출
- search_products 결과 카드에서 상품을 클릭하면 사용자가 상세 조회를 요청하게 됩니다

### 상품 안내 시 주의사항
- 금리·혜택은 변동될 수 있으므로 "현재 기준"임을 안내하세요.
- 대출 금리는 신용등급·조건에 따라 다름을 안내하세요.
- 상품 도구 결과는 UI 카드로 자동 표시되므로 내용을 텍스트로 반복하지 마세요.`

// ──────────────────────────────────────────────
// CURRENT_VIEW 동적 System Prompt 빌더 (Model C)
// GUI 상태를 System Prompt에 주입해 AI가 "지금 화면이 어딘지" 항상 인식하게 함
// ──────────────────────────────────────────────
function buildSystemPrompt(guiContext) {
  if (!guiContext) return SYSTEM_PROMPT
  const lines = ['', '[CURRENT_VIEW]']
  const {
    view, accountId, accountName, accountType, balance, totalBalance,
    interestRate, maturityDate, daysToMaturity,
    momentType, title, amountFormatted, daysLeft, dueAmount, dueDate,
    counterpart, amount, isIncome, category,
    period, topCategory,
  } = guiContext
  if (view) lines.push(`view: ${view}`)
  if (accountId) lines.push(`accountId: ${accountId}`)
  if (accountName) lines.push(`accountName: ${accountName}`)
  if (accountType) {
    const typeLabel = { checking: '입출금', installment_savings: '정기적금', term_deposit: '정기예금', savings: '저축', cma: 'CMA' }
    lines.push(`accountType: ${typeLabel[accountType] || accountType}`)
  }
  if (balance !== undefined) lines.push(`balance: ${balance.toLocaleString('ko-KR')}원`)
  if (totalBalance !== undefined) lines.push(`totalBalance: ${totalBalance.toLocaleString('ko-KR')}원`)
  if (interestRate) lines.push(`interestRate: 연 ${interestRate}%`)
  if (maturityDate) lines.push(`maturityDate: ${maturityDate}`)
  if (daysToMaturity !== undefined) lines.push(`daysToMaturity: ${daysToMaturity}일 후 만기`)
  if (momentType) lines.push(`momentType: ${momentType}`)
  if (title) lines.push(`title: ${title}`)
  if (amountFormatted) lines.push(`amount: ${amountFormatted}`)
  if (dueAmount !== undefined) lines.push(`dueAmount: ${dueAmount.toLocaleString('ko-KR')}원`)
  if (dueDate) lines.push(`dueDate: ${dueDate}`)
  if (daysLeft !== undefined) lines.push(`daysLeft: D-${daysLeft}`)
  if (counterpart) lines.push(`counterpart: ${counterpart}`)
  if (amount !== undefined) lines.push(`transactionAmount: ${(amount > 0 ? '+' : '') + amount.toLocaleString('ko-KR')}원`)
  if (isIncome !== undefined) lines.push(`direction: ${isIncome ? '입금' : '출금'}`)
  if (category) lines.push(`category: ${category}`)
  if (period) lines.push(`analysisPeriod: ${period}`)
  if (topCategory) lines.push(`topSpendingCategory: ${topCategory}`)
  lines.push('[/CURRENT_VIEW]')
  lines.push('사용자가 "이거", "이 계좌", "여기", "지금 보는" 등 지시어를 쓰면 위 CURRENT_VIEW 정보를 기준으로 해석하세요.')
  return SYSTEM_PROMPT + lines.join('\n')
}

// ──────────────────────────────────────────────
// POST /api/whisper — 음성 → 텍스트
// ──────────────────────────────────────────────
app.post('/api/whisper', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'audio 파일이 없습니다.' })
  }

  try {
    const mime = req.file.mimetype || 'audio/webm'
    const ext = mime.includes('mp4') ? 'mp4' : mime.includes('ogg') ? 'ogg' : 'webm'
    const file = new File([req.file.buffer], `audio.${ext}`, { type: mime })
    const result = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: 'ko',
    })
    res.json({ text: result.text })
  } catch (err) {
    console.error('Whisper error:', err)
    if (err.status === 429 || (err.message && err.message.includes('429'))) {
      return res.status(503).json({ error: '음성 인식 서비스가 잠시 혼잡합니다. 잠시 후 다시 시도해 주세요.' })
    }
    res.status(500).json({ error: '음성 인식 실패', detail: err.message })
  }
})

// ──────────────────────────────────────────────
// GET /api/proactive — 프로액티브 알림
// ──────────────────────────────────────────────
app.get('/api/proactive', (req, res) => {
  const alert = getProactiveAlert()
  res.json({ alert })
})

// ──────────────────────────────────────────────
// GET /api/insights — 프로액티브 AI 인사이트
// ──────────────────────────────────────────────
app.get('/api/insights', async (req, res) => {
  try {
    const sessionId = req.query.sessionId || 'default'
    const session = getSession(sessionId)
    const ctx = getSessionCtx(session)
    const [accountData, cardData] = await Promise.all([
      Promise.resolve(handleAnalyzeSpending({}, ctx)),
      Promise.resolve(handleAnalyzeCardSpending({}, ctx)),
    ])
    const spendingSummary = JSON.stringify({ account: accountData, card: cardData })

    const result = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `다음은 사용자의 이번 달 지출 분석 데이터입니다. 개인화된 금융 인사이트 3가지를 한국어로 작성하세요. 각 인사이트는 1-2문장, 구체적 수치 포함. 포맷: JSON array of strings. 데이터: ${spendingSummary}`,
      }],
    })

    const text = result.content[0]?.text?.trim() || '[]'
    // JSON array 추출 — 코드블록이나 부가 텍스트 포함 대응
    let insights = []
    try {
      const match = text.match(/\[[\s\S]*\]/)
      if (match) insights = JSON.parse(match[0])
    } catch { insights = [] }
    if (!Array.isArray(insights)) insights = []

    res.json({ insights })
  } catch (err) {
    console.error('Insights error:', err)
    res.json({ insights: [] })
  }
})

// ──────────────────────────────────────────────
// POST /api/reset-mock — 특정 세션 데이터 초기화
// ──────────────────────────────────────────────
app.post('/api/reset-mock', (req, res) => {
  const { sessionId } = req.body
  if (sessionId && sessions.has(sessionId)) {
    const session = sessions.get(sessionId)
    session.accounts = getInitialAccounts()
    session.transactions = getInitialTransactions()
    session.aliasStore = new Map()
    session.messages = []
    session.pendingTransfer = null
  }
  res.json({ success: true })
})

// ──────────────────────────────────────────────
// POST /api/clear-gui-scope — GUI 드릴-다운 메시지 쌍 제거
// ──────────────────────────────────────────────
app.post('/api/clear-gui-scope', (req, res) => {
  const { sessionId = 'default', guiScope } = req.body
  if (!guiScope) return res.json({ removed: 0 })
  const session = sessions.get(sessionId)
  if (!session) return res.json({ removed: 0 })
  const before = session.messages.length
  session.messages = session.messages.filter((m) => m._guiScope !== guiScope)
  res.json({ removed: before - session.messages.length })
})

// ──────────────────────────────────────────────
// POST /api/chat — Claude Tool Use + SSE 스트리밍
// ──────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { message, sessionId = 'default', guiScope = null, guiContext = null } = req.body
  if (!message) return res.status(400).json({ error: 'message가 없습니다.' })

  // SSE 헤더
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const sendSSE = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`)

  const session = getSession(sessionId)
  // _guiScope: GUI 드릴-다운 범위 태그 (Claude에는 전달 안 함, clear-gui-scope로 제거 가능)
  session.messages.push({ role: 'user', content: message, _guiScope: guiScope })

  // ── 계좌/잔액 키워드 감지 → 첫 번째 턴에서 get_balance 강제 호출 ──
  const BALANCE_KEYWORDS = ['계좌', '잔액', '얼마', '내 돈', '보유 계좌', '내 계좌']
  const needsBalanceTool = BALANCE_KEYWORDS.some((k) => message.includes(k))

  try {
    let continueLoop = true
    let isFirstTurn = true  // 첫 번째 Claude 턴 여부

    // 아카이빙용 — 모든 루프 이터레이션에 걸쳐 누적
    let archiveAssistantText = ''
    const archiveToolCalls = []

    while (continueLoop) {
      let fullText = ''
      let toolUses = []
      let currentToolUse = null

      // 계좌 키워드가 있는 첫 번째 턴: get_balance 강제 호출
      const toolChoice = (needsBalanceTool && isFirstTurn)
        ? { type: 'tool', name: 'get_balance' }
        : { type: 'auto' }
      isFirstTurn = false

      // Claude 스트리밍 요청 (_guiScope는 내부 태그이므로 제거 후 전달)
      const stream = anthropic.messages.stream({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: buildSystemPrompt(guiContext),
        tools: toolDefinitions,
        tool_choice: toolChoice,
        messages: session.messages.map(({ _guiScope, ...m }) => m),
      })

      for await (const event of stream) {
        if (event.type === 'content_block_start') {
          if (event.content_block.type === 'tool_use') {
            currentToolUse = {
              id: event.content_block.id,
              name: event.content_block.name,
              inputJson: '',
            }
          }
        } else if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            fullText += event.delta.text
            sendSSE({ type: 'text', delta: event.delta.text })
          } else if (event.delta.type === 'input_json_delta' && currentToolUse) {
            currentToolUse.inputJson += event.delta.partial_json
          }
        } else if (event.type === 'content_block_stop') {
          if (currentToolUse) {
            try {
              currentToolUse.input = JSON.parse(currentToolUse.inputJson || '{}')
            } catch {
              currentToolUse.input = {}
            }
            toolUses.push(currentToolUse)
            currentToolUse = null
          }
        } else if (event.type === 'message_stop') {
          continueLoop = false
        }
      }

      const finalMsg = await stream.finalMessage()

      // 아카이빙용 텍스트 누적
      archiveAssistantText += fullText

      // assistant 메시지 기록 (guiScope 태깅)
      session.messages.push({ role: 'assistant', content: finalMsg.content, _guiScope: guiScope })

      // stop_reason 확인
      if (finalMsg.stop_reason === 'tool_use') {
        continueLoop = true
        const toolResults = []

        for (const tu of toolUses) {
          archiveToolCalls.push({ name: tu.name, input: tu.input })
          sendSSE({ type: 'tool_call', name: tu.name, input: tu.input })

          // ── UI 카드 생성 대상 tool ──
          const UI_CARD_TOOLS = ['get_balance', 'get_transactions', 'analyze_spending', 'analyze_card_spending', 'get_card_transactions', 'complex_query', 'get_transfer_suggestion', 'get_monthly_story', 'get_savings_advice', 'compare_products', 'search_products', 'get_product_detail']

          const ctx = getSessionCtx(session)

          // ── resolve_contact candidates → 선택 카드 ──
          if (tu.name === 'resolve_contact') {
            const result = handleToolCall('resolve_contact', tu.input, ctx)
            toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(result) })
            if (result.status === 'candidates') {
              sendSSE({ type: 'ui_card', cardType: 'resolve_contact_candidates', data: result })
            }
            continue
          }

          // ── transfer 인터셉트 ──
          if (tu.name === 'transfer') {
            const { to_contact, amount, from_account_id = 'acc001', memo = '' } = tu.input

            // 실명으로 contacts(read-only) 검색, 없으면 세션 aliasStore에서 검색
            let contact = contacts.find((c) => c.realName === to_contact) || null
            if (!contact) {
              for (const [, v] of ctx.aliasStore) {
                if (v.realName === to_contact) { contact = v; break }
              }
            }

            const pendingData = {
              toolUseId: tu.id,
              to_contact,
              amount,
              from_account_id,
              memo,
              contactInfo: contact || null,
            }
            session.pendingTransfer = pendingData

            // WebSocket으로 프론트엔드에 확인 요청
            sendWsEvent(sessionId, {
              type: 'PENDING_TRANSFER',
              data: {
                to_contact,
                amount,
                amountFormatted: amount.toLocaleString('ko-KR') + '원',
                from_account_id,
                memo,
                contactInfo: contact,
                availableAccounts: session.accounts
                  .filter((a) => a.type === '입출금' || a.type === 'CMA')
                  .map((a) => ({
                    id: a.id,
                    name: a.name,
                    balance: a.balance,
                    balanceFormatted: a.balance.toLocaleString('ko-KR') + '원',
                  })),
              },
            })

            // Claude에게 "사용자 확인 대기 중" 메시지를 tool_result 로 전달
            toolResults.push({
              type: 'tool_result',
              tool_use_id: tu.id,
              content: JSON.stringify({
                status: 'pending_confirmation',
                message: `${to_contact}에게 ${amount.toLocaleString('ko-KR')}원 이체 확인을 사용자에게 요청했습니다. 사용자가 확인 버튼을 누르면 이체가 실행됩니다.`,
              }),
            })

            sendSSE({ type: 'transfer_pending', data: pendingData })
          } else {
            // 일반 tool 실행
            const result = handleToolCall(tu.name, tu.input, ctx)
            toolResults.push({
              type: 'tool_result',
              tool_use_id: tu.id,
              content: JSON.stringify(result),
            })
            // UI 카드 이벤트 전송
            if (UI_CARD_TOOLS.includes(tu.name)) {
              sendSSE({ type: 'ui_card', cardType: tu.name, data: result })
            }
          }
        }

        // tool_results 를 messages 에 추가 (guiScope 태깅)
        session.messages.push({ role: 'user', content: toolResults, _guiScope: guiScope })
      } else {
        // end_turn — 루프 종료
        continueLoop = false
      }
    }

    sendSSE({ type: 'done' })
    res.end()

    // 백그라운드 아카이빙 — 사용자 응답 후 비동기 처리
    archiveConversation({
      sessionId,
      userMessage: message,
      assistantText: archiveAssistantText,
      toolCalls: archiveToolCalls,
    }).catch(() => {})
  } catch (err) {
    console.error('Chat error:', err)
    sendSSE({ type: 'error', message: err.message })
    res.end()
  }
})

// ──────────────────────────────────────────────
// POST /api/confirm-transfer — 이체 확인
// ──────────────────────────────────────────────
app.post('/api/confirm-transfer', async (req, res) => {
  const { sessionId = 'default', confirmed, from_account_id: selectedAccountId } = req.body
  const session = getSession(sessionId)

  if (!session.pendingTransfer) {
    return res.status(400).json({ error: '대기 중인 이체가 없습니다.' })
  }

  const pending = session.pendingTransfer
  session.pendingTransfer = null

  if (!confirmed) {
    sendWsEvent(sessionId, { type: 'TRANSFER_CANCELLED' })
    return res.json({ success: false, cancelled: true, message: '이체가 취소되었습니다.' })
  }

  // 실제 이체 실행 (프론트에서 선택한 계좌 우선)
  const ctx = getSessionCtx(session)
  const result = executeTransfer({
    to_contact: pending.to_contact,
    amount: pending.amount,
    from_account_id: selectedAccountId || pending.from_account_id,
    memo: pending.memo,
  }, ctx)

  if (result.success) {
    sendWsEvent(sessionId, {
      type: 'TRANSFER_COMPLETE',
      data: result,
    })
    res.json({ success: true, result })
  } else {
    sendWsEvent(sessionId, { type: 'TRANSFER_FAILED', error: result.error })
    res.status(400).json({ success: false, error: result.error })
  }
})

// ──────────────────────────────────────────────
// GET /api/account/:id — 계좌 상세 (잔액 + 최근 거래)
// ──────────────────────────────────────────────
app.get('/api/account/:id', (req, res) => {
  const sessionId = req.query.sessionId || 'default'
  const session = getSession(sessionId)
  const ctx = getSessionCtx(session)

  const acc = ctx.accounts.find((a) => a.id === req.params.id)
  if (!acc) return res.status(404).json({ error: '계좌를 찾을 수 없습니다.' })

  const recentTransactions = ctx.transactions
    .filter((t) => t.accountId === acc.id)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)
    .map((t) => ({
      ...t,
      amountFormatted: (t.amount > 0 ? '+' : '') + t.amount.toLocaleString('ko-KR') + '원',
    }))

  res.json({ account: acc, recentTransactions })
})

// ──────────────────────────────────────────────
// POST /api/reset — 세션 초기화
// ──────────────────────────────────────────────
app.post('/api/reset', (req, res) => {
  const { sessionId = 'default' } = req.body
  sessions.delete(sessionId)
  res.json({ success: true })
})

// ──────────────────────────────────────────────
// GET /api/health-score — 금융 건강도 점수
// ──────────────────────────────────────────────
app.get('/api/health-score', (req, res) => {
  // 이번 달 거래 집계
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const monthTxs = transactions.filter((t) => {
    const d = new Date(t.date)
    return d.getFullYear() === year && d.getMonth() + 1 === month
  })
  const income = monthTxs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const expense = Math.abs(monthTxs.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0))
  const savingsRate = income > 0 ? (income - expense) / income : 0

  // 전체 자산 대비 부채 (단순화: 없으므로 0)
  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0)

  // 점수 계산 (0-100)
  let score = 50
  score += Math.min(30, Math.round(savingsRate * 60))     // 저축률 (최대 30점)
  score += totalBalance >= 5000000 ? 20 : Math.round(totalBalance / 5000000 * 20) // 자산 (최대 20점)
  score = Math.max(0, Math.min(100, score))

  res.json({ score, savingsRate: Math.round(savingsRate * 100), income, expense })
})

// ──────────────────────────────────────────────
// 서버 시작
// ──────────────────────────────────────────────
const PORT = process.env.PORT || 3001
httpServer.listen(PORT, () => {
  console.log(`✅ 서버 실행 중: http://localhost:${PORT}`)
})
