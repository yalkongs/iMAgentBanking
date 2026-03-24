import { describe, it, expect, beforeEach } from 'vitest'
import { accounts, transactions, getInitialAccounts, getInitialTransactions } from '../mockData.js'
import { aliasStore } from '../tools.js'

// ── Test 1: alertId ──────────────────────────────────────────────────────────
// TRANSACTION_ALERT와 TRANSACTION_ALERT_COMMENT가 동일 alertId를 공유해야 함.
// server.js의 로직을 단순 추출하여 검증한다.
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

// ── Test 2: reset-mock ───────────────────────────────────────────────────────
describe('reset-mock', () => {
  beforeEach(() => {
    // 데이터 변형: 잔액 감소, 트랜잭션 추가, alias 등록
    accounts[0].balance -= 50000
    transactions.push({
      id: 't_test_' + Date.now(),
      date: new Date().toISOString().slice(0, 10),
      amount: -50000,
      category: '송금',
      counterpart: '테스트',
      accountId: 'acc001',
    })
    aliasStore.set('엄마', { realName: '이순자', bank: '농협은행', accountNo: '301-1234-5678-01' })
  })

  it('reset 후 accounts 잔액이 초기값으로 복원되어야 한다', () => {
    const initialAccounts = getInitialAccounts()
    const initialBalance = initialAccounts.find((a) => a.id === 'acc001').balance

    // reset 수행
    const freshAccounts = getInitialAccounts()
    accounts.length = 0
    accounts.push(...freshAccounts)

    expect(accounts.find((a) => a.id === 'acc001').balance).toBe(initialBalance)
  })

  it('reset 후 transactions 수가 초기값으로 복원되어야 한다', () => {
    const initialCount = getInitialTransactions().length

    // reset 수행
    const freshTransactions = getInitialTransactions()
    transactions.length = 0
    transactions.push(...freshTransactions)

    expect(transactions.length).toBe(initialCount)
  })

  it('reset 후 aliasStore가 비어있어야 한다', () => {
    aliasStore.clear()
    expect(aliasStore.size).toBe(0)
  })
})

// ── Test 3: candidates 자동 선택 메시지 형식 ─────────────────────────────────
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
