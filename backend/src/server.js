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
import { getProactiveAlert, getInitialAccounts, getInitialTransactions, createAccount, contacts } from './mockData.js'
import { PRODUCTS, getProductById } from './products.js'

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
  { accountId: 'acc001', counterpart: '국민건강보험공단', amount: -139230, category: '자동이체', memo: '건강보험료 자동이체' },
  { accountId: 'acc001', counterpart: '한국전력', amount: -52400, category: '자동이체', memo: '전기요금' },
  { accountId: 'acc001', counterpart: '(주)카카오뱅크', amount: 3000000, category: '이체', memo: '전세자금 입금' },
  { accountId: 'acc001', counterpart: '쿠팡', amount: -87900, category: '이체', memo: '쿠팡 결제' },
  { accountId: 'acc001', counterpart: '박재원', amount: 150000, category: '송금', memo: '' },
  { accountId: 'acc001', counterpart: 'LG유플러스', amount: -55000, category: '자동이체', memo: '통신요금' },
  { accountId: 'acc006', counterpart: '스타벅스', amount: -6500, category: '카페', memo: '아메리카노', source: 'card' },
  { accountId: 'acc006', counterpart: 'GS25', amount: -4200, category: '편의점', memo: '', source: 'card' },
  { accountId: 'acc006', counterpart: '올리브영', amount: -35800, category: '쇼핑', memo: '', source: 'card' },
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
  // 1. 모든 세션의 transactions에 추가 + 계좌 잔액 업데이트
  const today = new Date().toISOString().split('T')[0]
  for (const session of sessions.values()) {
    const acc = session.accounts.find((a) => a.id === tx.accountId)
    if (acc) {
      acc.balance += tx.amount
      session.transactions.unshift({
        id: 'bg_' + alertId,
        date: today,
        amount: tx.amount,
        category: tx.category,
        counterpart: tx.counterpart,
        accountId: tx.accountId,
        source: tx.source || 'account',
        memo: tx.memo || '',
      })
    }
  }

  // 2. 먼저 코멘트 없이 알림 전송
  broadcastWsEvent({ type: 'TRANSACTION_ALERT', data: alertData })

  // 2. TYPING_START — AI 코멘트 생성 시작 알림
  broadcastWsEvent({ type: 'TYPING_START', data: { accountId: tx.accountId } })

  // 3. Claude 비동기 코멘트 생성 (2500ms timeout)
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
  } finally {
    // 4. TYPING_END — 성공/실패 무관하게 항상 전송
    broadcastWsEvent({ type: 'TYPING_END', data: { accountId: tx.accountId } })
  }
}, 90000) // 90초마다 (1회/분 이하)

// ── 금융 모먼트 시뮬레이터 (급여, 카드대금 D-3) ──
// ── 적금 납입일 계산 ──
function getInstallmentReminders() {
  const now = new Date()
  const reminders = []
  const accounts = getInitialAccounts()
  for (const acc of accounts) {
    if (acc.type !== 'installment_savings' || !acc.openDate || !acc.monthlyDeposit) continue
    const paymentDay = new Date(acc.openDate).getDate()
    let next = new Date(now.getFullYear(), now.getMonth(), paymentDay)
    if (next <= now) next = new Date(now.getFullYear(), now.getMonth() + 1, paymentDay)
    const daysLeft = Math.ceil((next - now) / 86400000)
    reminders.push({
      momentType: 'installment_reminder',
      accountId: acc.id,
      title: `${acc.name} 납입일이 ${daysLeft}일 남았습니다`,
      amountFormatted: acc.monthlyDeposit.toLocaleString('ko-KR') + '원',
      description: `${next.getMonth() + 1}월 ${next.getDate()}일에 ${acc.monthlyDeposit.toLocaleString('ko-KR')}원이 자동 이체됩니다. 주계좌 잔액을 미리 확인해 두세요.`,
      daysLeft,
    })
  }
  return reminders
}

const FINANCIAL_MOMENTS = [
  {
    momentType: 'salary',
    title: '(주)ABC테크에서 급여가 입금되었습니다',
    amountFormatted: '3,000,000원',
    description: '3월 급여가 주계좌에 입금되었습니다.',
  },
  {
    momentType: 'card_due',
    title: 'iM 체크카드 결제일이 3일 남았습니다',
    amountFormatted: '485,000원',
    dueAmount: 485000,
    dueDate: '2026-04-15',
    description: '3월 카드 이용금액 485,000원이 4월 15일에 자동 결제됩니다.',
    daysLeft: 3,
  },
  ...getInstallmentReminders(),
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
      lastConfirmedTransferId: null,  // #7 멱등성: 마지막 처리된 이체 ID
      accounts: getInitialAccounts(),
      transactions: getInitialTransactions(),
      aliasStore: new Map([
        ['엄마', { realName: '김순자', bank: '농협은행', accountNo: '301-5678-9012-01', accountNoMasked: '****01' }],
        ['아빠', { realName: '김기준', bank: '하나은행', accountNo: '130-789-012345',   accountNoMasked: '****45' }],
      ]),
    })
  }
  return sessions.get(sessionId)
}

function getSessionCtx(session) {
  return { accounts: session.accounts, transactions: session.transactions, aliasStore: session.aliasStore }
}

