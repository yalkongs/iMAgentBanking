import { contacts, cards, cardTransactions, savingsProducts, SAVINGS_TARGETS } from './mockData.js'
import { searchProducts, getProductById, CATEGORY_LABELS } from './products.js'

// ──────────────────────────────────────────────
// 로컬 날짜 문자열 헬퍼 (타임존 버그 방지)
// new Date().toISOString()은 UTC 기준이므로 KST(+9)에서
// 자정 이후 1시간 안에 실행하면 하루 전 날짜가 나옴.
// ──────────────────────────────────────────────
function localDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// aliasStore는 세션별로 관리 — server.js의 getSession()에서 생성

// ──────────────────────────────────────────────
// Claude Tool 정의
// ──────────────────────────────────────────────
export const toolDefinitions = [
  {
    name: 'get_balance',
    description: '계좌 잔액을 조회하거나 보유 계좌 목록을 보여줍니다. "계좌 목록", "내 계좌", "잔액 확인", "얼마 있어?" 등 모든 계좌/잔액 관련 요청에 사용합니다. 특정 계좌 또는 전체 계좌를 반환합니다.',
    input_schema: {
      type: 'object',
      properties: {
        account_id: {
          type: 'string',
          description: '조회할 계좌 ID (acc001~acc005). 생략하면 전체 계좌를 반환.',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_transactions',
    description: '거래 내역을 조회합니다. 기간, 카테고리, 거래 상대방으로 필터링 가능합니다.',
    input_schema: {
      type: 'object',
      properties: {
        account_id: {
          type: 'string',
          description: '조회할 계좌 ID. 생략하면 주계좌(acc001) 기준.',
        },
        start_date: { type: 'string', description: '조회 시작일 (YYYY-MM-DD)' },
        end_date:   { type: 'string', description: '조회 종료일 (YYYY-MM-DD)' },
        category: {
          type: 'string',
          description: '카테고리 필터. 예: 카페, 식비, 쇼핑, 송금, 급여, 교통, 문화, 의료, 입금, 이체, 이자, 구독, 헬스, 통신, 보험, 교육, 여행',
        },
        counterpart: {
          type: 'string',
          description: '거래 상대방 실명 (부분 일치). 예: 김영희, 스타벅스',
        },
        counterpart_bank: {
          type: 'string',
          description: '거래 상대방 은행명 (부분 일치). 예: 신한은행, 카카오뱅크. "신한은행으로 입금/출금" 등 은행명으로 필터링 시 사용.',
        },
        direction: {
          type: 'string',
          enum: ['income', 'expense'],
          description: '입출금 방향 필터. income=입금(양수), expense=출금(음수). 생략하면 전체.',
        },
        limit:   { type: 'number',  description: '반환할 최대 건수. 기본값 20.' },
        sort_by: {
          type: 'string',
          enum: ['date_desc', 'date_asc', 'amount_desc', 'amount_asc'],
          description: '정렬 기준. 기본값 date_desc.',
        },
      },
      required: [],
    },
  },
  {
    name: 'resolve_contact',
    description: `닉네임(엄마, 절친 등)이나 실명으로 수신자를 확인합니다.
- aliasStore에 저장된 닉네임이면 status:"known" 반환
- 처음 보는 닉네임이면 status:"candidates"로 거래 빈도순 후보 목록 반환
- 이체/조회 전 반드시 호출하세요.`,
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '검색할 닉네임 또는 실명. 예: 엄마, 김영희',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'save_alias',
    description: '사용자가 확인한 닉네임 → 계좌 매핑을 저장합니다.\n- 기존 거래 내역의 계좌 선택 시: nickname + account_no 만 전달\n- 신규 계좌 직접 입력 시: nickname + account_no + real_name + bank 모두 전달\nresolve_contact 결과(candidates 또는 no_history)에서 사용자가 계좌를 확정했을 때 반드시 호출하세요.',
    input_schema: {
      type: 'object',
      properties: {
        nickname: {
          type: 'string',
          description: '저장할 닉네임. 예: 엄마, 절친, 아버지',
        },
        account_no: {
          type: 'string',
          description: '연결할 계좌번호. 예: 110-1234-567890',
        },
        real_name: {
          type: 'string',
          description: '(신규 계좌 전용) 수취인 실명. 예: 김철수',
        },
        bank: {
          type: 'string',
          description: '(신규 계좌 전용) 은행명. 예: 신한은행, 카카오뱅크',
        },
      },
      required: ['nickname', 'account_no'],
    },
  },
  {
    name: 'get_transfer_suggestion',
    description: '특정 수신자에게 보낸 거래 이력을 분석해 송금 금액을 제안합니다. 금액이 명시되지 않은 이체 요청 시 호출하세요.',
    input_schema: {
      type: 'object',
      properties: {
        real_name: {
          type: 'string',
          description: '수신자 실명. 예: 김영희, 김철수',
        },
      },
      required: ['real_name'],
    },
  },
  {
    name: 'transfer',
    description: '계좌 이체를 실행합니다. to_contact에는 resolve_contact로 확인된 실명을 전달하세요. 호출 시 사용자 확인 UI가 표시됩니다.',
    input_schema: {
      type: 'object',
      properties: {
        to_contact: {
          type: 'string',
          description: '받는 사람 실명 (resolve_contact로 확인된 값). 예: 김영희',
        },
        amount: {
          type: 'number',
          description: '이체할 금액 (원). 예: 50000',
        },
        from_account_id: {
          type: 'string',
          description: '출금 계좌 ID. 기본값 acc001 (주계좌)',
        },
        memo: {
          type: 'string',
          description: '이체 메모',
        },
      },
      required: ['to_contact', 'amount'],
    },
  },
  {
    name: 'get_card_transactions',
    description: `카드 거래내역을 조회합니다 (마이데이터 포함).
- merchant(가맹점명)만 기록되며, 품목 상세는 알 수 없습니다.
- inferredCategory는 가맹점 기반 추정이므로 부정확할 수 있습니다.
- 쿠팡·네이버페이 등 종합몰은 categoryNote에 '품목 불명' 표기됩니다.`,
    input_schema: {
      type: 'object',
      properties: {
        card_id: {
          type: 'string',
          description: '조회할 카드 ID (card001, card002). 생략 시 전체 카드.',
        },
        start_date: { type: 'string', description: '조회 시작일 (YYYY-MM-DD)' },
        end_date:   { type: 'string', description: '조회 종료일 (YYYY-MM-DD)' },
        inferred_category: {
          type: 'string',
          description: '추정 카테고리 필터. 예: 카페, 식비, 쇼핑, 구독, 교통, 의료, 문화',
        },
        merchant: {
          type: 'string',
          description: '가맹점명 부분 일치 검색',
        },
        limit: { type: 'number', description: '반환 건수. 기본 30.' },
      },
      required: [],
    },
  },
  {
    name: 'analyze_card_spending',
    description: `카드 거래내역 기반 지출을 분석합니다 (마이데이터 포함).
- 카드 내역의 카테고리는 가맹점 기반 추정이므로 부정확할 수 있음을 사용자에게 고지하세요.
- 쿠팡·네이버페이 등 종합몰 지출은 실제 품목과 다를 수 있습니다.`,
    input_schema: {
      type: 'object',
      properties: {
        start_date: { type: 'string', description: '분석 시작일 (YYYY-MM-DD)' },
        end_date:   { type: 'string', description: '분석 종료일 (YYYY-MM-DD)' },
        card_id:    { type: 'string', description: '특정 카드만 분석 시 card_id 지정. 생략 시 전체.' },
        group_by: {
          type: 'string',
          enum: ['inferredCategory', 'merchant', 'cardId'],
          description: '집계 기준. 기본값 inferredCategory.',
        },
      },
      required: [],
    },
  },
  {
    name: 'analyze_spending',
    description: '특정 기간의 지출을 카테고리별로 분석합니다.',
    input_schema: {
      type: 'object',
      properties: {
        start_date: { type: 'string', description: '분석 시작일 (YYYY-MM-DD)' },
        end_date:   { type: 'string', description: '분석 종료일 (YYYY-MM-DD)' },
        group_by: {
          type: 'string',
          enum: ['category', 'counterpart'],
          description: '집계 기준. 기본값 category.',
        },
      },
      required: [],
    },
  },
  {
    name: 'complex_query',
    description: '복잡한 조회를 처리합니다. "지난 달 가장 큰 입금액", "이번 달 카페 총 지출" 등.',
    input_schema: {
      type: 'object',
      properties: {
        query_type: {
          type: 'string',
          enum: [
            'max_income_last_month',
            'max_expense_last_month',
            'total_by_category_this_month',
            'total_by_category_last_month',
            'transfer_count',
            'biggest_single_expense',
          ],
          description: '조회 유형',
        },
        category: {
          type: 'string',
          description: 'category 조회 시 카테고리명',
        },
      },
      required: ['query_type'],
    },
  },
  {
    name: 'get_monthly_story',
    description: '이번 달 금융 이야기를 요약합니다. "이번 달 어땠어?", "월간 정리", "이달 이야기" 등의 요청에 사용합니다.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_savings_advice',
    description: '이번 달 지출 패턴을 분석해 절약 가능한 항목과 금액을 제안합니다. "얼마 절약할 수 있어?", "지출 줄이는 법", "절약 방법", "절약 조언" 등의 요청에 사용합니다.',
    input_schema: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          enum: ['this_month', 'last_month'],
          description: '분석 기간. 기본값 this_month.',
        },
      },
      required: [],
    },
  },
  {
    name: 'search_products',
    description: `iM뱅크 금융 상품을 검색하고 목록을 보여줍니다.
- "카드 알려줘", "대출 상품", "적금 추천", "예금 상품", "IRP", "ISA" 등 상품 종류 문의에 사용합니다.
- "해외 여행 카드", "마일리지 카드", "대중교통 할인" 등 특정 혜택 검색에도 사용합니다.
- 상품 유형(type)과 검색어(keyword)를 조합해 원하는 상품을 찾을 수 있습니다.`,
    input_schema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['deposit', 'savings', 'loan', 'credit_card', 'debit_card', 'investment'],
          description: '상품 유형. deposit: 예금, savings: 적금, loan: 대출, credit_card: 신용카드, debit_card: 체크카드, investment: IRP/ISA. 생략하면 전체 검색.',
        },
        keyword: {
          type: 'string',
          description: '검색 키워드. 상품명·혜택·특징 등. 예: 해외, 캐시백, 마일리지, 청년, 비대면',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_product_detail',
    description: '특정 iM뱅크 금융 상품의 상세 정보를 조회합니다. search_products로 상품 ID를 먼저 확인한 후 사용합니다.',
    input_schema: {
      type: 'object',
      properties: {
        product_id: {
          type: 'string',
          description: '조회할 상품 ID (예: cc_001, loan_002)',
        },
      },
      required: ['product_id'],
    },
  },
  {
    name: 'compare_products',
    description: '사용자 절약 목표에 맞는 금융상품(적금/예금)을 비교 추천합니다. "적금 추천", "어떤 적금이 좋아?", "금리 비교", "상품 추천" 등의 요청에 사용합니다.',
    input_schema: {
      type: 'object',
      properties: {
        amount: {
          type: 'number',
          description: '월 납입 목표 금액(원). 미입력 시 50000원 기본값.',
        },
        period_months: {
          type: 'number',
          description: '가입 기간(개월). 기본값 6.',
        },
        product_type: {
          type: 'string',
          enum: ['savings', 'deposit'],
          description: '상품 유형. savings: 적금, deposit: 예금. 기본값 savings.',
        },
      },
      required: [],
    },
  },
]

