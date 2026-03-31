// ──────────────────────────────────────────────
// 계좌 — iM뱅크 (입출금 + 예적금)
// ──────────────────────────────────────────────
export const accounts = [
  {
    id: 'acc001',
    name: '주계좌',
    balance: 1250000,
    type: 'checking',
    bank: 'iM뱅크',
    accountNo: '503-12-3456789',
  },
  {
    id: 'acc002',
    name: 'iM 정기적금',
    balance: 3600000,
    type: 'installment_savings',
    bank: 'iM뱅크',
    accountNo: '503-34-5678901',
    monthlyDeposit: 300000,
    openDate: '2025-04-01',
    maturityDate: '2026-12-31',
    interestRate: 4.2,
  },
  {
    id: 'acc003',
    name: 'iM 정기예금',
    balance: 10000000,
    type: 'term_deposit',
    bank: 'iM뱅크',
    accountNo: '503-56-7890123',
    openDate: '2025-09-15',
    maturityDate: '2026-09-15',
    interestRate: 3.8,
  },
  {
    id: 'acc004',
    name: '비상금통장',
    balance: 3000000,
    type: 'savings',
    bank: 'iM뱅크',
    accountNo: '503-78-9012345',
    interestRate: 2.0,
  },
  {
    id: 'acc005',
    name: 'iM CMA',
    balance: 5200000,
    type: 'cma',
    bank: 'iM뱅크증권',
    accountNo: '503-90-1234567',
    interestRate: 3.5,
    openDate: '2025-01-15',
  },
  {
    id: 'acc006',
    name: 'iM 체크카드 ****3847',
    balance: 0,
    type: 'debit_card',
    bank: 'iM뱅크',
    accountNo: null,
    cardNo: '**** **** **** 3847',
    linkedAccountId: 'acc001',
    last4: '3847',
  },
  {
    id: 'acc007',
    name: 'iM 신용카드',
    balance: 0,
    type: 'credit_card',
    bank: 'iM뱅크',
    accountNo: null,
    isPromo: true,
  },
]

// ──────────────────────────────────────────────
// 연락처 — 실명+계좌 기반 (닉네임 없음)
// ──────────────────────────────────────────────
export const contacts = [
  { id: 'c001', realName: '김영희',      bank: '국민은행',    accountNo: '110-234-567890' },
  { id: 'c002', realName: '김철호',      bank: '신한은행',    accountNo: '110-345-678901' },
  { id: 'c003', realName: '김철수',      bank: '하나은행',    accountNo: '130-456-789012' },
  { id: 'c004', realName: '이민지',      bank: '카카오뱅크',  accountNo: '333-78-9012345' },
  { id: 'c005', realName: '(주)ABC테크', bank: '기업은행',    accountNo: '110-567-890123' },
  { id: 'c006', realName: '김민준',      bank: '토스뱅크',    accountNo: '100-10-123456'  },
  { id: 'c007', realName: '박지수',      bank: '신한은행',    accountNo: '110-678-901234' },
  { id: 'c008', realName: '최현우',      bank: '우리은행',    accountNo: '1002-345-678901'},
  { id: 'c009', realName: '이순자',      bank: '농협은행',    accountNo: '301-1234-5678-01'},
  { id: 'c010', realName: '파워짐 강남점', bank: '국민은행',  accountNo: '110-789-012345' },
  { id: 'c011', realName: '박상철',      bank: '신한은행',    accountNo: '110-890-123456' },
  { id: 'c012', realName: '정세영',      bank: '카카오뱅크',  accountNo: '333-90-1234567' },
  { id: 'c013', realName: '오승훈',      bank: '토스뱅크',    accountNo: '100-20-234567'  },
  { id: 'c014', realName: '김수진',      bank: '하나은행',    accountNo: '130-567-890123' },
  { id: 'c015', realName: '강남영어학원', bank: '기업은행',   accountNo: '110-901-234567' },
]

// ──────────────────────────────────────────────
// 카드 (마이데이터 연동 포함)
// ──────────────────────────────────────────────
export const cards = [
  {
    id: 'card001',
    name: 'iM 체크카드',
    type: 'debit',
    issuer: 'iM뱅크',
    last4: '3847',
    linkedAccountId: 'acc001',
    source: 'own',
  },
]

// ──────────────────────────────────────────────
// 은행 계좌 거래내역
// — 카드 개별 구매는 포함하지 않음
// — 급여·자동이체·송금·이자 등 계좌 직접 거래만 기록
// ──────────────────────────────────────────────
function d(offsetDays) {
  const dt = new Date()
  dt.setDate(dt.getDate() - offsetDays)
  return dt.toISOString().slice(0, 10)
}