// ── 타 계좌 크로스 컨텍스트 빌더 (acc001/acc008/card001 간) ──
function getCrossAccountSummary(session, currentAccountId) {
  const TARGET_IDS = ['acc001', 'acc008', 'card001']
  const others = session.accounts.filter(
    (a) => TARGET_IDS.includes(a.id) && a.id !== currentAccountId
  )
  if (others.length === 0) return ''
  const LABELS = { acc001: '주계좌', acc008: '급여계좌', card001: '체크카드' }
  const lines = ['', '[OTHER_ACCOUNTS]']
  for (const acc of others) {
    const label = LABELS[acc.id] || acc.name
    const recentTxs = session.transactions
      .filter((t) => t.accountId === acc.id)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 3)
      .map((t) => `${t.counterpart} ${(t.amount > 0 ? '+' : '') + t.amount.toLocaleString('ko-KR')}원`)
      .join(', ')
    lines.push(`${label}(${acc.id}): 잔액 ${acc.balance.toLocaleString('ko-KR')}원${recentTxs ? `, 최근거래: ${recentTxs}` : ''}`)
  }
  lines.push('[/OTHER_ACCOUNTS]')
  lines.push('위 OTHER_ACCOUNTS는 같은 고객의 다른 계좌 현황입니다. 사용자가 "다른 계좌", "주계좌", "급여계좌", "체크카드" 등을 언급하면 이 정보를 참고하세요.')
  return lines.join('\n')
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
// 계좌 타입별 대화 제약 컨텍스트
// AI가 계좌 성격에 맞게 이체/해지 등 요청을 처리하도록 제약을 주입
// ──────────────────────────────────────────────
const ACCOUNT_TYPE_CONTEXTS = {
  checking: {
    constraints: [
      '이 계좌는 자유입출금 통장입니다. 이체 출금·입금 모두 가능합니다.',
      '잔액 조회, 거래내역, 지출 분석, 이체 실행 모두 지원합니다.',
    ],
  },
  installment_savings: {
    constraints: [
      '이 계좌는 정기적금입니다. 외부 입금(이체받기)은 불가능합니다—납입은 자동이체로만 이루어집니다.',
      '만기 전 중도해지 없이는 잔액 인출 및 이체 출금이 불가능합니다.',
      '사용자가 이 계좌를 이체 대상(받는 계좌)으로 지정하거나 이 계좌로 송금하려 하면, 정기적금은 이체 대상이 될 수 없음을 안내하세요.',
      '중도해지 시 약정이율 대신 중도해지이율(대폭 낮음)이 적용됩니다. 해지 요청 시 반드시 예상 손실액을 먼저 계산해 안내한 뒤 의향을 확인하세요.',
    ],
  },
  term_deposit: {
    constraints: [
      '이 계좌는 정기예금입니다. 만기 전에는 원금 인출 및 이체 출금이 불가능합니다.',
      '이 계좌로의 외부 이체 입금도 불가능합니다.',
      '중도해지 시 약정이율보다 크게 낮은 중도해지이율이 적용됩니다. 해지 요청 시 예상 손실액을 먼저 안내하고 재확인을 받으세요.',
      '만기 임박 시 재예치 여부 및 만기 후 자금 활용 방안을 먼저 제안하세요.',
    ],
  },
  savings: {
    constraints: [
      '이 계좌는 비상금 통장(자유입출금 저축)으로 입출금 모두 가능합니다.',
      '비상금 목적의 계좌임을 고려해 큰 금액 인출 시 한번 확인을 권고하세요.',
    ],
  },
  cma: {
    constraints: [
      'CMA 계좌로 입출금이 자유롭고 일별 이자(MMF 운용 수익)가 자동 반영됩니다.',
      '이체 출금·입금 모두 가능합니다.',
      '수익률·누적 이자 안내 시 정확한 수치를 제공하세요.',
    ],
  },
  debit_card: {
    constraints: [
      '이것은 체크카드입니다. 카드로 이체를 받거나 보내는 것은 불가능합니다.',
      '이체가 필요하면 연결된 입출금 계좌를 사용하도록 안내하세요.',
      '카드 사용 내역 조회와 지출 분석에 집중하세요.',
    ],
  },
  credit_card: {
    constraints: [
      '이것은 아직 발급받지 않은 신용카드 상품 안내 화면입니다.',
      '이 화면에서 이체나 계좌 잔액 조회는 불가능합니다.',
      '신용카드 혜택, 발급 조건, 연회비, 포인트 적립 등 상품 안내에 집중하세요.',
    ],
  },
}