// ──────────────────────────────────────────────
// Tool 핸들러
// ──────────────────────────────────────────────

function serializeAccount(acc) {
  return {
    id: acc.id, name: acc.name, bank: acc.bank, type: acc.type,
    accountNo: acc.accountNo, balance: acc.balance,
    balanceFormatted: acc.balance.toLocaleString('ko-KR') + '원',
    interestRate: acc.interestRate ?? null,
    maturityDate: acc.maturityDate ?? null,
    monthlyDeposit: acc.monthlyDeposit ?? null,
  }
}

function handleGetBalance({ account_id }, ctx) {
  const { accounts } = ctx
  if (account_id) {
    const acc = accounts.find((a) => a.id === account_id)
    if (!acc) return { error: `계좌 ${account_id}를 찾을 수 없습니다.` }
    return { accounts: [serializeAccount(acc)] }
  }
  const realAccounts = accounts.filter((a) => !a.isPromo)
  return {
    accounts: realAccounts.map(serializeAccount),
    totalBalance: realAccounts.reduce((s, a) => s + a.balance, 0),
    totalBalanceFormatted: realAccounts.reduce((s, a) => s + a.balance, 0).toLocaleString('ko-KR') + '원',
  }
}

function handleGetTransactions({
  account_id = 'acc001', start_date, end_date,
  category, counterpart, counterpart_bank, direction, limit = 20, sort_by = 'date_desc',
}, ctx) {
  const { accounts, transactions } = ctx
  const account = accounts.find((a) => a.id === account_id)

  let txs = transactions.filter((t) => t.accountId === account_id)
  if (start_date)           txs = txs.filter((t) => t.date >= start_date)
  if (end_date)             txs = txs.filter((t) => t.date <= end_date)
  if (category)             txs = txs.filter((t) => t.category === category)
  if (counterpart)          txs = txs.filter((t) => t.counterpart && t.counterpart.includes(counterpart))
  if (counterpart_bank)     txs = txs.filter((t) => t.counterpartBank && t.counterpartBank.includes(counterpart_bank))
  if (direction === 'income')  txs = txs.filter((t) => t.amount > 0)
  if (direction === 'expense') txs = txs.filter((t) => t.amount < 0)

  const sortFns = {
    date_desc:   (a, b) => b.date.localeCompare(a.date),
    date_asc:    (a, b) => a.date.localeCompare(b.date),
    amount_desc: (a, b) => b.amount - a.amount,
    amount_asc:  (a, b) => a.amount - b.amount,
  }
  txs = txs.sort(sortFns[sort_by] || sortFns.date_desc).slice(0, limit)

  const result = {
    count: txs.length,
    transactions: txs.map((t) => ({
      ...t,
      amountFormatted: (t.amount > 0 ? '+' : '') + t.amount.toLocaleString('ko-KR') + '원',
    })),
  }

  // 정기예금·정기적금은 거래가 아닌 상품 주기 정보도 함께 제공
  if (account && (account.type === 'term_deposit' || account.type === 'installment_savings')) {
    const today = new Date().toISOString().slice(0, 10)
    const maturityDate = account.maturityDate ?? null
    const daysLeft = maturityDate
      ? Math.ceil((new Date(maturityDate) - new Date(today)) / 86400000)
      : null

    result.productInfo = {
      productType: account.type === 'term_deposit' ? '정기예금' : '정기적금',
      openDate: account.openDate ?? null,
      maturityDate,
      interestRate: account.interestRate ?? null,
      balance: account.balance,
      balanceFormatted: account.balance.toLocaleString('ko-KR') + '원',
      daysToMaturity: daysLeft,
      ...(account.type === 'installment_savings' && {
        monthlyDeposit: account.monthlyDeposit,
        monthlyDepositFormatted: (account.monthlyDeposit ?? 0).toLocaleString('ko-KR') + '원',
        totalPaid: txs.filter((t) => t.category === '납입' || t.category === '개설입금')
                      .reduce((s, t) => s + t.amount, 0),
      }),
    }
  }

  return result
}

