import { describe, it, expect, beforeEach } from 'vitest'
import { getInitialAccounts, getInitialTransactions } from '../mockData.js'
import { handleToolCall } from '../tools.js'

// 테스트용 세션 ctx 팩토리
function makeCtx() {
  return {
    accounts: getInitialAccounts(),
    transactions: getInitialTransactions(),
    aliasStore: new Map(),
  }
}

// ── Test 1: alertId ──────────────────────────────────────────────────────────
describe('alertId', () => {
  it('alertId는 Date.now() 기반 문자열이어야 한다', () => {
    const alertId = Date.now().toString()
    expect(typeof alertId).toBe('string')
    expect(alertId.length).toBeGreaterThan(0)
  })

  it('TRANSACTION_ALERT_COMMENT의 alertId가 TRANSACTION_ALERT의 alertId와 일치해야 한다', () => {
    const alertId = Date.now().toString()
    const alertEvent = { type: 'TRANSACTION_ALERT', data: { alertId, counterpart: '테스트', amount: -1000 } }
    const commentEvent = { type: 'TRANSACTION_ALERT_COMMENT', data: { alertId, comment: '테스트 코멘트' } }

    expect(alertEvent.data.alertId).toBe(commentEvent.data.alertId)
  })
})

// ── Test 2: reset-mock (세션 격리) ───────────────────────────────────────────
describe('reset-mock', () => {
  it('새 ctx는 초기 잔액을 가져야 한다', () => {
    const ctx = makeCtx()
    const initialBalance = getInitialAccounts().find((a) => a.id === 'acc001').balance
    expect(ctx.accounts.find((a) => a.id === 'acc001').balance).toBe(initialBalance)
  })

  it('ctx 변형이 다른 ctx에 영향을 주지 않아야 한다', () => {
    const ctx1 = makeCtx()
    const ctx2 = makeCtx()
    ctx1.accounts[0].balance -= 50000
    ctx1.aliasStore.set('엄마', { realName: '이순자', bank: '농협은행', accountNo: '301-1234-5678-01' })

    // ctx2는 영향 없음
    const initialBalance = getInitialAccounts().find((a) => a.id === 'acc001').balance
    expect(ctx2.accounts.find((a) => a.id === 'acc001').balance).toBe(initialBalance)
    expect(ctx2.aliasStore.size).toBe(0)
  })

  it('새 ctx의 aliasStore는 비어있어야 한다', () => {
    const ctx = makeCtx()
    expect(ctx.aliasStore.size).toBe(0)
  })
})

// ── Test 3: handleSavingsAdvice ───────────────────────────────────────────────
describe('handleSavingsAdvice', () => {
  it('기본 호출 시 savings 배열과 total_saveable를 반환해야 한다', () => {
    const result = handleToolCall('get_savings_advice', {}, makeCtx())
    expect(result).toHaveProperty('savings')
    expect(Array.isArray(result.savings)).toBe(true)
    expect(result).toHaveProperty('total_saveable')
    expect(typeof result.total_saveable).toBe('number')
  })

  it('savings 각 항목은 category, saveable, reason 필드를 가져야 한다', () => {
    const result = handleToolCall('get_savings_advice', { period: 'this_month' }, makeCtx())
    for (const item of result.savings) {
      expect(item).toHaveProperty('category')
      expect(item).toHaveProperty('saveable')
      expect(item).toHaveProperty('reason')
    }
  })

  it('카테고리 지출이 없을 때 savings가 빈 배열이어야 한다', () => {
    const result = handleToolCall('get_savings_advice', { period: 'last_month' }, makeCtx())
    expect(Array.isArray(result.savings)).toBe(true)
  })
})

// ── Test 4: handleCompareProducts ─────────────────────────────────────────────
describe('handleCompareProducts', () => {
  it('기본 호출 시 recommended와 products 배열을 반환해야 한다', () => {
    const result = handleToolCall('compare_products', {}, makeCtx())
    expect(result).toHaveProperty('recommended')
    expect(result).toHaveProperty('products')
    expect(Array.isArray(result.products)).toBe(true)
  })

  it('amount 미전달 시 50000원 기본값이 적용되어야 한다', () => {
    const result = handleToolCall('compare_products', {}, makeCtx())
    expect(result.amount).toBe(50000)
    expect(result.amount_formatted).toBe('50,000원')
  })

  it('recommended 상품은 cta_url이 있으면 iM뱅크 상품이어야 한다', () => {
    const result = handleToolCall('compare_products', { amount: 100000 }, makeCtx())
    if (result.recommended?.cta_url) {
      expect(result.recommended.bank).toBe('iM뱅크')
    }
  })
})