// ──────────────────────────────────────────────
// CURRENT_VIEW 동적 System Prompt 빌더 (Model C)
// GUI 상태를 System Prompt에 주입해 AI가 "지금 화면이 어딘지" 항상 인식하게 함
// ──────────────────────────────────────────────
function buildSystemPrompt(guiContext, session) {
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

  // 계좌 타입별 제약 주입
  if (guiContext.accountType && ACCOUNT_TYPE_CONTEXTS[guiContext.accountType]) {
    const typeCtx = ACCOUNT_TYPE_CONTEXTS[guiContext.accountType]
    lines.push('')
    lines.push('[ACCOUNT_CONSTRAINTS]')
    typeCtx.constraints.forEach((c) => lines.push(`- ${c}`))
    lines.push('[/ACCOUNT_CONSTRAINTS]')
    lines.push('위 ACCOUNT_CONSTRAINTS는 이 계좌 대화방에서 반드시 지켜야 할 제약입니다. 사용자 요청이 제약에 위배되면 친절하게 이유를 설명하고 가능한 대안을 제시하세요.')
  }

  // 타 계좌 크로스 컨텍스트 (acc001/acc008/card001)
  if (session && guiContext?.accountId) {
    const crossCtx = getCrossAccountSummary(session, guiContext.accountId)
    if (crossCtx) lines.push(crossCtx)
  }

  // accountId 기반 AI 개성 주입
  const ACCOUNT_PERSONALITIES = {
    acc001: '당신은 주계좌(입출금) 전담 AI입니다. 실용적이고 직설적으로 소통하세요.',
    acc008: '당신은 급여계좌 전담 AI입니다. 이 고객의 급여 입금과 지출 패턴을 격려하며 소통하세요.',
    card001: '당신은 체크카드 전담 AI입니다. 지출 절약과 스마트 소비를 중심으로 소통하세요.',
  }
  if (guiContext?.accountId && ACCOUNT_PERSONALITIES[guiContext.accountId]) {
    lines.push('')
    lines.push('[ACCOUNT_PERSONALITY]')
    lines.push(ACCOUNT_PERSONALITIES[guiContext.accountId])
    lines.push('[/ACCOUNT_PERSONALITY]')
  }

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

// POST /api/rebuild-context — 페이지 리로드 후 서버 세션 컨텍스트 복원
// ──────────────────────────────────────────────
app.post('/api/rebuild-context', (req, res) => {
  const { sessionId, messages } = req.body
  if (!sessionId || !Array.isArray(messages)) return res.json({ ok: false })
  const session = getSession(sessionId)
  if (session.messages.length === 0) {
    session.messages = messages.filter((m) => m.role && m.content).slice(-20)
  }
  res.json({ ok: true, rebuilt: session.messages.length })
})

// ──────────────────────────────────────────────
// POST /api/enroll — 상품 가입 확정
// ──────────────────────────────────────────────
app.post('/api/enroll', (req, res) => {
  const { sessionId = 'default', productId, enrollData = {} } = req.body
  if (!productId) return res.status(400).json({ ok: false, error: 'productId required' })

  const session = getSession(sessionId)

  // 프로모 계좌 확인 (미가입 상품만 가입 가능)
  const promoAcc = session.accounts.find((a) => a.id === productId && a.isPromo)
  if (!promoAcc) {
    return res.status(409).json({ ok: false, error: '이미 가입되었거나 존재하지 않는 상품입니다.' })
  }

  // 신용카드: 신청 접수 처리 (실계좌 생성 없음)
  if (promoAcc.type === 'credit_card') {
    session.accounts = session.accounts.filter((a) => a.id !== productId)
    const appliedCard = { ...promoAcc, isPromo: false, status: 'pending_approval', applicationDate: new Date().toISOString().slice(0, 10) }
    session.accounts.push(appliedCard)
    return res.json({ ok: true, account: appliedCard })
  }

  // 신규 계좌 생성
  const newAccount = createAccount(productId, enrollData)
  if (!newAccount) return res.status(400).json({ ok: false, error: '지원하지 않는 상품입니다.' })

  // 입금 처리 (amount > 0인 경우)
  const amount = Number(enrollData.amount) || 0
  if (amount > 0 && enrollData.fromAccountId) {
    const fromAcc = session.accounts.find((a) => a.id === enrollData.fromAccountId)
    if (!fromAcc) {
      return res.status(400).json({ ok: false, error: '출금 계좌를 찾을 수 없습니다.' })
    }
    if (fromAcc.balance < amount) {
      return res.status(400).json({ ok: false, error: '잔액이 부족합니다.' })
    }
    fromAcc.balance -= amount
    newAccount.balance = amount

    // 거래내역 기록
    const txId = 'tx_enroll_' + Date.now()
    session.transactions.unshift({
      id: txId,
      date: new Date().toISOString().slice(0, 10),
      amount: -amount,
      category: '이체',
      counterpart: newAccount.name,
      accountId: enrollData.fromAccountId,
      source: 'account',
    })
    session.transactions.unshift({
      id: txId + '_in',
      date: new Date().toISOString().slice(0, 10),
      amount: amount,
      category: '입금',
      counterpart: fromAcc.name,
      accountId: newAccount.id,
      source: 'account',
    })
  }

  // 프로모 계좌 제거 + 신규 계좌 추가
  session.accounts = session.accounts.filter((a) => a.id !== productId)
  session.accounts.push(newAccount)

  res.json({ ok: true, account: newAccount })
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
        system: buildSystemPrompt(guiContext, session),
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
                  .filter((a) => a.type === 'checking' || a.type === 'cma')
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
  const { sessionId = 'default', confirmed, from_account_id: selectedAccountId, amount: overrideAmount } = req.body
  const session = getSession(sessionId)

  if (!session.pendingTransfer) {
    // #7 멱등성: 이미 처리된 이체에 재시도가 온 경우
    if (confirmed && session.lastConfirmedTransferId) {
      return res.status(409).json({ error: '이미 처리된 이체입니다.', idempotent: true })
    }
    return res.status(400).json({ error: '대기 중인 이체가 없습니다.' })
  }

  const pending = session.pendingTransfer
  const transferId = pending.toolUseId || ('tr_' + Date.now())
  session.pendingTransfer = null

  if (!confirmed) {
    sendWsEvent(sessionId, { type: 'TRANSFER_CANCELLED' })
    return res.json({ success: false, cancelled: true, message: '이체가 취소되었습니다.' })
  }

  // 실제 이체 실행 (프론트에서 입력한 금액/계좌 우선)
  const finalAmount = (overrideAmount && overrideAmount > 0) ? overrideAmount : pending.amount
  if (!finalAmount || finalAmount <= 0) {
    return res.status(400).json({ success: false, error: '이체 금액을 입력해 주세요.' })
  }
  const ctx = getSessionCtx(session)
  const result = executeTransfer({
    to_contact: pending.to_contact,
    amount: finalAmount,
    from_account_id: selectedAccountId || pending.from_account_id,
    memo: pending.memo,
  }, ctx)

  if (result.success) {
    session.lastConfirmedTransferId = transferId  // #7 멱등성 마킹
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
// GET /api/accounts — 계좌 목록 + 마지막 거래 preview
// ──────────────────────────────────────────────
app.get('/api/accounts', (req, res) => {
  const sessionId = req.query.sessionId || 'default'
  const session = getSession(sessionId)
  const ctx = getSessionCtx(session)

  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)

  const enrichedAccounts = ctx.accounts.map((acc) => {
    if ((acc.type === 'debit_card' || acc.type === 'credit_card') && acc.linkedAccountId) {
      const linked = ctx.accounts.find((a) => a.id === acc.linkedAccountId)
      return { ...acc, linkedAccountName: linked ? linked.name : null }
    }
    return acc
  })

  const result = enrichedAccounts.map((acc) => {
    const lastTx = ctx.transactions
      .filter((t) => t.accountId === acc.id)
      .sort((a, b) => b.date.localeCompare(a.date))[0] || null

    // debit_card: balance = 이번달 사용 금액 (절댓값)
    let displayBalance = acc.balance
    let balanceFormatted
    if (acc.type === 'debit_card') {
      displayBalance = Math.abs(ctx.transactions
        .filter((t) => t.accountId === acc.id && t.date >= thisMonthStart && t.amount < 0)
        .reduce((sum, t) => sum + t.amount, 0))
      balanceFormatted = `이번달 ${displayBalance.toLocaleString('ko-KR')}원 사용`
    } else if (acc.isPromo) {
      displayBalance = 0
      balanceFormatted = '발급 가능'
    } else {
      balanceFormatted = acc.balance.toLocaleString('ko-KR') + '원'
    }

    // 예금/적금/CMA: 만기 진행률 + 상품별 상세 지표
    let maturityInfo = null
    if (acc.type === 'cma' && acc.openDate) {
      // CMA: maturityDate 없음 — openDate 기준 경과일만 사용
      const start = new Date(acc.openDate).getTime()
      const elapsedMs = Math.max(0, now.getTime() - start)
      const elapsedDays = Math.ceil(elapsedMs / 86400000)
      const dailyRate = (acc.interestRate || 0) / 100 / 365
      const todayInterest = Math.round(acc.balance * dailyRate)
      const accruedInterest = Math.round(acc.balance * dailyRate * elapsedDays)
      maturityInfo = { progressRatio: 0, daysRemaining: 0, elapsedDays, totalDays: elapsedDays, accruedInterest, todayInterest }
    } else if (acc.openDate && acc.maturityDate) {
      const start = new Date(acc.openDate).getTime()
      const end = new Date(acc.maturityDate).getTime()
      const nowMs = now.getTime()
      const totalMs = end - start
      const elapsedMs = Math.max(0, Math.min(nowMs - start, totalMs))
      const progressRatio = Math.max(0, Math.min(1, elapsedMs / totalMs))
      const daysRemaining = Math.max(0, Math.ceil((end - nowMs) / 86400000))
      const elapsedDays = Math.ceil(elapsedMs / 86400000)
      const totalDays = Math.ceil(totalMs / 86400000)

      if (acc.type === 'term_deposit') {
        // 예금: 단리, 만기 이자 = 원금 × 금리
        const expectedInterest = Math.round(acc.balance * (acc.interestRate / 100))
        const accruedInterest = Math.round(expectedInterest * (elapsedDays / totalDays))
        const finalAmount = acc.balance + expectedInterest
        // 중도해지: 중도해지 이율 0.5% 적용
        const earlyRate = 0.5
        const earlyInterest = Math.round(acc.balance * (earlyRate / 100) * (elapsedDays / 365))
        const earlyWithdrawalLoss = accruedInterest - earlyInterest
        maturityInfo = {
          progressRatio, daysRemaining, elapsedDays, totalDays,
          accruedInterest, expectedInterest, finalAmount,
          earlyInterest, earlyWithdrawalLoss,
        }
      } else if (acc.type === 'installment_savings') {
        // 적금: 납입 횟수 기반
        const totalMonths = Math.round(totalMs / (30.4375 * 86400000))
        const paymentsMade = Math.min(totalMonths, Math.floor(elapsedMs / (30.4375 * 86400000)))
        const paymentsRemaining = Math.max(0, totalMonths - paymentsMade)
        const monthlyDeposit = acc.monthlyDeposit || 0
        const monthlyRate = (acc.interestRate || 0) / 100 / 12
        const expectedInterest = Math.round(monthlyDeposit * monthlyRate * totalMonths * (totalMonths - 1) / 2)
        const finalAmount = totalMonths * monthlyDeposit + expectedInterest
        const accruedInterest = Math.round(monthlyDeposit * monthlyRate * paymentsMade * (paymentsMade - 1) / 2)
        const principalAtMaturity = totalMonths * monthlyDeposit
        // 중도해지: 중도해지 이율 0.5%
        const earlyRate = 0.5
        const currentPrincipal = paymentsMade * monthlyDeposit
        const earlyInterest = Math.round(currentPrincipal * (earlyRate / 100) * (elapsedDays / 365))
        const earlyWithdrawalLoss = accruedInterest - earlyInterest
        maturityInfo = {
          progressRatio, daysRemaining, elapsedDays, totalDays,
          accruedInterest, expectedInterest, finalAmount,
          totalPayments: totalMonths, paymentsMade, paymentsRemaining,
          principalAtMaturity, earlyInterest, earlyWithdrawalLoss,
        }
      }
    }

    return {
      ...acc,
      balance: displayBalance,
      balanceFormatted,
      ...(maturityInfo || {}),
      lastTransaction: lastTx
        ? {
            counterpart: lastTx.counterpart,
            amount: lastTx.amount,
            amountFormatted: (lastTx.amount > 0 ? '+' : '') + Math.abs(lastTx.amount).toLocaleString('ko-KR') + '원',
            date: lastTx.date,
            isIncome: lastTx.amount > 0,
          }
        : null,
    }
  })
  res.json({ accounts: result })
})

// ──────────────────────────────────────────────
// GET /api/account/:id — 계좌 상세 (잔액 + 거래 페이지네이션)
// query: page (1-based, default 1), limit (default 20)
// ──────────────────────────────────────────────
app.get('/api/account/:id', async (req, res) => {
  const sessionId = req.query.sessionId || 'default'
  const session = getSession(sessionId)
  const ctx = getSessionCtx(session)

  const acc = ctx.accounts.find((a) => a.id === req.params.id)
  if (!acc) return res.status(404).json({ error: '계좌를 찾을 수 없습니다.' })

  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20))
  const offset = (page - 1) * limit

  // credit_card 계좌: cardTransactions(card002) 반환
  if (acc.type === 'credit_card') {
    const { cardTransactions } = await import('./mockData.js')
    const cardId = 'card002'
    const ctAll = cardTransactions
      .filter((ct) => ct.cardId === cardId)
      .sort((a, b) => b.date.localeCompare(a.date))

    const slice = ctAll.slice(offset, offset + limit)
    const txs = slice.map((ct) => ({
      id: ct.id,
      date: ct.date,
      amount: ct.amount,
      amountFormatted: (ct.amount > 0 ? '+' : '') + Math.abs(ct.amount).toLocaleString('ko-KR') + '원',
      category: ct.inferredCategory,
      counterpart: ct.merchant,
      accountId: acc.id,
      memo: ct.categoryNote || '',
      source: 'card',
    }))

    return res.json({
      account: acc,
      recentTransactions: txs,
      pagination: { page, limit, total: ctAll.length, hasMore: offset + limit < ctAll.length },
    })
  }

  const allTxs = ctx.transactions
    .filter((t) => t.accountId === acc.id)
    .sort((a, b) => b.date.localeCompare(a.date))

  const total = allTxs.length
  const recentTransactions = allTxs
    .slice(offset, offset + limit)
    .map((t) => ({
      ...t,
      amountFormatted: (t.amount > 0 ? '+' : '') + t.amount.toLocaleString('ko-KR') + '원',
    }))

  res.json({
    account: acc,
    recentTransactions,
    pagination: { page, limit, total, hasMore: offset + limit < total },
  })
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
  const sessionId = req.query.sessionId || 'default'
  const session = getSession(sessionId)
  const ctx = getSessionCtx(session)

  // 이번 달 거래 집계
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const monthTxs = ctx.transactions.filter((t) => {
    const d = new Date(t.date)
    return d.getFullYear() === year && d.getMonth() + 1 === month
  })
  const income = monthTxs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const expense = Math.abs(monthTxs.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0))
  const savingsRate = income > 0 ? (income - expense) / income : 0

  // 전체 자산 대비 부채 (단순화: 없으므로 0)
  const totalBalance = ctx.accounts.reduce((s, a) => s + a.balance, 0)

  // 점수 계산 (0-100)
  let score = 50
  score += Math.min(30, Math.round(savingsRate * 60))     // 저축률 (최대 30점)
  score += totalBalance >= 5000000 ? 20 : Math.round(totalBalance / 5000000 * 20) // 자산 (최대 20점)
  score = Math.max(0, Math.min(100, score))

  res.json({ score, savingsRate: Math.round(savingsRate * 100), income, expense })
})