function maskAccountNo(accountNo) {
  // 계좌번호 뒷 4자리만 표시: "110-234-567890" → "****7890"
  const digits = accountNo.replace(/\D/g, '')
  return '****' + digits.slice(-4)
}

function handleResolveContact({ query }, ctx) {
  const { transactions, aliasStore } = ctx
  const q = query.trim()

  // 1. aliasStore에 저장된 닉네임인지 확인
  if (aliasStore.has(q)) {
    const c = aliasStore.get(q)
    return {
      status: 'known',
      nickname: q,
      contact: { realName: c.realName, bank: c.bank, accountNoMasked: maskAccountNo(c.accountNo), accountNo: c.accountNo },
    }
  }

  // 2. 실명 완전 일치 (실명으로 직접 조회한 경우)
  const exactByName = contacts.find((c) => c.realName === q)
  if (exactByName) {
    return {
      status: 'known',
      nickname: q,
      contact: { ...exactByName, accountNoMasked: maskAccountNo(exactByName.accountNo) },
    }
  }

  // 3. 닉네임 미등록 → 거래 이력이 있는 후보만 추출 (빈도순)
  const candidates = contacts
    .map((c) => {
      const sentTxs = transactions.filter((t) =>
        t.accountId === 'acc001' &&
        t.amount < 0 &&
        t.category === '송금' &&
        t.counterpart === c.realName
      ).sort((a, b) => b.date.localeCompare(a.date))

      return {
        realName: c.realName,
        bank: c.bank,
        accountNo: c.accountNo,
        accountNoMasked: maskAccountNo(c.accountNo),
        transferCount: sentTxs.length,
        lastTransferDate: sentTxs[0]?.date || null,
      }
    })
    .filter((c) => c.transferCount > 0)          // 거래 이력 있는 후보만
    .sort((a, b) => b.transferCount - a.transferCount)
    .slice(0, 5)                                  // 최대 5명

  if (candidates.length > 0) {
    return {
      status: 'candidates',
      query: q,
      candidates,
      message: `'${q}'에 등록된 계좌가 없습니다. 이전에 송금한 내역을 바탕으로 후보를 추렸습니다.`,
    }
  }

  // 4. 거래 이력도 없음 → 직접 입력 UI 카드 표시
  return {
    status: 'no_history',
    query: q,
    candidates: [],
    message: `'${q}'에 해당하는 계좌가 등록되어 있지 않고, 거래 이력도 없습니다.`,
  }
}