export let transactions = [
  // ── 3월 (이번 달) ─────────────────────────────
  { id: 't001', date: d(5),  amount: 3000000,  category: '급여',    counterpart: '(주)ABC테크',       accountId: 'acc001', source: 'account' },
  { id: 't002', date: d(5),  amount: -300000,  category: '자동이체', counterpart: 'iM 정기적금',       accountId: 'acc001', source: 'account' },
  { id: 't003', date: d(5),  amount: -485000,  category: '카드대금', counterpart: 'iM 체크카드 결제 합계', accountId: 'acc001', source: 'account' },
  { id: 't004', date: d(5),  amount: -150000,  category: '자동이체', counterpart: 'iM CMA 자동이체',  accountId: 'acc001', source: 'account' },
  { id: 't005', date: d(7),  amount: -320000,  category: '자동이체', counterpart: '아파트 관리비',     accountId: 'acc001', source: 'account' },
  { id: 't006', date: d(10), amount: -80000,   category: '자동이체', counterpart: '파워짐 강남점',     accountId: 'acc001', source: 'account' },
  { id: 't007', date: d(12), amount: -52400,   category: '자동이체', counterpart: '한국전력 전기요금', accountId: 'acc001', source: 'account' },
  { id: 't008', date: d(13), amount: -18700,   category: '자동이체', counterpart: '서울도시가스',      accountId: 'acc001', source: 'account' },
  { id: 't009', date: d(15), amount: -19800,   category: '자동이체', counterpart: 'SKT 통신요금',      accountId: 'acc001', source: 'account' },
  { id: 't010', date: d(15), amount: -25000,   category: '자동이체', counterpart: '삼성생명 보험료',   accountId: 'acc001', source: 'account' },
  { id: 't011', date: d(15), amount: -65000,   category: '자동이체', counterpart: '강남영어학원',      accountId: 'acc001', source: 'account' },
  { id: 't012', date: d(15), amount: -139230,  category: '자동이체', counterpart: '국민건강보험공단',  accountId: 'acc001', source: 'account' },
  { id: 't013', date: d(9),  amount: -100000,  category: '송금',    counterpart: '김영희',            accountId: 'acc001', source: 'account' },
  { id: 't014', date: d(11), amount: -50000,   category: '송금',    counterpart: '박지수',            accountId: 'acc001', source: 'account' },
  { id: 't015', date: d(16), amount: -30000,   category: '송금',    counterpart: '김민준',            accountId: 'acc001', source: 'account' },
  { id: 't016', date: d(8),  amount: -200000,  category: '이체',    counterpart: 'ATM 출금',          accountId: 'acc001', source: 'account' },
  { id: 't017', date: d(14), amount: -200000,  category: '이체',    counterpart: 'ATM 출금',          accountId: 'acc001', source: 'account' },
  { id: 't018', date: d(3),  amount: 9200,     category: '이자',    counterpart: 'iM뱅크 이자',       accountId: 'acc001', source: 'account' },
  { id: 't019', date: d(6),  amount: -8900,    category: '자동이체', counterpart: '수도요금 (상수도)',  accountId: 'acc001', source: 'account' },
  { id: 't020', date: d(4),  amount: 150000,   category: '입금',    counterpart: '이민지 (식비 정산)', accountId: 'acc001', source: 'account' },
  { id: 't021', date: d(2),  amount: -55000,   category: '자동이체', counterpart: 'LG유플러스 (홈인터넷)', accountId: 'acc001', source: 'account' },
  { id: 't022', date: d(1),  amount: -45000,   category: '자동이체', counterpart: '쿠팡 로켓와우',     accountId: 'acc001', source: 'account' },

  // ── 2월 ──────────────────────────────────────
  { id: 't030', date: d(33), amount: 3000000,  category: '급여',    counterpart: '(주)ABC테크',       accountId: 'acc001', source: 'account' },
  { id: 't031', date: d(33), amount: -300000,  category: '자동이체', counterpart: 'iM 정기적금',       accountId: 'acc001', source: 'account' },
  { id: 't032', date: d(33), amount: -462000,  category: '카드대금', counterpart: 'iM 체크카드 결제 합계', accountId: 'acc001', source: 'account' },
  { id: 't033', date: d(33), amount: -150000,  category: '자동이체', counterpart: 'iM CMA 자동이체',  accountId: 'acc001', source: 'account' },
  { id: 't034', date: d(35), amount: -320000,  category: '자동이체', counterpart: '아파트 관리비',     accountId: 'acc001', source: 'account' },
  { id: 't035', date: d(38), amount: -80000,   category: '자동이체', counterpart: '파워짐 강남점',     accountId: 'acc001', source: 'account' },
  { id: 't036', date: d(40), amount: -48600,   category: '자동이체', counterpart: '한국전력 전기요금', accountId: 'acc001', source: 'account' },
  { id: 't037', date: d(41), amount: -22400,   category: '자동이체', counterpart: '서울도시가스',      accountId: 'acc001', source: 'account' },
  { id: 't038', date: d(43), amount: -19800,   category: '자동이체', counterpart: 'SKT 통신요금',      accountId: 'acc001', source: 'account' },
  { id: 't039', date: d(43), amount: -25000,   category: '자동이체', counterpart: '삼성생명 보험료',   accountId: 'acc001', source: 'account' },
  { id: 't040', date: d(43), amount: -65000,   category: '자동이체', counterpart: '강남영어학원',      accountId: 'acc001', source: 'account' },
  { id: 't041', date: d(43), amount: -139230,  category: '자동이체', counterpart: '국민건강보험공단',  accountId: 'acc001', source: 'account' },
  { id: 't042', date: d(37), amount: -50000,   category: '송금',    counterpart: '김영희',            accountId: 'acc001', source: 'account' },
  { id: 't043', date: d(39), amount: -80000,   category: '송금',    counterpart: '최현우',            accountId: 'acc001', source: 'account' },
  { id: 't044', date: d(44), amount: -50000,   category: '송금',    counterpart: '김철수',            accountId: 'acc001', source: 'account' },
  { id: 't045', date: d(36), amount: -300000,  category: '이체',    counterpart: 'ATM 출금',          accountId: 'acc001', source: 'account' },
  { id: 't046', date: d(46), amount: -200000,  category: '이체',    counterpart: 'ATM 출금',          accountId: 'acc001', source: 'account' },
  { id: 't047', date: d(31), amount: 8900,     category: '이자',    counterpart: 'iM뱅크 이자',       accountId: 'acc001', source: 'account' },
  { id: 't048', date: d(34), amount: -8900,    category: '자동이체', counterpart: '수도요금 (상수도)',  accountId: 'acc001', source: 'account' },
  { id: 't049', date: d(45), amount: -55000,   category: '자동이체', counterpart: 'LG유플러스 (홈인터넷)', accountId: 'acc001', source: 'account' },
  { id: 't050', date: d(42), amount: -45000,   category: '자동이체', counterpart: '쿠팡 로켓와우',     accountId: 'acc001', source: 'account' },
  { id: 't051', date: d(47), amount: -120000,  category: '자동이체', counterpart: '현대캐피탈 스마트폰 할부', accountId: 'acc001', source: 'account' },
  { id: 't052', date: d(32), amount: 200000,   category: '입금',    counterpart: '정세영 (더치페이)',  accountId: 'acc001', source: 'account' },

  // ── 1월 ──────────────────────────────────────
  { id: 't060', date: d(64), amount: 3000000,  category: '급여',    counterpart: '(주)ABC테크',       accountId: 'acc001', source: 'account' },
  { id: 't061', date: d(64), amount: -300000,  category: '자동이체', counterpart: 'iM 정기적금',       accountId: 'acc001', source: 'account' },
  { id: 't062', date: d(64), amount: -511000,  category: '카드대금', counterpart: 'iM 체크카드 결제 합계', accountId: 'acc001', source: 'account' },
  { id: 't063', date: d(64), amount: -150000,  category: '자동이체', counterpart: 'iM CMA 자동이체',  accountId: 'acc001', source: 'account' },
  { id: 't064', date: d(64), amount: 500000,   category: '입금',    counterpart: '(주)ABC테크 성과급', accountId: 'acc001', source: 'account' },
  { id: 't065', date: d(66), amount: -320000,  category: '자동이체', counterpart: '아파트 관리비',     accountId: 'acc001', source: 'account' },
  { id: 't066', date: d(69), amount: -80000,   category: '자동이체', counterpart: '파워짐 강남점',     accountId: 'acc001', source: 'account' },
  { id: 't067', date: d(71), amount: -61200,   category: '자동이체', counterpart: '한국전력 전기요금', accountId: 'acc001', source: 'account' },
  { id: 't068', date: d(72), amount: -24500,   category: '자동이체', counterpart: '서울도시가스',      accountId: 'acc001', source: 'account' },
  { id: 't069', date: d(74), amount: -19800,   category: '자동이체', counterpart: 'SKT 통신요금',      accountId: 'acc001', source: 'account' },
  { id: 't070', date: d(74), amount: -25000,   category: '자동이체', counterpart: '삼성생명 보험료',   accountId: 'acc001', source: 'account' },
  { id: 't071', date: d(74), amount: -65000,   category: '자동이체', counterpart: '강남영어학원',      accountId: 'acc001', source: 'account' },
  { id: 't072', date: d(74), amount: -139230,  category: '자동이체', counterpart: '국민건강보험공단',  accountId: 'acc001', source: 'account' },
  { id: 't073', date: d(68), amount: -100000,  category: '송금',    counterpart: '김영희',            accountId: 'acc001', source: 'account' },
  { id: 't074', date: d(70), amount: -70000,   category: '송금',    counterpart: '이민지',            accountId: 'acc001', source: 'account' },
  { id: 't075', date: d(75), amount: -30000,   category: '송금',    counterpart: '김민준',            accountId: 'acc001', source: 'account' },
  { id: 't076', date: d(67), amount: -200000,  category: '이체',    counterpart: 'ATM 출금',          accountId: 'acc001', source: 'account' },
  { id: 't077', date: d(78), amount: -300000,  category: '이체',    counterpart: 'ATM 출금',          accountId: 'acc001', source: 'account' },
  { id: 't078', date: d(62), amount: 8600,     category: '이자',    counterpart: 'iM뱅크 이자',       accountId: 'acc001', source: 'account' },
  { id: 't079', date: d(65), amount: -8900,    category: '자동이체', counterpart: '수도요금 (상수도)',  accountId: 'acc001', source: 'account' },
  { id: 't080', date: d(76), amount: -55000,   category: '자동이체', counterpart: 'LG유플러스 (홈인터넷)', accountId: 'acc001', source: 'account' },
  { id: 't081', date: d(73), amount: -120000,  category: '자동이체', counterpart: '현대캐피탈 스마트폰 할부', accountId: 'acc001', source: 'account' },
  { id: 't082', date: d(63), amount: -45000,   category: '자동이체', counterpart: '쿠팡 로켓와우',     accountId: 'acc001', source: 'account' },

  // ── 12월 ──────────────────────────────────────
  { id: 't090', date: d(94),  amount: 3200000, category: '급여',    counterpart: '(주)ABC테크',        accountId: 'acc001', source: 'account' },
  { id: 't091', date: d(94),  amount: -300000, category: '자동이체', counterpart: 'iM 정기적금',        accountId: 'acc001', source: 'account' },
  { id: 't092', date: d(94),  amount: -538000, category: '카드대금', counterpart: 'iM 체크카드 결제 합계', accountId: 'acc001', source: 'account' },
  { id: 't093', date: d(94),  amount: -150000, category: '자동이체', counterpart: 'iM CMA 자동이체',   accountId: 'acc001', source: 'account' },
  { id: 't094', date: d(96),  amount: -320000, category: '자동이체', counterpart: '아파트 관리비',      accountId: 'acc001', source: 'account' },
  { id: 't095', date: d(99),  amount: -80000,  category: '자동이체', counterpart: '파워짐 강남점',      accountId: 'acc001', source: 'account' },
  { id: 't096', date: d(101), amount: -68500,  category: '자동이체', counterpart: '한국전력 전기요금',  accountId: 'acc001', source: 'account' },
  { id: 't097', date: d(102), amount: -28000,  category: '자동이체', counterpart: '서울도시가스',       accountId: 'acc001', source: 'account' },
  { id: 't098', date: d(104), amount: -19800,  category: '자동이체', counterpart: 'SKT 통신요금',       accountId: 'acc001', source: 'account' },
  { id: 't099', date: d(104), amount: -25000,  category: '자동이체', counterpart: '삼성생명 보험료',    accountId: 'acc001', source: 'account' },
  { id: 't100', date: d(104), amount: -65000,  category: '자동이체', counterpart: '강남영어학원',       accountId: 'acc001', source: 'account' },
  { id: 't101', date: d(104), amount: -139230, category: '자동이체', counterpart: '국민건강보험공단',   accountId: 'acc001', source: 'account' },
  { id: 't102', date: d(98),  amount: -100000, category: '송금',    counterpart: '김영희',             accountId: 'acc001', source: 'account' },
  { id: 't103', date: d(98),  amount: -50000,  category: '송금',    counterpart: '김철호',             accountId: 'acc001', source: 'account' },
  { id: 't104', date: d(106), amount: -30000,  category: '송금',    counterpart: '박지수',             accountId: 'acc001', source: 'account' },
  { id: 't105', date: d(97),  amount: -300000, category: '이체',    counterpart: 'ATM 출금',           accountId: 'acc001', source: 'account' },
  { id: 't106', date: d(92),  amount: 8300,    category: '이자',    counterpart: 'iM뱅크 이자',        accountId: 'acc001', source: 'account' },
  { id: 't107', date: d(95),  amount: -8900,   category: '자동이체', counterpart: '수도요금 (상수도)',   accountId: 'acc001', source: 'account' },
  { id: 't108', date: d(105), amount: -55000,  category: '자동이체', counterpart: 'LG유플러스 (홈인터넷)', accountId: 'acc001', source: 'account' },
  { id: 't109', date: d(103), amount: -120000, category: '자동이체', counterpart: '현대캐피탈 스마트폰 할부', accountId: 'acc001', source: 'account' },
  { id: 't110', date: d(93),  amount: -45000,  category: '자동이체', counterpart: '쿠팡 로켓와우',      accountId: 'acc001', source: 'account' },
  { id: 't111', date: d(107), amount: 500000,  category: '입금',    counterpart: '오승훈 (연말 정산 공동 환급)', accountId: 'acc001', source: 'account' },

  // ── 11월 ──────────────────────────────────────
  { id: 't120', date: d(124), amount: 3000000, category: '급여',    counterpart: '(주)ABC테크',        accountId: 'acc001', source: 'account' },
  { id: 't121', date: d(124), amount: -300000, category: '자동이체', counterpart: 'iM 정기적금',        accountId: 'acc001', source: 'account' },
  { id: 't122', date: d(124), amount: -492000, category: '카드대금', counterpart: 'iM 체크카드 결제 합계', accountId: 'acc001', source: 'account' },
  { id: 't123', date: d(126), amount: -320000, category: '자동이체', counterpart: '아파트 관리비',      accountId: 'acc001', source: 'account' },
  { id: 't124', date: d(129), amount: -80000,  category: '자동이체', counterpart: '파워짐 강남점',      accountId: 'acc001', source: 'account' },
  { id: 't125', date: d(131), amount: -51200,  category: '자동이체', counterpart: '한국전력 전기요금',  accountId: 'acc001', source: 'account' },
  { id: 't126', date: d(132), amount: -21000,  category: '자동이체', counterpart: '서울도시가스',       accountId: 'acc001', source: 'account' },
  { id: 't127', date: d(134), amount: -19800,  category: '자동이체', counterpart: 'SKT 통신요금',       accountId: 'acc001', source: 'account' },
  { id: 't128', date: d(134), amount: -25000,  category: '자동이체', counterpart: '삼성생명 보험료',    accountId: 'acc001', source: 'account' },
  { id: 't129', date: d(134), amount: -65000,  category: '자동이체', counterpart: '강남영어학원',       accountId: 'acc001', source: 'account' },
  { id: 't130', date: d(134), amount: -139230, category: '자동이체', counterpart: '국민건강보험공단',   accountId: 'acc001', source: 'account' },
  { id: 't131', date: d(128), amount: -50000,  category: '송금',    counterpart: '김영희',             accountId: 'acc001', source: 'account' },
  { id: 't132', date: d(130), amount: -100000, category: '송금',    counterpart: '이순자',             accountId: 'acc001', source: 'account' },
  { id: 't133', date: d(127), amount: -200000, category: '이체',    counterpart: 'ATM 출금',           accountId: 'acc001', source: 'account' },
  { id: 't134', date: d(122), amount: 8000,    category: '이자',    counterpart: 'iM뱅크 이자',        accountId: 'acc001', source: 'account' },
  { id: 't135', date: d(125), amount: -8900,   category: '자동이체', counterpart: '수도요금 (상수도)',   accountId: 'acc001', source: 'account' },
  { id: 't136', date: d(135), amount: -55000,  category: '자동이체', counterpart: 'LG유플러스 (홈인터넷)', accountId: 'acc001', source: 'account' },
  { id: 't137', date: d(133), amount: -120000, category: '자동이체', counterpart: '현대캐피탈 스마트폰 할부', accountId: 'acc001', source: 'account' },
  { id: 't138', date: d(123), amount: -45000,  category: '자동이체', counterpart: '쿠팡 로켓와우',      accountId: 'acc001', source: 'account' },

  // ── 10월 ──────────────────────────────────────
  { id: 't150', date: d(155), amount: 3000000, category: '급여',    counterpart: '(주)ABC테크',        accountId: 'acc001', source: 'account' },
  { id: 't151', date: d(155), amount: -300000, category: '자동이체', counterpart: 'iM 정기적금',        accountId: 'acc001', source: 'account' },
  { id: 't152', date: d(155), amount: -445000, category: '카드대금', counterpart: 'iM 체크카드 결제 합계', accountId: 'acc001', source: 'account' },
  { id: 't153', date: d(157), amount: -320000, category: '자동이체', counterpart: '아파트 관리비',      accountId: 'acc001', source: 'account' },
  { id: 't154', date: d(160), amount: -80000,  category: '자동이체', counterpart: '파워짐 강남점',      accountId: 'acc001', source: 'account' },
  { id: 't155', date: d(162), amount: -44800,  category: '자동이체', counterpart: '한국전력 전기요금',  accountId: 'acc001', source: 'account' },
  { id: 't156', date: d(163), amount: -15200,  category: '자동이체', counterpart: '서울도시가스',       accountId: 'acc001', source: 'account' },
  { id: 't157', date: d(165), amount: -19800,  category: '자동이체', counterpart: 'SKT 통신요금',       accountId: 'acc001', source: 'account' },
  { id: 't158', date: d(165), amount: -25000,  category: '자동이체', counterpart: '삼성생명 보험료',    accountId: 'acc001', source: 'account' },
  { id: 't159', date: d(165), amount: -65000,  category: '자동이체', counterpart: '강남영어학원',       accountId: 'acc001', source: 'account' },
  { id: 't160', date: d(165), amount: -139230, category: '자동이체', counterpart: '국민건강보험공단',   accountId: 'acc001', source: 'account' },
  { id: 't161', date: d(159), amount: -100000, category: '송금',    counterpart: '김영희',             accountId: 'acc001', source: 'account' },
  { id: 't162', date: d(161), amount: -30000,  category: '송금',    counterpart: '김민준',             accountId: 'acc001', source: 'account' },
  { id: 't163', date: d(166), amount: -50000,  category: '송금',    counterpart: '박상철',             accountId: 'acc001', source: 'account' },
  { id: 't164', date: d(158), amount: -200000, category: '이체',    counterpart: 'ATM 출금',           accountId: 'acc001', source: 'account' },
  { id: 't165', date: d(153), amount: 7800,    category: '이자',    counterpart: 'iM뱅크 이자',        accountId: 'acc001', source: 'account' },
  { id: 't166', date: d(156), amount: -8900,   category: '자동이체', counterpart: '수도요금 (상수도)',   accountId: 'acc001', source: 'account' },
  { id: 't167', date: d(166), amount: -55000,  category: '자동이체', counterpart: 'LG유플러스 (홈인터넷)', accountId: 'acc001', source: 'account' },
  { id: 't168', date: d(164), amount: -120000, category: '자동이체', counterpart: '현대캐피탈 스마트폰 할부', accountId: 'acc001', source: 'account' },
  { id: 't169', date: d(154), amount: -45000,  category: '자동이체', counterpart: '쿠팡 로켓와우',      accountId: 'acc001', source: 'account' },

  // ── 정기적금 납입·이자 (2025-04 ~ 2026-03, 12개월) ──
  { id: 't200', date: d(3),   amount: 1050,    category: '이자',    counterpart: 'iM 정기적금 이자',   accountId: 'acc002', source: 'account' },
  { id: 't201', date: d(33),  amount: 1050,    category: '이자',    counterpart: 'iM 정기적금 이자',   accountId: 'acc002', source: 'account' },
  { id: 't202', date: d(64),  amount: 1050,    category: '이자',    counterpart: 'iM 정기적금 이자',   accountId: 'acc002', source: 'account' },
  { id: 't203', date: d(5),   amount: 300000,  category: '납입',    counterpart: '주계좌 자동이체',    accountId: 'acc002', source: 'account' },
  { id: 't204', date: d(33),  amount: 300000,  category: '납입',    counterpart: '주계좌 자동이체',    accountId: 'acc002', source: 'account' },
  { id: 't205', date: d(64),  amount: 300000,  category: '납입',    counterpart: '주계좌 자동이체',    accountId: 'acc002', source: 'account' },
  { id: 't206', date: d(94),  amount: 300000,  category: '납입',    counterpart: '주계좌 자동이체',    accountId: 'acc002', source: 'account' },
  { id: 't207', date: d(124), amount: 300000,  category: '납입',    counterpart: '주계좌 자동이체',    accountId: 'acc002', source: 'account' },
  { id: 't208', date: d(155), amount: 300000,  category: '납입',    counterpart: '주계좌 자동이체',    accountId: 'acc002', source: 'account' },
  { id: 't209', date: d(184), amount: 300000,  category: '납입',    counterpart: '주계좌 자동이체',    accountId: 'acc002', source: 'account' },
  { id: 't215', date: d(215), amount: 300000,  category: '납입',    counterpart: '주계좌 자동이체',    accountId: 'acc002', source: 'account' },
  { id: 't216', date: d(246), amount: 300000,  category: '납입',    counterpart: '주계좌 자동이체',    accountId: 'acc002', source: 'account' },
  { id: 't217', date: d(276), amount: 300000,  category: '납입',    counterpart: '주계좌 자동이체',    accountId: 'acc002', source: 'account' },
  { id: 't218', date: d(307), amount: 300000,  category: '납입',    counterpart: '주계좌 자동이체',    accountId: 'acc002', source: 'account' },
  { id: 't219', date: d(337), amount: 300000,  category: '납입',    counterpart: '주계좌 자동이체',    accountId: 'acc002', source: 'account' },
  { id: 't230', date: d(337), amount: 300000,  category: '개설입금', counterpart: '적금 개설 첫 납입', accountId: 'acc002', source: 'account' },

  // ── 정기예금 개설 (2025-09-15) ────────────────────
  { id: 't240', date: d(191), amount: 10000000, category: '예금개설', counterpart: 'iM 정기예금 개설 입금', accountId: 'acc003', source: 'account' },

  // ── 비상금통장 이자 ────────────────────────────
  { id: 't210', date: d(3),   amount: 5000,    category: '이자',    counterpart: 'iM뱅크 이자',        accountId: 'acc004', source: 'account' },
  { id: 't211', date: d(33),  amount: 5000,    category: '이자',    counterpart: 'iM뱅크 이자',        accountId: 'acc004', source: 'account' },
  { id: 't212', date: d(64),  amount: 5000,    category: '이자',    counterpart: 'iM뱅크 이자',        accountId: 'acc004', source: 'account' },
  { id: 't213', date: d(94),  amount: 5000,    category: '이자',    counterpart: 'iM뱅크 이자',        accountId: 'acc004', source: 'account' },
  { id: 't214', date: d(2),   amount: -500000, category: '이체',    counterpart: '주계좌 인출',        accountId: 'acc004', source: 'account' },

  // ── CMA 입출 ────────────────────────────────
  { id: 't220', date: d(3),   amount: 15100,   category: '이자',    counterpart: 'iM CMA 이자',        accountId: 'acc005', source: 'account' },
  { id: 't221', date: d(33),  amount: 14800,   category: '이자',    counterpart: 'iM CMA 이자',        accountId: 'acc005', source: 'account' },
  { id: 't222', date: d(5),   amount: 150000,  category: '이체',    counterpart: '주계좌 입금',        accountId: 'acc005', source: 'account' },
  { id: 't223', date: d(33),  amount: 150000,  category: '이체',    counterpart: '주계좌 입금',        accountId: 'acc005', source: 'account' },
  { id: 't224', date: d(64),  amount: 150000,  category: '이체',    counterpart: '주계좌 입금',        accountId: 'acc005', source: 'account' },
  // ── iM 체크카드 사용내역 (acc006) ──────────────
  { id: 'dc001', date: d(0),  amount: -8500,   category: '카페',  counterpart: '스타벅스 강남점',    accountId: 'acc006', source: 'card' },
  { id: 'dc002', date: d(1),  amount: -4200,   category: '편의점', counterpart: '이마트24',           accountId: 'acc006', source: 'card' },
  { id: 'dc003', date: d(1),  amount: -6000,   category: '식비',  counterpart: '김밥천국',            accountId: 'acc006', source: 'card' },
  { id: 'dc004', date: d(1),  amount: -4800,   category: '교통',  counterpart: '카카오택시',          accountId: 'acc006', source: 'card' },
  { id: 'dc005', date: d(2),  amount: -4500,   category: '카페',  counterpart: '이디야커피 역삼점',   accountId: 'acc006', source: 'card' },
  { id: 'dc006', date: d(2),  amount: -45000,  category: '쇼핑',  counterpart: '쿠팡',                accountId: 'acc006', source: 'card' },
  { id: 'dc007', date: d(3),  amount: -2500,   category: '카페',  counterpart: '메가MGC커피',         accountId: 'acc006', source: 'card' },
  { id: 'dc008', date: d(3),  amount: -9500,   category: '식비',  counterpart: '롯데리아',             accountId: 'acc006', source: 'card' },
  { id: 'dc009', date: d(4),  amount: -7000,   category: '카페',  counterpart: '스타벅스 선릉점',     accountId: 'acc006', source: 'card' },
  { id: 'dc010', date: d(4),  amount: -38000,  category: '쇼핑',  counterpart: '올리브영 강남점',     accountId: 'acc006', source: 'card' },
  { id: 'dc011', date: d(5),  amount: -11500,  category: '식비',  counterpart: '맥도날드 역삼점',     accountId: 'acc006', source: 'card' },
  { id: 'dc012', date: d(6),  amount: -8500,   category: '카페',  counterpart: '투썸플레이스',        accountId: 'acc006', source: 'card' },
  { id: 'dc013', date: d(6),  amount: -5600,   category: '편의점', counterpart: 'GS25 역삼점',        accountId: 'acc006', source: 'card' },
  { id: 'dc014', date: d(7),  amount: -5500,   category: '카페',  counterpart: '할리스커피',          accountId: 'acc006', source: 'card' },
  { id: 'dc015', date: d(7),  amount: -15000,  category: '문화',  counterpart: 'CGV 강남',            accountId: 'acc006', source: 'card' },
  { id: 'dc016', date: d(8),  amount: -28000,  category: '식비',  counterpart: '이자카야 료칸',       accountId: 'acc006', source: 'card' },
  { id: 'dc017', date: d(9),  amount: -9000,   category: '카페',  counterpart: '스타벅스 강남점',     accountId: 'acc006', source: 'card' },
  { id: 'dc018', date: d(9),  amount: -78000,  category: '쇼핑',  counterpart: '쿠팡',                accountId: 'acc006', source: 'card' },
  { id: 'dc019', date: d(10), amount: -14000,  category: '식비',  counterpart: '한식뷔페 대성',       accountId: 'acc006', source: 'card' },
  { id: 'dc020', date: d(11), amount: -4800,   category: '카페',  counterpart: '이디야커피',          accountId: 'acc006', source: 'card' },
  { id: 'dc021', date: d(12), amount: -32000,  category: '식비',  counterpart: '배달의민족',          accountId: 'acc006', source: 'card' },
  { id: 'dc022', date: d(13), amount: -6500,   category: '교통',  counterpart: '카카오택시',          accountId: 'acc006', source: 'card' },
  { id: 'dc023', date: d(14), amount: -12000,  category: '문화',  counterpart: 'CGV 코엑스',          accountId: 'acc006', source: 'card' },
  // ── 전월 사용내역 ───────────────────────────────
  { id: 'dc031', date: d(33), amount: -4800,   category: '카페',  counterpart: '스타벅스 강남점',     accountId: 'acc006', source: 'card' },
  { id: 'dc032', date: d(35), amount: -28000,  category: '식비',  counterpart: '배달의민족',          accountId: 'acc006', source: 'card' },
  { id: 'dc033', date: d(37), amount: -9500,   category: '편의점', counterpart: 'CU 편의점',          accountId: 'acc006', source: 'card' },
  { id: 'dc034', date: d(39), amount: -5500,   category: '카페',  counterpart: '투썸플레이스',        accountId: 'acc006', source: 'card' },
  { id: 'dc035', date: d(40), amount: -55000,  category: '식비',  counterpart: '아웃백 스테이크하우스', accountId: 'acc006', source: 'card' },
  { id: 'dc036', date: d(42), amount: -6200,   category: '교통',  counterpart: '카카오택시',          accountId: 'acc006', source: 'card' },
  { id: 'dc037', date: d(44), amount: -4500,   category: '카페',  counterpart: '이디야커피',          accountId: 'acc006', source: 'card' },
  { id: 'dc038', date: d(46), amount: -15000,  category: '문화',  counterpart: 'CGV 강남점',          accountId: 'acc006', source: 'card' },
  { id: 'dc039', date: d(47), amount: -42000,  category: '쇼핑',  counterpart: '다이소 강남점',       accountId: 'acc006', source: 'card' },
  { id: 'dc040', date: d(48), amount: -8500,   category: '카페',  counterpart: '스타벅스 삼성점',     accountId: 'acc006', source: 'card' },
]