// ──────────────────────────────────────────────
// 상품 방 — 개인화 피치 데이터 빌더
// ──────────────────────────────────────────────
function buildProductPitchData(acc, ctx) {
  const allProducts = [
    ...(PRODUCTS.deposit || []),
    ...(PRODUCTS.investment || []),
  ]
  const product = allProducts.find((p) => p.id === acc.promoProductId) || null

  const checkingAcc = ctx.accounts.find((a) => a.type === 'checking' && !a.isPromo)
  const installAcc  = ctx.accounts.find((a) => a.type === 'installment_savings' && !a.isPromo)

  let personal = { baseAmount: 0, annualGain: 0, dailyGain: null, label: '' }
  let compareCurrentRate = 0.1
  let compareCurrentLabel = '현재 입출금'

  if (acc.type === 'cma') {
    const base = checkingAcc?.balance || 1000000
    personal = {
      baseAmount: base,
      dailyGain: Math.round(base * 0.0475 / 365),
      annualGain: Math.round(base * 0.0475),
      label: '주계좌 잔액 기준',
    }
    compareCurrentRate = 0.1
    compareCurrentLabel = '현재 입출금 (0.1%)'
  } else if (acc.type === 'term_deposit') {
    if (installAcc && installAcc.maturityDate) {
      const daysLeft = Math.max(0, Math.ceil((new Date(installAcc.maturityDate) - new Date()) / 86400000))
      const projected = installAcc.balance + (installAcc.monthlyDeposit || 0) * Math.ceil(daysLeft / 30)
      personal = {
        baseAmount: projected,
        annualGain: Math.round(projected * (product?.baseRate || 3.2) / 100),
        dailyGain: null,
        label: '적금 만기 수령 예상액 기준',
      }
    } else {
      personal = { baseAmount: 10000000, annualGain: Math.round(10000000 * (product?.baseRate || 3.2) / 100), dailyGain: null, label: '1,000만원 기준' }
    }
    compareCurrentRate = 0.1
    compareCurrentLabel = '입출금 보관 (0.1%)'
  } else if (acc.type === 'savings') {
    personal = {
      baseAmount: 3000000,
      annualGain: Math.round(3000000 * (product?.baseRate || 2.5) / 100),
      dailyGain: null,
      label: '3개월 생활비 기준 권장액',
    }
    compareCurrentRate = 0.1
    compareCurrentLabel = '입출금 보관 (0.1%)'
  }

  // 신용카드는 별도 데이터 구조
  if (acc.type === 'credit_card') {
    const ccProducts = PRODUCTS.credit_card || []
    const ccProduct = ccProducts.find((p) => p.id === acc.promoProductId) || ccProducts[0]
    return {
      productId: acc.id,
      product: {
        id: ccProduct?.id,
        name: ccProduct?.name || acc.name,
        type: 'credit_card',
        annualFee: ccProduct?.annualFee ?? 0,
        benefits: ccProduct?.benefits || [],
        highlights: (ccProduct?.highlights || []).slice(0, 4),
        conditions: ccProduct?.conditions || '',
        tags: (ccProduct?.tags || []).slice(0, 4),
      },
    }
  }

  const productRate = product?.baseRate || 3.0
  return {
    productId: acc.id,
    product: {
      id: product?.id,
      name: product?.name || acc.name,
      type: acc.type,
      interestRate: productRate,
      highlights: (product?.highlights || []).slice(0, 3),
      earlyWithdrawal: product?.earlyWithdrawal || '',
    },
    personal,
    compare: {
      current: {
        label: compareCurrentLabel,
        rate: compareCurrentRate,
        annualGain: Math.round(personal.baseAmount * compareCurrentRate / 100),
      },
      withProduct: {
        label: product?.name || acc.name,
        rate: productRate,
        annualGain: personal.annualGain,
      },
    },
  }
}