function handleSaveAlias({ nickname, account_no, real_name, bank }, ctx) {
  const { aliasStore } = ctx
  let contact = contacts.find((c) => c.accountNo === account_no)

  // 기존 contacts에 없는 신규 계좌 → real_name + bank 로 임시 등록
  if (!contact) {
    if (!real_name || !bank) {
      return { success: false, error: `계좌번호 ${account_no}를 찾을 수 없습니다. 실명(real_name)과 은행명(bank)을 함께 전달해 주세요.` }
    }
    contact = { realName: real_name, bank, accountNo: account_no }
  }

  aliasStore.set(nickname, {
    realName: contact.realName,
    bank: contact.bank,
    accountNo: contact.accountNo,
  })
  return {
    success: true,
    nickname,
    contact: { realName: contact.realName, bank: contact.bank, accountNo: contact.accountNo },
    message: `'${nickname}' → ${contact.realName} (${contact.bank}) 등록 완료.`,
  }
}

function handleGetTransferSuggestion({ real_name }, ctx) {
  const { transactions } = ctx
  const sentTxs = transactions
    .filter((t) =>
      t.accountId === 'acc001' &&
      t.amount < 0 &&
      t.category === '송금' &&
      t.counterpart === real_name
    )
    .sort((a, b) => b.date.localeCompare(a.date))

  if (sentTxs.length === 0) {
    return { found: false, message: `${real_name}에게 보낸 송금 내역이 없습니다.` }
  }

  // 가장 빈번한 금액 찾기
  const freqMap = {}
  for (const tx of sentTxs) {
    const amt = Math.abs(tx.amount)
    freqMap[amt] = (freqMap[amt] || 0) + 1
  }
  const suggestedAmount = Number(
    Object.entries(freqMap).sort((a, b) => b[1] - a[1])[0][0]
  )

  return {
    found: true,
    realName: real_name,
    suggestedAmount,
    suggestedAmountFormatted: suggestedAmount.toLocaleString('ko-KR') + '원',
    frequency: freqMap[suggestedAmount],
    totalCount: sentTxs.length,
    recentAmounts: sentTxs.slice(0, 5).map((t) => ({
      amount: Math.abs(t.amount),
      amountFormatted: Math.abs(t.amount).toLocaleString('ko-KR') + '원',
      date: t.date,
    })),
    lastDate: sentTxs[0].date,
  }
}