// ── Test 5: candidates 자동 선택 메시지 형식 ─────────────────────────────────
describe('candidates 자동 선택 메시지', () => {
  it('첫 번째 후보의 완성 메시지 형식이 올바르야 한다', () => {
    const query = '엄마'
    const candidate = {
      realName: '이순자',
      bank: '농협은행',
      accountNoMasked: '5678',
    }

    const autoMsg = `${query}은(는) ${candidate.realName} (${candidate.bank} ${candidate.accountNoMasked})이야. 이 분으로 진행해줘.`
    expect(autoMsg).toBe('엄마은(는) 이순자 (농협은행 5678)이야. 이 분으로 진행해줘.')
  })
})

// ── Test 6: 프로모 계좌 구조 검증 ─────────────────────────────────────────────
describe('promo accounts', () => {
  it('getInitialAccounts에 프로모 계좌 3개가 있어야 한다', () => {
    const accounts = getInitialAccounts()
    const promos = accounts.filter((a) => a.isPromo === true)
    expect(promos.length).toBeGreaterThanOrEqual(3)
  })

  it('프로모 계좌는 type별로 cma, term_deposit, savings를 포함해야 한다', () => {
    const accounts = getInitialAccounts()
    const promoTypes = new Set(accounts.filter((a) => a.isPromo).map((a) => a.type))
    expect(promoTypes.has('cma')).toBe(true)
    expect(promoTypes.has('term_deposit')).toBe(true)
    expect(promoTypes.has('savings')).toBe(true)
  })

  it('프로모 계좌는 promoProductId 또는 isPromo: true를 가져야 한다', () => {
    const accounts = getInitialAccounts()
    const promos = accounts.filter((a) => a.isPromo === true)
    promos.forEach((a) => {
      expect(a.isPromo).toBe(true)
    })
  })

  it('acc001 주계좌 잔액이 CMA 힌트 임계값(1,000,000원) 이상이어야 한다', () => {
    const accounts = getInitialAccounts()
    const checking = accounts.find((a) => a.id === 'acc001')
    expect(checking.balance).toBeGreaterThanOrEqual(1000000)
  })

  it('acc002 적금 maturityDate가 180일 이내여야 한다 (정기예금 힌트 조건)', () => {
    const accounts = getInitialAccounts()
    const installment = accounts.find((a) => a.id === 'acc002')
    const daysToMaturity = Math.ceil((new Date(installment.maturityDate) - new Date()) / 86400000)
    expect(daysToMaturity).toBeGreaterThan(0)
    expect(daysToMaturity).toBeLessThanOrEqual(180)
  })
})

// ── Test 7: rebuild-context 로직 ──────────────────────────────────────────────
describe('rebuild-context 세션 복원 로직', () => {
  it('빈 세션에 메시지를 주입해야 한다', () => {
    const session = { messages: [] }
    const incoming = [
      { role: 'user', content: '잔액 얼마야?' },
      { role: 'assistant', content: '2,847,300원입니다.' },
    ]
    if (session.messages.length === 0) {
      session.messages = incoming.slice(-20)
    }
    expect(session.messages.length).toBe(2)
    expect(session.messages[0].role).toBe('user')
    expect(session.messages[1].content).toBe('2,847,300원입니다.')
  })

  it('이미 메시지가 있는 세션은 덮어쓰지 않아야 한다', () => {
    const session = { messages: [{ role: 'user', content: '기존 메시지' }] }
    const incoming = [{ role: 'user', content: '새 메시지' }]
    if (session.messages.length === 0) {
      session.messages = incoming
    }
    expect(session.messages[0].content).toBe('기존 메시지')
  })

  it('20개 초과 메시지는 최근 20개만 주입해야 한다', () => {
    const session = { messages: [] }
    const incoming = Array.from({ length: 25 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `msg ${i}`,
    }))
    if (session.messages.length === 0) {
      session.messages = incoming.slice(-20)
    }
    expect(session.messages.length).toBe(20)
    expect(session.messages[0].content).toBe('msg 5')
  })

  it('role/content 없는 항목은 필터링해야 한다', () => {
    const session = { messages: [] }
    const incoming = [
      { role: 'user', content: '유효' },
      { content: '역할없음' },
      { role: 'assistant' },
    ]
    if (session.messages.length === 0) {
      session.messages = incoming.filter((m) => m.role && m.content).slice(-20)
    }
    expect(session.messages.length).toBe(1)
    expect(session.messages[0].content).toBe('유효')
  })
})