// ──────────────────────────────────────────────
// POST /api/room-greeting — 계좌방 첫 입장 AI 인사말 (SSE)
// ──────────────────────────────────────────────
const ROOM_GREETING_PROMPTS = {
  checking:            '입출금 계좌 담당 AI로서 오늘의 입출금 현황과 관련해 사용자에게 먼저 말을 걸어라. 1-2문장. 이모지 금지. 격식체(~입니다, ~까?).',
  installment_savings: '정기적금 계좌 담당 AI로서 적금 목표 달성과 관련해 격려하며 말을 걸어라. 1-2문장. 이모지 금지. 격식체.',
  term_deposit:        '정기예금 계좌 담당 AI로서 예금 만기/금리 관련해 신중하게 말을 걸어라. 1-2문장. 이모지 금지. 격식체.',
  savings:             '비상금 계좌 담당 AI로서 비상금 현황과 관련해 안심시키며 말을 걸어라. 1-2문장. 이모지 금지. 격식체.',
  cma:                 'CMA 계좌 담당 AI로서 수익률/운용 현황과 관련해 분석적으로 말을 걸어라. 1-2문장. 이모지 금지. 격식체.',
  debit_card:          '체크카드 AI 도우미로서, 이번달 카드 지출 현황을 간략히 언급하고, 현재 주계좌가 결제 계좌로 연결되어 있음을 자연스럽게 안내하라. 결제 계좌 변경이 필요할 경우 AI에게 말하면 된다고 유도하라. 2-3문장. 격식체. 이모지 금지.',
  credit_card:         'iM 신용카드 AI 도우미로서, 이번달 신용카드 사용 내역을 간략히 언급하고 캐시백·할인 혜택 현황을 친근하게 안내하라. 2-3문장. 격식체. 이모지 금지.',
  promo_cma:          (bal) => `고객 주계좌 잔액이 ${bal}원입니다. CMA 안내 AI로서, 이 금액이 입출금에 방치될 때의 기회비용을 먼저 언급하고 CMA의 매일 이자 장점을 2문장 이내로 설명하라. 이모지 금지. 격식체.`,
  promo_term_deposit: (days, amt) => `고객 적금이 ${days}일 후 만기 예정이며 수령 예상액은 ${amt}원입니다. 정기예금 AI로서, 이 목돈을 정기예금에 넣으면 얼마나 더 불릴 수 있는지 2문장 이내로 안내하라. 이모지 금지. 격식체.`,
  promo_savings:      () => `비상금 통장 안내 AI로서, 예기치 못한 지출에 대비하는 비상금의 심리적 안도감을 먼저 공감하며 2문장 이내로 말을 걸어라. 이모지 금지. 격식체.`,
}