function handleGetCardTransactions({
  card_id, start_date, end_date, inferred_category, merchant, limit = 30,
}) {
  let txs = [...cardTransactions]
  if (card_id)           txs = txs.filter((t) => t.cardId === card_id)
  if (start_date)        txs = txs.filter((t) => t.date >= start_date)
  if (end_date)          txs = txs.filter((t) => t.date <= end_date)
  if (inferred_category) txs = txs.filter((t) => t.inferredCategory === inferred_category)
  if (merchant)          txs = txs.filter((t) => t.merchant.includes(merchant))

  txs.sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time))
  txs = txs.slice(0, limit)

  const cardMap = Object.fromEntries(cards.map((c) => [c.id, c]))

  return {
    notice: '카드 거래내역의 카테고리는 가맹점명 기반 추정이며, 쿠팡·네이버페이 등 종합몰은 품목을 알 수 없습니다.',
    count: txs.length,
    transactions: txs.map((t) => ({
      ...t,
      cardName: cardMap[t.cardId]?.name || t.cardId,
      cardSource: cardMap[t.cardId]?.source || 'own',
      amountFormatted: t.amount.toLocaleString('ko-KR') + '원',
    })),
  }
}

export function handleAnalyzeCardSpending({ start_date, end_date, card_id, group_by = 'inferredCategory' }, ctx) {
  const now = new Date()
  const defaultStart = localDateStr(new Date(now.getFullYear(), now.getMonth(), 1))
  const s = start_date || defaultStart
  const e = end_date || localDateStr(now)

  let txs = cardTransactions.filter((t) => t.amount < 0 && t.date >= s && t.date <= e)
  if (card_id) txs = txs.filter((t) => t.cardId === card_id)

  const groups = {}
  for (const t of txs) {
    const key = t[group_by] || '기타'
    if (!groups[key]) groups[key] = { total: 0, count: 0, ambiguous: 0 }
    groups[key].total += Math.abs(t.amount)
    groups[key].count++
    if (t.categoryNote) groups[key].ambiguous++
  }

  const cardMap = Object.fromEntries(cards.map((c) => [c.id, c.name]))
  const sorted = Object.entries(groups)
    .map(([key, v]) => ({
      [group_by]: group_by === 'cardId' ? (cardMap[key] || key) : key,
      total: v.total,
      totalFormatted: v.total.toLocaleString('ko-KR') + '원',
      count: v.count,
      ambiguousCount: v.ambiguous,
    }))
    .sort((a, b) => b.total - a.total)

  const grandTotal = sorted.reduce((s, g) => s + g.total, 0)

  return {
    notice: '카테고리는 가맹점 기반 추정이며 실제와 다를 수 있습니다. 특히 쿠팡·마켓컬리 등 종합몰은 품목 불명입니다.',
    period: { start: s, end: e },
    groupBy: group_by,
    items: sorted,
    total: grandTotal,
    totalFormatted: grandTotal.toLocaleString('ko-KR') + '원',
  }
}