// ──────────────────────────────────────────────
// 카드 거래내역 (마이데이터 포함)
// — merchant: 가맹점명만 (품목 상세 불명)
// — inferredCategory: 가맹점 기반 추정 (부정확 가능)
// — categoryNote: 분류 불확실 시 명시
// ──────────────────────────────────────────────
function cd(offsetDays, hour = 12, min = 0) {
  const dt = new Date()
  dt.setDate(dt.getDate() - offsetDays)
  return {
    date: dt.toISOString().slice(0, 10),
    time: `${String(hour).padStart(2,'0')}:${String(min).padStart(2,'0')}`,
  }
}

export let cardTransactions = [

  // ════════════════════════════════════════════
  // 3월 — iM 체크카드 (card001)
  // ════════════════════════════════════════════
  { id: 'ct001', ...cd(0,8,32),   cardId: 'card001', merchant: '스타벅스 강남점',    inferredCategory: '카페',  categoryNote: null,                         amount: -8500  },
  { id: 'ct002', ...cd(0,12,15),  cardId: 'card001', merchant: '이마트24',            inferredCategory: '편의점', categoryNote: null,                        amount: -4200  },
  { id: 'ct003', ...cd(1,13,20),  cardId: 'card001', merchant: '김밥천국',            inferredCategory: '식비',  categoryNote: null,                         amount: -6000  },
  { id: 'ct004', ...cd(1,19,45),  cardId: 'card001', merchant: '카카오택시',          inferredCategory: '교통',  categoryNote: null,                         amount: -4800  },
  { id: 'ct005', ...cd(2,8,55),   cardId: 'card001', merchant: '이디야커피 역삼점',   inferredCategory: '카페',  categoryNote: null,                         amount: -4500  },
  { id: 'ct006', ...cd(2,20,10),  cardId: 'card001', merchant: '쿠팡',                inferredCategory: '쇼핑',  categoryNote: '품목 불명 (온라인 종합몰)',   amount: -45000 },
  { id: 'ct007', ...cd(3,7,30),   cardId: 'card001', merchant: '메가MGC커피',         inferredCategory: '카페',  categoryNote: null,                         amount: -2500  },
  { id: 'ct008', ...cd(3,12,40),  cardId: 'card001', merchant: '롯데리아',             inferredCategory: '식비',  categoryNote: null,                        amount: -9500  },
  { id: 'ct009', ...cd(4,8,20),   cardId: 'card001', merchant: '스타벅스 선릉점',     inferredCategory: '카페',  categoryNote: null,                         amount: -7000  },
  { id: 'ct010', ...cd(4,18,30),  cardId: 'card001', merchant: '올리브영 강남점',     inferredCategory: '쇼핑',  categoryNote: '화장품·생활용품 혼재',       amount: -38000 },
  { id: 'ct011', ...cd(5,12,0),   cardId: 'card001', merchant: '맥도날드 역삼점',     inferredCategory: '식비',  categoryNote: null,                         amount: -11500 },
  { id: 'ct012', ...cd(6,9,10),   cardId: 'card001', merchant: '투썸플레이스',        inferredCategory: '카페',  categoryNote: null,                         amount: -8500  },
  { id: 'ct013', ...cd(6,14,20),  cardId: 'card001', merchant: 'GS25 역삼점',         inferredCategory: '편의점', categoryNote: null,                        amount: -5600  },
  { id: 'ct014', ...cd(7,8,45),   cardId: 'card001', merchant: '할리스커피',          inferredCategory: '카페',  categoryNote: null,                         amount: -5500  },
  { id: 'ct015', ...cd(7,19,0),   cardId: 'card001', merchant: 'CGV 강남',            inferredCategory: '문화',  categoryNote: null,                         amount: -15000 },
  { id: 'ct016', ...cd(8,12,30),  cardId: 'card001', merchant: '이자카야 료칸',       inferredCategory: '식비',  categoryNote: null,                         amount: -28000 },
  { id: 'ct017', ...cd(9,8,15),   cardId: 'card001', merchant: '스타벅스 강남점',     inferredCategory: '카페',  categoryNote: null,                         amount: -9000  },
  { id: 'ct018', ...cd(9,14,0),   cardId: 'card001', merchant: '쿠팡',                inferredCategory: '쇼핑',  categoryNote: '품목 불명 (온라인 종합몰)',   amount: -78000 },
  { id: 'ct019', ...cd(10,12,40), cardId: 'card001', merchant: '한식뷔페 대성',       inferredCategory: '식비',  categoryNote: null,                         amount: -14000 },
  { id: 'ct020', ...cd(11,8,20),  cardId: 'card001', merchant: 'T-money 충전',        inferredCategory: '교통',  categoryNote: null,                         amount: -20000 },
  { id: 'ct021', ...cd(12,9,0),   cardId: 'card001', merchant: '메가MGC커피',         inferredCategory: '카페',  categoryNote: null,                         amount: -2500  },
  { id: 'ct022', ...cd(12,20,30), cardId: 'card001', merchant: '배달의민족',          inferredCategory: '식비',  categoryNote: '음식 배달 (메뉴 불명)',       amount: -22000 },
  { id: 'ct023', ...cd(13,13,15), cardId: 'card001', merchant: '무신사',              inferredCategory: '쇼핑',  categoryNote: null,                         amount: -65000 },
  { id: 'ct024', ...cd(14,8,30),  cardId: 'card001', merchant: '이디야커피 강남점',   inferredCategory: '카페',  categoryNote: null,                         amount: -4500  },
  { id: 'ct025', ...cd(14,18,0),  cardId: 'card001', merchant: '서울내과의원',        inferredCategory: '의료',  categoryNote: null,                         amount: -15000 },
  { id: 'ct026', ...cd(15,12,20), cardId: 'card001', merchant: '고기집 삼겹살',       inferredCategory: '식비',  categoryNote: null,                         amount: -35000 },
  { id: 'ct027', ...cd(16,9,10),  cardId: 'card001', merchant: '스타벅스 삼성점',     inferredCategory: '카페',  categoryNote: null,                         amount: -7500  },
  { id: 'ct028', ...cd(17,14,30), cardId: 'card001', merchant: '네이버페이 온라인',   inferredCategory: '쇼핑',  categoryNote: '품목 불명 (온라인 결제)',     amount: -32000 },
  { id: 'ct029', ...cd(18,8,0),   cardId: 'card001', merchant: '할리스커피',          inferredCategory: '카페',  categoryNote: null,                         amount: -5500  },
  { id: 'ct030', ...cd(19,12,45), cardId: 'card001', merchant: '중식당 신용루',       inferredCategory: '식비',  categoryNote: null,                         amount: -18000 },
  { id: 'ct031', ...cd(20,8,30),  cardId: 'card001', merchant: '메가MGC커피',         inferredCategory: '카페',  categoryNote: null,                         amount: -2500  },
  { id: 'ct032', ...cd(21,19,0),  cardId: 'card001', merchant: '다이소 강남점',       inferredCategory: '쇼핑',  categoryNote: null,                         amount: -12000 },
  { id: 'ct033', ...cd(22,12,30), cardId: 'card001', merchant: '피자헛',              inferredCategory: '식비',  categoryNote: null,                         amount: -28000 },

  // 3월 — 신한카드 (card002 · 마이데이터)
  { id: 'ct034', ...cd(1,10,30),  cardId: 'card001', merchant: '애플 앱스토어',       inferredCategory: '구독',  categoryNote: '앱·구독 혼재',               amount: -9900  },
  { id: 'ct035', ...cd(2,14,0),   cardId: 'card001', merchant: '넷플릭스',            inferredCategory: '구독',  categoryNote: null,                         amount: -13900 },
  { id: 'ct036', ...cd(5,10,0),   cardId: 'card001', merchant: '유튜브 프리미엄',     inferredCategory: '구독',  categoryNote: null,                         amount: -14900 },
  { id: 'ct037', ...cd(8,18,30),  cardId: 'card001', merchant: '쿠팡이츠',            inferredCategory: '식비',  categoryNote: '음식 배달 (메뉴 불명)',       amount: -19500 },
  { id: 'ct038', ...cd(11,20,0),  cardId: 'card001', merchant: '지그재그',            inferredCategory: '쇼핑',  categoryNote: null,                         amount: -85000 },
  { id: 'ct039', ...cd(14,12,0),  cardId: 'card001', merchant: '마켓컬리',            inferredCategory: '식비',  categoryNote: '식품·생활용품 혼재',         amount: -67000 },
  { id: 'ct040', ...cd(17,9,30),  cardId: 'card001', merchant: 'GS주유소',            inferredCategory: '교통',  categoryNote: null,                         amount: -60000 },
  { id: 'ct041', ...cd(19,14,0),  cardId: 'card001', merchant: '스포티파이',          inferredCategory: '구독',  categoryNote: null,                         amount: -10900 },
  { id: 'ct042', ...cd(22,11,0),  cardId: 'card001', merchant: '쿠팡',                inferredCategory: '쇼핑',  categoryNote: '품목 불명 (온라인 종합몰)',   amount: -125000},

  // ════════════════════════════════════════════
  // 2월 — iM 체크카드
  // ════════════════════════════════════════════
  { id: 'ct050', ...cd(24,8,30),  cardId: 'card001', merchant: '스타벅스 강남점',     inferredCategory: '카페',  categoryNote: null,                         amount: -8500  },
  { id: 'ct051', ...cd(24,13,0),  cardId: 'card001', merchant: '편의점CU',            inferredCategory: '편의점', categoryNote: null,                        amount: -3200  },
  { id: 'ct052', ...cd(25,12,20), cardId: 'card001', merchant: '서브웨이',            inferredCategory: '식비',  categoryNote: null,                         amount: -8500  },
  { id: 'ct053', ...cd(26,8,45),  cardId: 'card001', merchant: '이디야커피',          inferredCategory: '카페',  categoryNote: null,                         amount: -4500  },
  { id: 'ct054', ...cd(27,14,30), cardId: 'card001', merchant: '쿠팡',                inferredCategory: '쇼핑',  categoryNote: '품목 불명 (온라인 종합몰)',   amount: -52000 },
  { id: 'ct055', ...cd(28,12,0),  cardId: 'card001', merchant: '맥도날드',            inferredCategory: '식비',  categoryNote: null,                         amount: -10500 },
  { id: 'ct056', ...cd(29,9,0),   cardId: 'card001', merchant: '할리스커피',          inferredCategory: '카페',  categoryNote: null,                         amount: -5500  },
  { id: 'ct057', ...cd(30,18,30), cardId: 'card001', merchant: 'CGV 강남',            inferredCategory: '문화',  categoryNote: null,                         amount: -30000 },
  { id: 'ct058', ...cd(31,8,15),  cardId: 'card001', merchant: '스타벅스 역삼점',     inferredCategory: '카페',  categoryNote: null,                         amount: -7000  },
  { id: 'ct059', ...cd(32,12,0),  cardId: 'card001', merchant: '한식당 향',           inferredCategory: '식비',  categoryNote: null,                         amount: -22000 },
  { id: 'ct060', ...cd(33,8,30),  cardId: 'card001', merchant: '메가MGC커피',         inferredCategory: '카페',  categoryNote: null,                         amount: -2500  },
  { id: 'ct061', ...cd(34,11,0),  cardId: 'card001', merchant: '강남치과',            inferredCategory: '의료',  categoryNote: null,                         amount: -62000 },
  { id: 'ct062', ...cd(35,14,0),  cardId: 'card001', merchant: '유니클로 강남점',     inferredCategory: '쇼핑',  categoryNote: null,                         amount: -95000 },
  { id: 'ct063', ...cd(36,8,45),  cardId: 'card001', merchant: '투썸플레이스',        inferredCategory: '카페',  categoryNote: null,                         amount: -8500  },
  { id: 'ct064', ...cd(37,12,30), cardId: 'card001', merchant: '떡볶이집 두끼',       inferredCategory: '식비',  categoryNote: null,                         amount: -14000 },
  { id: 'ct065', ...cd(38,8,0),   cardId: 'card001', merchant: 'T-money 충전',        inferredCategory: '교통',  categoryNote: null,                         amount: -20000 },
  { id: 'ct066', ...cd(39,12,0),  cardId: 'card001', merchant: '배달의민족',          inferredCategory: '식비',  categoryNote: '음식 배달 (메뉴 불명)',       amount: -18500 },
  { id: 'ct067', ...cd(40,9,15),  cardId: 'card001', merchant: '스타벅스 삼성점',     inferredCategory: '카페',  categoryNote: null,                         amount: -9000  },
  { id: 'ct068', ...cd(41,20,0),  cardId: 'card001', merchant: '인터파크 공연티켓',   inferredCategory: '문화',  categoryNote: null,                         amount: -40000 },
  { id: 'ct069', ...cd(42,12,30), cardId: 'card001', merchant: '일식집 하마',         inferredCategory: '식비',  categoryNote: null,                         amount: -35000 },
  { id: 'ct070', ...cd(43,8,30),  cardId: 'card001', merchant: '이디야커피',          inferredCategory: '카페',  categoryNote: null,                         amount: -4500  },
  { id: 'ct071', ...cd(44,14,0),  cardId: 'card001', merchant: 'H&M 명동점',          inferredCategory: '쇼핑',  categoryNote: null,                         amount: -68000 },
  { id: 'ct072', ...cd(45,19,0),  cardId: 'card001', merchant: '고기집 삼겹살',       inferredCategory: '식비',  categoryNote: null,                         amount: -42000 },
  { id: 'ct073', ...cd(46,8,0),   cardId: 'card001', merchant: '메가MGC커피',         inferredCategory: '카페',  categoryNote: null,                         amount: -2500  },

  // 2월 — 신한카드
  { id: 'ct080', ...cd(25,10,0),  cardId: 'card001', merchant: '넷플릭스',            inferredCategory: '구독',  categoryNote: null,                         amount: -13900 },
  { id: 'ct081', ...cd(26,10,0),  cardId: 'card001', merchant: '유튜브 프리미엄',     inferredCategory: '구독',  categoryNote: null,                         amount: -14900 },
  { id: 'ct082', ...cd(28,18,30), cardId: 'card001', merchant: '쿠팡이츠',            inferredCategory: '식비',  categoryNote: '음식 배달 (메뉴 불명)',       amount: -24000 },
  { id: 'ct083', ...cd(31,14,0),  cardId: 'card001', merchant: '마켓컬리',            inferredCategory: '식비',  categoryNote: '식품·생활용품 혼재',         amount: -55000 },
  { id: 'ct084', ...cd(34,9,30),  cardId: 'card001', merchant: 'GS주유소',            inferredCategory: '교통',  categoryNote: null,                         amount: -60000 },
  { id: 'ct085', ...cd(37,14,0),  cardId: 'card001', merchant: '아이허브',            inferredCategory: '쇼핑',  categoryNote: '건강식품·생활용품 혼재',     amount: -88000 },
  { id: 'ct086', ...cd(40,11,0),  cardId: 'card001', merchant: '스포티파이',          inferredCategory: '구독',  categoryNote: null,                         amount: -10900 },
  { id: 'ct087', ...cd(43,19,0),  cardId: 'card001', merchant: '쿠팡',                inferredCategory: '쇼핑',  categoryNote: '품목 불명 (온라인 종합몰)',   amount: -95000 },

  // ════════════════════════════════════════════
  // 1월 — iM 체크카드
  // ════════════════════════════════════════════
  { id: 'ct090', ...cd(52,8,30),  cardId: 'card001', merchant: '스타벅스 강남점',     inferredCategory: '카페',  categoryNote: null,                         amount: -8500  },
  { id: 'ct091', ...cd(53,12,0),  cardId: 'card001', merchant: '치킨집 교촌',         inferredCategory: '식비',  categoryNote: null,                         amount: -21000 },
  { id: 'ct092', ...cd(54,8,45),  cardId: 'card001', merchant: '이디야커피',          inferredCategory: '카페',  categoryNote: null,                         amount: -4500  },
  { id: 'ct093', ...cd(55,14,0),  cardId: 'card001', merchant: '지그재그',            inferredCategory: '쇼핑',  categoryNote: null,                         amount: -75000 },
  { id: 'ct094', ...cd(56,12,30), cardId: 'card001', merchant: '김밥천국',            inferredCategory: '식비',  categoryNote: null,                         amount: -6000  },
  { id: 'ct095', ...cd(57,9,0),   cardId: 'card001', merchant: '할리스커피',          inferredCategory: '카페',  categoryNote: null,                         amount: -5500  },
  { id: 'ct096', ...cd(58,20,0),  cardId: 'card001', merchant: 'CGV 강남',            inferredCategory: '문화',  categoryNote: null,                         amount: -15000 },
  { id: 'ct097', ...cd(59,8,15),  cardId: 'card001', merchant: '스타벅스 삼성점',     inferredCategory: '카페',  categoryNote: null,                         amount: -9000  },
  { id: 'ct098', ...cd(60,12,30), cardId: 'card001', merchant: '삼성전자 디지털프라자', inferredCategory: '쇼핑', categoryNote: null,                         amount: -250000},
  { id: 'ct099', ...cd(61,8,0),   cardId: 'card001', merchant: '메가MGC커피',         inferredCategory: '카페',  categoryNote: null,                         amount: -2500  },
  { id: 'ct100', ...cd(62,12,0),  cardId: 'card001', merchant: '피부과의원',          inferredCategory: '의료',  categoryNote: null,                         amount: -75000 },
  { id: 'ct101', ...cd(63,18,0),  cardId: 'card001', merchant: '한정식집',            inferredCategory: '식비',  categoryNote: null,                         amount: -55000 },
  { id: 'ct102', ...cd(64,8,30),  cardId: 'card001', merchant: 'T-money 충전',        inferredCategory: '교통',  categoryNote: null,                         amount: -20000 },
  { id: 'ct103', ...cd(65,14,0),  cardId: 'card001', merchant: '무신사',              inferredCategory: '쇼핑',  categoryNote: null,                         amount: -82000 },
  { id: 'ct104', ...cd(66,9,0),   cardId: 'card001', merchant: '투썸플레이스',        inferredCategory: '카페',  categoryNote: null,                         amount: -8500  },
  { id: 'ct105', ...cd(67,12,0),  cardId: 'card001', merchant: '배달의민족',          inferredCategory: '식비',  categoryNote: '음식 배달 (메뉴 불명)',       amount: -16000 },
  { id: 'ct106', ...cd(68,8,45),  cardId: 'card001', merchant: '정형외과',            inferredCategory: '의료',  categoryNote: null,                         amount: -22000 },
  { id: 'ct107', ...cd(69,20,0),  cardId: 'card001', merchant: '뮤지컬 티켓',         inferredCategory: '문화',  categoryNote: null,                         amount: -88000 },
  { id: 'ct108', ...cd(70,8,0),   cardId: 'card001', merchant: '메가MGC커피',         inferredCategory: '카페',  categoryNote: null,                         amount: -2500  },
  { id: 'ct109', ...cd(71,14,30), cardId: 'card001', merchant: '아이허브',            inferredCategory: '쇼핑',  categoryNote: '건강식품·생활용품 혼재',     amount: -65000 },

  // 1월 — 신한카드
  { id: 'ct115', ...cd(53,10,0),  cardId: 'card001', merchant: '넷플릭스',            inferredCategory: '구독',  categoryNote: null,                         amount: -13900 },
  { id: 'ct116', ...cd(54,10,0),  cardId: 'card001', merchant: '유튜브 프리미엄',     inferredCategory: '구독',  categoryNote: null,                         amount: -14900 },
  { id: 'ct117', ...cd(57,18,0),  cardId: 'card001', merchant: '쿠팡이츠',            inferredCategory: '식비',  categoryNote: '음식 배달 (메뉴 불명)',       amount: -28000 },
  { id: 'ct118', ...cd(60,9,30),  cardId: 'card001', merchant: 'GS주유소',            inferredCategory: '교통',  categoryNote: null,                         amount: -60000 },
  { id: 'ct119', ...cd(63,14,0),  cardId: 'card001', merchant: '마켓컬리',            inferredCategory: '식품', categoryNote: '식품·생활용품 혼재',          amount: -72000 },
  { id: 'ct120', ...cd(66,11,0),  cardId: 'card001', merchant: '스포티파이',          inferredCategory: '구독',  categoryNote: null,                         amount: -10900 },
  { id: 'ct121', ...cd(69,19,30), cardId: 'card001', merchant: '쿠팡',                inferredCategory: '쇼핑',  categoryNote: '품목 불명 (온라인 종합몰)',   amount: -145000},

  // ════════════════════════════════════════════
  // 12월 — iM 체크카드
  // ════════════════════════════════════════════
  { id: 'ct130', ...cd(82,9,0),   cardId: 'card001', merchant: '스타벅스 강남점',     inferredCategory: '카페',  categoryNote: null,                         amount: -8500  },
  { id: 'ct131', ...cd(83,14,0),  cardId: 'card001', merchant: '크리스마스 레스토랑', inferredCategory: '식비',  categoryNote: null,                         amount: -95000 },
  { id: 'ct132', ...cd(84,10,0),  cardId: 'card001', merchant: '롯데백화점',          inferredCategory: '쇼핑',  categoryNote: '품목 불명 (백화점)',          amount: -280000},
  { id: 'ct133', ...cd(85,8,30),  cardId: 'card001', merchant: '이디야커피',          inferredCategory: '카페',  categoryNote: null,                         amount: -4500  },
  { id: 'ct134', ...cd(86,19,0),  cardId: 'card001', merchant: 'CGV 강남',            inferredCategory: '문화',  categoryNote: null,                         amount: -15000 },
  { id: 'ct135', ...cd(87,12,0),  cardId: 'card001', merchant: '연말 회식집',         inferredCategory: '식비',  categoryNote: null,                         amount: -65000 },
  { id: 'ct136', ...cd(88,8,45),  cardId: 'card001', merchant: '할리스커피',          inferredCategory: '카페',  categoryNote: null,                         amount: -5500  },
  { id: 'ct137', ...cd(89,14,0),  cardId: 'card001', merchant: 'KTX 귀성',            inferredCategory: '교통',  categoryNote: null,                         amount: -55000 },
  { id: 'ct138', ...cd(90,12,30), cardId: 'card001', merchant: '배달의민족',          inferredCategory: '식비',  categoryNote: '음식 배달 (메뉴 불명)',       amount: -22000 },
  { id: 'ct139', ...cd(91,9,0),   cardId: 'card001', merchant: '스타벅스 역삼점',     inferredCategory: '카페',  categoryNote: null,                         amount: -7500  },
  { id: 'ct140', ...cd(92,14,0),  cardId: 'card001', merchant: '쿠팡',                inferredCategory: '쇼핑',  categoryNote: '품목 불명 (온라인 종합몰)',   amount: -58000 },

  // 12월 — 신한카드
  { id: 'ct145', ...cd(83,10,0),  cardId: 'card001', merchant: '넷플릭스',            inferredCategory: '구독',  categoryNote: null,                         amount: -13900 },
  { id: 'ct146', ...cd(84,10,0),  cardId: 'card001', merchant: '유튜브 프리미엄',     inferredCategory: '구독',  categoryNote: null,                         amount: -14900 },
  { id: 'ct147', ...cd(86,18,0),  cardId: 'card001', merchant: '아마존 해외직구',     inferredCategory: '쇼핑',  categoryNote: '품목 불명 (해외 직구)',       amount: -135000},
  { id: 'ct148', ...cd(89,9,30),  cardId: 'card001', merchant: 'GS주유소',            inferredCategory: '교통',  categoryNote: null,                         amount: -60000 },
  { id: 'ct149', ...cd(92,14,0),  cardId: 'card001', merchant: '스포티파이',          inferredCategory: '구독',  categoryNote: null,                         amount: -10900 },
  { id: 'ct150', ...cd(94,19,0),  cardId: 'card001', merchant: '쿠팡 연말대전',       inferredCategory: '쇼핑',  categoryNote: '품목 불명 (온라인 종합몰)',   amount: -198000},
]