app.post('/api/room-greeting', async (req, res) => {
  const { sessionId = 'default', accountId } = req.body
  const session = getSession(sessionId)
  const ctx = getSessionCtx(session)

  const acc = ctx.accounts.find((a) => a.id === accountId)
  if (!acc) return res.status(404).json({ error: '계좌를 찾을 수 없습니다.' })

  let prompt
  let context

  if (acc.isPromo) {
    // 프로모 계좌: 상품 안내 전용 프롬프트
    const checkingAcc = ctx.accounts.find((a) => a.type === 'checking' && !a.isPromo)
    const installAcc  = ctx.accounts.find((a) => a.type === 'installment_savings' && !a.isPromo)

    if (acc.type === 'cma') {
      const bal = (checkingAcc?.balance || 0).toLocaleString('ko-KR')
      prompt = ROOM_GREETING_PROMPTS.promo_cma(bal)
      context = 'CMA 상품 안내'
    } else if (acc.type === 'term_deposit') {
      const daysLeft = installAcc?.maturityDate
        ? Math.max(0, Math.ceil((new Date(installAcc.maturityDate) - new Date()) / 86400000))
        : 0
      const projected = installAcc
        ? (installAcc.balance + (installAcc.monthlyDeposit || 0) * Math.ceil(daysLeft / 30)).toLocaleString('ko-KR')
        : '0'
      prompt = ROOM_GREETING_PROMPTS.promo_term_deposit(daysLeft, projected)
      context = '정기예금 상품 안내'
    } else if (acc.type === 'savings') {
      prompt = ROOM_GREETING_PROMPTS.promo_savings()
      context = '비상금통장 상품 안내'
    } else {
      // credit_card 등 기존 isPromo
      prompt = ROOM_GREETING_PROMPTS.credit_card
      context = `계좌명: ${acc.name}`
    }
  } else {
    // 기존 보유 계좌 로직 — 변경 없음
    const recentTxs = ctx.transactions
      .filter((t) => t.accountId === acc.id)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 3)
      .map((t) => `${t.counterpart} ${(t.amount > 0 ? '+' : '') + t.amount.toLocaleString('ko-KR')}원`)
      .join(', ')

    prompt = ROOM_GREETING_PROMPTS[acc.type] || ROOM_GREETING_PROMPTS.checking
    context = `계좌명: ${acc.name}, 잔액: ${acc.balance.toLocaleString('ko-KR')}원${recentTxs ? `, 최근 거래: ${recentTxs}` : ''}`

    // 만기 임박 로직 (기존 그대로)
    if (acc.maturityDate && (acc.type === 'installment_savings' || acc.type === 'term_deposit')) {
      const greetNow = new Date()
      const daysLeft = Math.max(0, Math.ceil((new Date(acc.maturityDate) - greetNow) / 86400000))
      if (daysLeft <= 30 && daysLeft > 0) {
        const typeLabel = acc.type === 'installment_savings' ? '정기적금' : '정기예금'
        prompt = `${typeLabel}이 ${daysLeft}일 후 만기됩니다. 만기 수령금 활용 방안(재예치·운용·목돈 계획)에 대해 AI 매니저로서 먼저 물어보며 조언을 제안하라. 2문장 이내. 이모지 금지. 격식체.`
        context += `, 만기까지: ${daysLeft}일`
      }
    }

    // accountId 기반 프롬프트 오버라이드 (acc001/acc008/card001 개성)
    const ID_PROMPTS = {
      acc001: '주계좌(입출금) 전담 AI로서, 실용적이고 직설적으로 오늘의 입출금 현황과 잔액을 1-2문장으로 말을 걸어라. 이모지 금지. 격식체(~입니다, ~까?).',
      acc008: '급여계좌 전담 AI로서, 이번달 급여 입금 현황과 지출 패턴을 격려하며 1-2문장으로 말을 걸어라. 이모지 금지. 격식체.',
      card001: '체크카드 전담 AI로서, 이번달 카드 지출 패턴에서 절약 가능한 포인트를 1-2문장으로 짚어주며 말을 걸어라. 이모지 금지. 격식체.',
    }
    if (ID_PROMPTS[acc.id]) prompt = ID_PROMPTS[acc.id]

    // 입출금 계좌 월간 리포트 (기존 그대로)
    if (acc.type === 'checking') {
      const dayOfMonth = new Date().getDate()
      const txNow = ctx.transactions.filter((t) => t.accountId === acc.id)
      if (dayOfMonth <= 5) {
        const prev = new Date(); prev.setMonth(prev.getMonth() - 1)
        const prevStart = new Date(prev.getFullYear(), prev.getMonth(), 1).toISOString().slice(0, 10)
        const prevEnd = new Date(prev.getFullYear(), prev.getMonth() + 1, 0).toISOString().slice(0, 10)
        const prevTxs = txNow.filter((t) => t.date >= prevStart && t.date <= prevEnd)
        const income = prevTxs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0)
        const expense = Math.abs(prevTxs.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0))
        const net = income - expense
        context += `, 지난달 입금 ${income.toLocaleString('ko-KR')}원, 지출 ${expense.toLocaleString('ko-KR')}원, 순저축 ${net.toLocaleString('ko-KR')}원`
        prompt = '새 달이 시작됐습니다. 지난 달 재정 요약(입금·지출·순저축)을 바탕으로 이번 달을 응원하며 간결하게 리포트하라. 2문장. 이모지 금지. 격식체.'
      } else if (dayOfMonth >= 25) {
        const thisStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
        const thisTxs = txNow.filter((t) => t.date >= thisStart)
        const thisExpense = Math.abs(thisTxs.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0))
        context += `, 이번달 지출 ${thisExpense.toLocaleString('ko-KR')}원`
        prompt = '월말이 다가옵니다. 이번 달 지출 현황과 잔액을 언급하며 월말 재정 정리를 돕겠다고 먼저 말을 걸어라. 2문장. 이모지 금지. 격식체.'
      }
    }
  }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  try {
    const stream = anthropic.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 250,
      messages: [{ role: 'user', content: `${context}\n\n${prompt}` }],
    })

    let fullText = ''
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        fullText += event.delta.text
        res.write(`data: ${JSON.stringify({ type: 'text', delta: event.delta.text })}\n\n`)
      }
    }

    // 인사말을 session.messages에 저장 → 이후 "응" 같은 짧은 답변에도 맥락 유지
    if (fullText) {
      session.messages.push({ role: 'assistant', content: fullText })
    }

    // 프로모 계좌이면 product_pitch 카드 추가 발송
    if (acc.isPromo) {
      const pitchData = buildProductPitchData(acc, ctx)
      res.write(`data: ${JSON.stringify({ type: 'ui_card', cardType: 'product_pitch', data: pitchData })}\n\n`)
    }

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
  } catch {
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
  } finally {
    res.end()
  }
})