export function handleAnalyzeSpending({ start_date, end_date, group_by = 'category' }, ctx) {
  const { transactions } = ctx
  const now = new Date()
  const defaultStart = localDateStr(new Date(now.getFullYear(), now.getMonth(), 1))
  const s = start_date || defaultStart
  const e = end_date || localDateStr(now)

  const txs = transactions.filter((t) =>
    t.accountId === 'acc001' && t.amount < 0 && t.date >= s && t.date <= e
  )

  const groups = {}
  for (const t of txs) {
    const key = t[group_by]
    if (!groups[key]) groups[key] = 0
    groups[key] += Math.abs(t.amount)
  }

  const sorted = Object.entries(groups)
    .map(([key, total]) => ({ [group_by]: key, total, totalFormatted: total.toLocaleString('ko-KR') + '원' }))
    .sort((a, b) => b.total - a.total)

  const grandTotal = sorted.reduce((s, g) => s + g.total, 0)
  return {
    period: { start: s, end: e },
    groupBy: group_by,
    items: sorted,
    total: grandTotal,
    totalFormatted: grandTotal.toLocaleString('ko-KR') + '원',
  }
}

function handleComplexQuery({ query_type, category }, ctx) {
  const { transactions } = ctx
  const now = new Date()
  const thisMonthStart = localDateStr(new Date(now.getFullYear(), now.getMonth(), 1))
  const lastMonthStart = localDateStr(new Date(now.getFullYear(), now.getMonth() - 1, 1))
  const lastMonthEnd   = localDateStr(new Date(now.getFullYear(), now.getMonth(), 0))
  const acc = 'acc001'

  switch (query_type) {
    case 'max_income_last_month': {
      const txs = transactions.filter((t) =>
        t.accountId === acc && t.amount > 0 && t.date >= lastMonthStart && t.date <= lastMonthEnd
      )
      if (!txs.length) return { result: null, message: '지난 달 입금 내역이 없습니다.' }
      const max = txs.reduce((m, t) => (t.amount > m.amount ? t : m), txs[0])
      return { result: max, amountFormatted: max.amount.toLocaleString('ko-KR') + '원' }
    }
    case 'max_expense_last_month': {
      const txs = transactions.filter((t) =>
        t.accountId === acc && t.amount < 0 && t.date >= lastMonthStart && t.date <= lastMonthEnd
      )
      if (!txs.length) return { result: null, message: '지난 달 지출 내역이 없습니다.' }
      const max = txs.reduce((m, t) => (t.amount < m.amount ? t : m), txs[0])
      return { result: max, amountFormatted: Math.abs(max.amount).toLocaleString('ko-KR') + '원' }
    }
    case 'total_by_category_this_month': {
      const txs = transactions.filter((t) =>
        t.accountId === acc && t.amount < 0 && t.date >= thisMonthStart &&
        (!category || t.category === category)
      )
      const total = txs.reduce((s, t) => s + Math.abs(t.amount), 0)
      return { category: category || '전체', period: '이번 달', total, totalFormatted: total.toLocaleString('ko-KR') + '원', count: txs.length }
    }
    case 'total_by_category_last_month': {
      const txs = transactions.filter((t) =>
        t.accountId === acc && t.amount < 0 && t.date >= lastMonthStart && t.date <= lastMonthEnd &&
        (!category || t.category === category)
      )
      const total = txs.reduce((s, t) => s + Math.abs(t.amount), 0)
      return { category: category || '전체', period: '지난 달', total, totalFormatted: total.toLocaleString('ko-KR') + '원', count: txs.length }
    }
    case 'transfer_count': {
      const txs = transactions.filter((t) =>
        t.accountId === acc && t.category === '송금' && t.date >= thisMonthStart
      )
      return { count: txs.length, total: txs.reduce((s, t) => s + Math.abs(t.amount), 0), totalFormatted: txs.reduce((s, t) => s + Math.abs(t.amount), 0).toLocaleString('ko-KR') + '원' }
    }
    case 'biggest_single_expense': {
      const txs = transactions.filter((t) => t.accountId === acc && t.amount < 0)
      if (!txs.length) return { result: null }
      const max = txs.reduce((m, t) => (t.amount < m.amount ? t : m), txs[0])
      return { result: max, amountFormatted: Math.abs(max.amount).toLocaleString('ko-KR') + '원' }
    }
    default:
      return { error: `알 수 없는 query_type: ${query_type}` }
  }
}