// ──────────────────────────────────────────────
// 프로액티브 알림 조건 체크 (카드 거래 기반)
// ──────────────────────────────────────────────
export function getProactiveAlert() {
  const mainAccount = accounts.find((a) => a.id === 'acc001')
  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)

  const alerts = []

  // 잔액 낮음
  if (mainAccount.balance < 1500000) {
    alerts.push({
      type: 'low_balance',
      message: `주계좌 잔액이 ${mainAccount.balance.toLocaleString()}원입니다. 이번 달 지출 패턴을 고려하면 빠듯할 수 있습니다.`,
    })
  }

  // 이번 달 카드 카페 지출 (카드 기반)
  const cafeSpend = cardTransactions
    .filter((t) => t.inferredCategory === '카페' && t.date >= thisMonthStart && t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  if (cafeSpend > 40000) {
    alerts.push({
      type: 'spending_insight',
      message: `이번 달 카페 지출이 ${cafeSpend.toLocaleString()}원입니다. 추정 카테고리 기반 집계로, 실제 금액과 다를 수 있습니다.`,
    })
  }

  // 구독 서비스 알림 (카드 기반)
  const subSpend = cardTransactions
    .filter((t) => t.inferredCategory === '구독' && t.date >= thisMonthStart && t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  if (subSpend > 0) {
    alerts.push({
      type: 'subscription',
      message: `이번 달 구독 서비스 추정 지출: ${subSpend.toLocaleString()}원. 미사용 구독을 점검해 보세요.`,
    })
  }

  return alerts[0] || null
}

// ──────────────────────────────────────────────
// 리셋용 초기 스냅샷 (모듈 로드 시 1회 캡처)
// ──────────────────────────────────────────────
const _initialAccounts = structuredClone(accounts)
const _initialTransactions = structuredClone(transactions)

export function getInitialAccounts() {
  return structuredClone(_initialAccounts)
}

export function getInitialTransactions() {
  return structuredClone(_initialTransactions)
}

// ──────────────────────────────────────────────
// 절약 목표 기준 (카테고리별 권장 비율 + 이유)
// ──────────────────────────────────────────────
export const SAVINGS_TARGETS = {
  '카페':   { ratio: 0.6, reason: '주 3회 이하로 줄이면 절약 가능' },
  '구독':   { ratio: 0.5, reason: 'Netflix+Wavve 중복 구독 감지' },
  '쇼핑':   { ratio: 0.7, reason: '월 평균 대비 초과 지출' },
  '식비':   { ratio: 0.8, reason: '외식 비중 높음' },
  '문화':   { ratio: 0.75, reason: '월 2회 이하 문화생활 권장' },
}

// ──────────────────────────────────────────────
// 금융상품 비교 데이터
// ──────────────────────────────────────────────
export const savingsProducts = [
  {
    id: 'imbank-001',
    bank: 'iM뱅크',
    name: '정기적금',
    rate: 4.2,
    term: 6,
    min: 10000,
    max: 500000,
    cta_url: 'imbank://savings/apply',
    features: ['높은 금리', '6개월 단기', '모바일 가입'],
    recommended: true,
  },
  {
    id: 'kakao-001',
    bank: '카카오뱅크',
    name: '자유적금',
    rate: 3.8,
    term: 6,
    min: 1000,
    max: 300000,
    cta_url: null,
    features: ['자유 납입', '소액 가입 가능'],
    recommended: false,
  },
  {
    id: 'toss-001',
    bank: '토스뱅크',
    name: '목돈굴리기',
    rate: 3.5,
    term: 6,
    min: 10000,
    max: 1000000,
    cta_url: null,
    features: ['대용량 한도', '자동 이체'],
    recommended: false,
  },
]