// ──────────────────────────────────────────────
// GET /api/contacts — 연락처 목록 반환
// ──────────────────────────────────────────────
app.get('/api/contacts', (req, res) => {
  res.json(contacts)
})

// ──────────────────────────────────────────────
// POST /api/quick-transfer — 패널 즉시 이체 개시
// WebSocket 미발송: 프론트가 응답 데이터로 직접 말풍선+TransferCard 주입
// ──────────────────────────────────────────────
app.post('/api/quick-transfer', (req, res) => {
  const { sessionId = 'default', contactId, amount } = req.body

  if (!contactId) {
    return res.status(400).json({ error: 'contactId가 필요합니다.' })
  }

  const contact = contacts.find((c) => c.id === contactId)
  if (!contact) {
    return res.status(404).json({ error: '연락처를 찾을 수 없습니다.' })
  }

  const session = getSession(sessionId)
  const checkingAcc = session.accounts.find((a) => a.type === 'checking')
  if (!checkingAcc) {
    return res.status(400).json({ error: '입출금 계좌가 없습니다.' })
  }

  const safeAmount = Number(amount) || 0

  const pendingData = {
    toolUseId: 'quick_' + Date.now(),
    to_contact: contact.realName,
    amount: safeAmount,
    from_account_id: checkingAcc.id,
    memo: '',
    contactInfo: contact,
  }
  session.pendingTransfer = pendingData

  const amountFmt = safeAmount > 0 ? safeAmount.toLocaleString('ko-KR') + '원' : null
  const userText = amountFmt
    ? `${contact.realName}에게 ${amountFmt} 보내줘`
    : `${contact.realName}에게 송금해줘`
  const aiText = amountFmt
    ? `${contact.realName}님께 ${amountFmt} 이체하겠습니다.`
    : `${contact.realName}님께 송금하겠습니다. 금액을 확인해 주세요.`

  res.json({
    userText,
    aiText,
    pendingTransfer: {
      to_contact: contact.realName,
      amount: safeAmount,
      amountFormatted: amountFmt,
      from_account_id: checkingAcc.id,
      memo: '',
      contactInfo: contact,
      availableAccounts: session.accounts
        .filter((a) => a.type === 'checking' || a.type === 'cma')
        .map((a) => ({
          id: a.id,
          name: a.name,
          balance: a.balance,
          balanceFormatted: a.balance.toLocaleString('ko-KR') + '원',
        })),
      balance: checkingAcc.balance,
    },
  })
})