// ──────────────────────────────────────────────
// 이체 실행 (server.js에서 확인 후 호출)
// ──────────────────────────────────────────────
export function executeTransfer({ to_contact, amount, from_account_id = 'acc001', memo = '' }, ctx) {
  const { accounts, transactions, aliasStore } = ctx
  // 실명으로 contacts 검색
  let contact = contacts.find((c) => c.realName === to_contact)

  // aliasStore에서도 검색
  if (!contact) {
    for (const [, v] of aliasStore) {
      if (v.realName === to_contact) { contact = v; break }
    }
  }

  if (!contact) {
    return { success: false, error: `'${to_contact}' 연락처를 찾을 수 없습니다.` }
  }

  const fromAcc = accounts.find((a) => a.id === from_account_id)
  if (!fromAcc) return { success: false, error: `출금 계좌(${from_account_id})를 찾을 수 없습니다.` }
  if (fromAcc.balance < amount) {
    return { success: false, error: `잔액 부족. 현재 잔액: ${fromAcc.balance.toLocaleString('ko-KR')}원` }
  }

  fromAcc.balance -= amount

  const newTx = {
    id: `t${Date.now()}`,
    date: localDateStr(new Date()),
    amount: -amount,
    category: '송금',
    counterpart: contact.realName,
    accountId: from_account_id,
    memo,
  }
  transactions.push(newTx)

  return {
    success: true,
    transactionId: newTx.id,
    from: { name: fromAcc.name, bank: fromAcc.bank, accountNo: fromAcc.accountNo },
    to: { name: contact.realName, bank: contact.bank, accountNo: contact.accountNo },
    amount,
    amountFormatted: amount.toLocaleString('ko-KR') + '원',
    newBalance: fromAcc.balance,
    newBalanceFormatted: fromAcc.balance.toLocaleString('ko-KR') + '원',
    memo,
  }
}

// ──────────────────────────────────────────────
// 월간 이야기 (Financial Story)
// ──────────────────────────────────────────────
function handleGetMonthlyStory(_, ctx) {
  const { transactions } = ctx
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  // 이번 달 거래 집계
  const monthTxs = transactions.filter((t) => {
    const d = new Date(t.date)
    return d.getFullYear() === year && d.getMonth() + 1 === month
  })

  const income = monthTxs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const expense = Math.abs(monthTxs.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0))
  const savings = income - expense
  const savingsRate = income > 0 ? Math.round((savings / income) * 100) : 0

  // 카테고리별 집계 (지출)
  const catMap = new Map()
  monthTxs.filter((t) => t.amount < 0).forEach((t) => {
    catMap.set(t.category, (catMap.get(t.category) || 0) + Math.abs(t.amount))
  })
  const topCats = [...catMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat, amt]) => `${cat} ${amt.toLocaleString('ko-KR')}원`)

  // 등급 산정
  let grade, gradeColor
  if (savingsRate >= 30) { grade = 'A'; gradeColor = '#34D399' }
  else if (savingsRate >= 20) { grade = 'B'; gradeColor = '#7dd3fc' }
  else if (savingsRate >= 10) { grade = 'C'; gradeColor = '#FBBF24' }
  else { grade = 'D'; gradeColor = '#F87171' }

  const narrative = savings >= 0
    ? `${month}월은 수입 대비 ${savingsRate}%를 저축한 달입니다. ${topCats[0] ? topCats[0] + ' 지출이 가장 많았으며, ' : ''}전반적으로 ${savingsRate >= 20 ? '안정적인' : '개선이 필요한'} 재무 흐름을 보였습니다.`
    : `${month}월은 지출이 수입을 초과한 달입니다. ${topCats[0] ? topCats[0] + ' 지출이 가장 컸으며, ' : ''}다음 달 지출 계획을 재검토해 보시기 바랍니다.`

  const highlights = []
  if (topCats.length > 0) highlights.push(`최대 지출: ${topCats[0]}`)
  if (topCats.length > 1) highlights.push(`2위: ${topCats[1]}`)
  const salaryTx = monthTxs.find((t) => t.category === '급여')
  if (salaryTx) highlights.push(`급여 입금: ${salaryTx.amount.toLocaleString('ko-KR')}원`)

  return {
    month: `${year}년 ${month}월`,
    narrative,
    incomeFormatted: income.toLocaleString('ko-KR') + '원',
    expenseFormatted: expense.toLocaleString('ko-KR') + '원',
    savingsFormatted: Math.abs(savings).toLocaleString('ko-KR') + '원',
    savingsRate,
    highlights,
    grade,
    gradeColor,
  }
}