// ──────────────────────────────────────────────
// POST /api/demo-start — 임원 데모 시퀀스 트리거 (하드코딩된 이벤트, Claude 호출 없음)
// ──────────────────────────────────────────────
const DEMO_SEQUENCE = [
  { delay: 500,  type: 'TRANSACTION_ALERT',         accountId: 'acc001', payload: { accountId: 'acc001', alertId: 'demo_001', counterpart: '(주)ABC테크', amount: 3000000, amountFormatted: '+3,000,000원', category: '급여', memo: '3월 급여', isIncome: true } },
  { delay: 1200, type: 'TYPING_START',               accountId: 'acc001' },
  { delay: 3200, type: 'TYPING_END',                 accountId: 'acc001' },
  { delay: 3300, type: 'TRANSACTION_ALERT_COMMENT',  accountId: 'acc001', payload: { alertId: 'demo_001', comment: '3월 급여 3,000,000원이 입금되었습니다. 이번 달 지출 계획을 세워보시겠습니까?' } },
  { delay: 5500, type: 'TYPING_START',               accountId: 'card001' },
  { delay: 6500, type: 'TRANSACTION_ALERT',          accountId: 'card001', payload: { accountId: 'card001', alertId: 'demo_002', counterpart: '스타벅스 강남점', amount: -8500, amountFormatted: '-8,500원', category: '카페', memo: '', isIncome: false, source: 'card' } },
  { delay: 8000, type: 'TYPING_END',                 accountId: 'card001' },
  { delay: 8100, type: 'TRANSACTION_ALERT_COMMENT',  accountId: 'card001', payload: { alertId: 'demo_002', comment: '이번 달 카페 지출이 누적되고 있습니다. 절약 팁이 필요하시면 말씀해 주세요.' } },
]

app.post('/api/demo-start', (req, res) => {
  const { sessionId } = req.body
  const now = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  res.json({ ok: true })

  for (const step of DEMO_SEQUENCE) {
    setTimeout(() => {
      let event
      if (step.type === 'TYPING_START' || step.type === 'TYPING_END') {
        event = { type: step.type, data: { accountId: step.accountId } }
      } else {
        event = { type: step.type, data: { ...step.payload, timestamp: now } }
      }
      if (sessionId) {
        sendWsEvent(sessionId, event)
      } else {
        broadcastWsEvent(event)
      }
    }, step.delay)
  }
})

// ──────────────────────────────────────────────
// 서버 시작
// ──────────────────────────────────────────────
export { app }

if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3001
  httpServer.listen(PORT, () => {
    console.log(`✅ 서버 실행 중: http://localhost:${PORT}`)
  })
}