// ──────────────────────────────────────────────
// 절약 조언
// ──────────────────────────────────────────────
function handleGetSavingsAdvice({ period = 'this_month' } = {}) {
  const now = new Date()
  const year = now.getFullYear()
  const month = period === 'last_month'
    ? (now.getMonth() === 0 ? 12 : now.getMonth())
    : now.getMonth() + 1
  const targetYear = period === 'last_month' && now.getMonth() === 0
    ? year - 1
    : year

  const monthTxs = cardTransactions.filter((t) => {
    const d = new Date(t.date)
    return d.getFullYear() === targetYear && d.getMonth() + 1 === month && t.amount < 0
  })

  // 카테고리별 집계
  const catMap = new Map()
  monthTxs.forEach((t) => {
    catMap.set(t.category, (catMap.get(t.category) || 0) + Math.abs(t.amount))
  })

  const savings = []
  let totalSaveable = 0

  for (const [cat, spent] of catMap.entries()) {
    const target = SAVINGS_TARGETS[cat]
    if (!target) continue
    const saveable = Math.round(spent * (1 - target.ratio))
    if (saveable <= 0) continue
    savings.push({
      category: cat,
      spent,
      spentFormatted: spent.toLocaleString('ko-KR') + '원',
      saveable,
      saveableFormatted: saveable.toLocaleString('ko-KR') + '원',
      reason: target.reason,
      ratio: Math.round((1 - target.ratio) * 100),
    })
    totalSaveable += saveable
  }

  savings.sort((a, b) => b.saveable - a.saveable)

  return {
    period: `${targetYear}년 ${month}월`,
    savings,
    total_saveable: totalSaveable,
    total_saveable_formatted: totalSaveable.toLocaleString('ko-KR') + '원',
  }
}

// ──────────────────────────────────────────────
// 상품 비교
// ──────────────────────────────────────────────
function handleCompareProducts({ amount = 50000, period_months = 6, product_type = 'savings' } = {}) {
  const products = savingsProducts.map((p) => {
    const maturity = Math.round(amount * period_months * (1 + (p.rate / 100) * (period_months / 12)))
    const interest = maturity - amount * period_months
    return {
      ...p,
      monthly_amount: amount,
      monthly_amount_formatted: amount.toLocaleString('ko-KR') + '원',
      period_months,
      maturity,
      maturity_formatted: maturity.toLocaleString('ko-KR') + '원',
      interest,
      interest_formatted: interest.toLocaleString('ko-KR') + '원',
      rate_formatted: p.rate.toFixed(1) + '%',
    }
  })

  const recommended = products.find((p) => p.recommended) || products[0]
  const others = products.filter((p) => !p.recommended)

  return {
    amount,
    amount_formatted: amount.toLocaleString('ko-KR') + '원',
    period_months,
    product_type,
    recommended,
    others,
    products,
  }
}

// ──────────────────────────────────────────────
// 상품 검색
// ──────────────────────────────────────────────
function handleSearchProducts({ type, keyword } = {}) {
  const results = searchProducts({ type, keyword })

  if (!results.length) {
    return {
      found: false,
      message: '조건에 맞는 상품이 없습니다.',
      products: [],
    }
  }

  // 목록용 요약 데이터 반환
  const summaries = results.map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    typeLabel: p.typeLabel,
    category: p.category,
    summary: p.highlights?.[0] || '',
    rateInfo: p.baseRate != null
      ? (p.maxRate && p.maxRate !== p.baseRate
          ? `연 ${p.baseRate}% ~ ${p.maxRate}%`
          : `연 ${p.baseRate}%`)
      : (p.minRate != null
          ? `연 ${p.minRate}% ~ ${p.maxRate}%`
          : null),
    annualFee: p.annualFee != null ? p.annualFee : undefined,
    tags: p.tags || [],
    highlightCount: (p.highlights || []).length,
  }))

  const typeLabel = type ? CATEGORY_LABELS[type] : '전체'

  return {
    found: true,
    query: { type, keyword },
    typeLabel,
    count: summaries.length,
    products: summaries,
  }
}

function handleGetProductDetail({ product_id }) {
  const product = getProductById(product_id)
  if (!product) {
    return { found: false, message: `상품 ID '${product_id}'를 찾을 수 없습니다.` }
  }
  return { found: true, product }
}

// ──────────────────────────────────────────────
// Tool 디스패처
// ──────────────────────────────────────────────
export function handleToolCall(name, input, ctx) {
  switch (name) {
    case 'get_balance':            return handleGetBalance(input, ctx)
    case 'get_transactions':       return handleGetTransactions(input, ctx)
    case 'resolve_contact':        return handleResolveContact(input, ctx)
    case 'save_alias':             return handleSaveAlias(input, ctx)
    case 'get_transfer_suggestion': return handleGetTransferSuggestion(input, ctx)
    case 'get_card_transactions':   return handleGetCardTransactions(input, ctx)
    case 'analyze_card_spending':  return handleAnalyzeCardSpending(input, ctx)
    case 'analyze_spending':       return handleAnalyzeSpending(input, ctx)
    case 'complex_query':          return handleComplexQuery(input, ctx)
    case 'get_monthly_story':      return handleGetMonthlyStory(input, ctx)
    case 'get_savings_advice':     return handleGetSavingsAdvice(input, ctx)
    case 'compare_products':       return handleCompareProducts(input, ctx)
    case 'search_products':        return handleSearchProducts(input)
    case 'get_product_detail':     return handleGetProductDetail(input)
    default:
      return { error: `알 수 없는 tool: ${name}` }
  }
}
