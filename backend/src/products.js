// ──────────────────────────────────────────────
// iM뱅크 상품 데이터
// 출처: iM뱅크 공식 홈페이지 기준 (2025년 기준 데이터)
// ──────────────────────────────────────────────

export const PRODUCTS = {

  // ── 예금 ──
  deposit: [
    {
      id: 'dep_001',
      name: 'iM주거래우대예금',
      category: '정기예금',
      baseRate: 3.20,
      maxRate: 3.85,
      period: '1개월~36개월',
      minAmount: 100,
      maxAmount: null,
      highlights: [
        '기본금리 연 3.20% (12개월 기준)',
        '주거래 조건 충족 시 최고 연 3.85%',
        '우대조건: 급여이체, 자동이체, 카드 이용 실적',
        '비대면 가입 가능',
      ],
      conditions: '개인 고객 누구나 가입 가능',
      earlyWithdrawal: '중도해지 시 기본금리의 50% 적용',
      tags: ['예금', '정기예금', '고금리', '주거래'],
    },
    {
      id: 'dep_002',
      name: 'iM스마트예금',
      category: '정기예금',
      baseRate: 3.05,
      maxRate: 3.05,
      period: '1개월~36개월',
      minAmount: 100,
      maxAmount: null,
      highlights: [
        '비대면 전용 정기예금',
        '연 3.05% 단일금리 (12개월 기준)',
        '앱·인터넷뱅킹으로만 가입',
        '조건 없이 동일 금리 적용',
      ],
      conditions: '인터넷·모바일뱅킹 가입 고객',
      earlyWithdrawal: '중도해지 시 기본금리의 50% 적용',
      tags: ['예금', '정기예금', '비대면', '단일금리'],
    },
    {
      id: 'dep_003',
      name: '비상금박스 (파킹통장)',
      category: '입출금통장',
      baseRate: 2.50,
      maxRate: 2.50,
      period: '수시 입출금',
      minAmount: 0,
      maxAmount: 30000000,
      highlights: [
        '연 2.50% 높은 수시 입출금 금리',
        '한도 3,000만 원까지',
        '매일 이자 계산, 월 지급',
        '언제든 입출금 자유',
      ],
      conditions: '누구나 가입 가능',
      earlyWithdrawal: '적용 없음 (수시 입출금)',
      tags: ['파킹통장', '입출금', '비상금', '고금리'],
    },
  ],

  // ── 적금 ──
  savings: [
    {
      id: 'sav_001',
      name: 'DGB핫플적금',
      category: '자유적립식 적금',
      baseRate: 2.80,
      maxRate: 4.00,
      period: '6개월~36개월',
      minAmount: 10000,
      maxAmount: 3000000,
      highlights: [
        '기본금리 연 2.80%',
        '우대금리 포함 최고 연 4.00%',
        '우대조건: 자동이체, 카드 이용, 급여이체',
        '월 최대 300만 원 납입 가능',
      ],
      conditions: '개인 고객',
      earlyWithdrawal: '중도해지 시 기본금리의 40% 적용',
      tags: ['적금', '자유적립', '우대금리'],
    },
    {
      id: 'sav_002',
      name: 'iM청년도약계좌',
      category: '정부지원 적금',
      baseRate: 4.50,
      maxRate: 6.00,
      period: '60개월 (5년)',
      minAmount: 40000,
      maxAmount: 700000,
      highlights: [
        '만 19~34세 청년 대상 정부지원 적금',
        '기본금리 연 4.50%, 최고 연 6.00%',
        '정부 기여금 월 최대 2만 4천 원 지원',
        '5년 만기 시 비과세 혜택',
        '월 40만~70만 원 납입',
      ],
      conditions: '만 19~34세, 개인소득 6,000만 원 이하, 가구소득 중위 180% 이하',
      earlyWithdrawal: '5년 이전 해지 시 정부 기여금 및 비과세 혜택 상실',
      tags: ['청년', '정부지원', '비과세', '청년도약'],
    },
    {
      id: 'sav_003',
      name: '직장인우대적금',
      category: '정기적립식 적금',
      baseRate: 3.10,
      maxRate: 4.20,
      period: '12개월~24개월',
      minAmount: 10000,
      maxAmount: 1000000,
      highlights: [
        '직장인 전용 우대금리 적금',
        '기본금리 연 3.10%, 최고 연 4.20%',
        '급여이체 실적 시 우대금리 자동 적용',
        '월 최대 100만 원 납입',
      ],
      conditions: '직장인 고객 (급여 수령 계좌 보유자)',
      earlyWithdrawal: '중도해지 시 기본금리의 40% 적용',
      tags: ['직장인', '적금', '급여이체', '우대금리'],
    },
  ],

  // ── 대출 ──
  loan: [
    {
      id: 'loan_001',
      name: 'iM직장인 간편신용대출',
      category: '신용대출',
      minRate: 3.63,
      maxRate: 10.30,
      maxAmount: 180000000,
      period: '최대 5년',
      highlights: [
        '연 3.63% ~ 10.30% (신용등급에 따라 차등)',
        '최대 1억 8,000만 원 한도',
        '직장인 대상 무담보 신용대출',
        '비대면 신청·심사 가능',
        '당일 심사·지급 가능',
      ],
      conditions: '재직기간 3개월 이상 직장인, 신용점수 600점 이상',
      repayment: '원리금균등상환, 원금균등상환, 만기일시상환',
      tags: ['신용대출', '직장인', '비대면', '당일지급'],
    },
    {
      id: 'loan_002',
      name: 'iM주택담보대출',
      category: '담보대출',
      minRate: 4.28,
      maxRate: 5.73,
      maxAmount: 1000000000,
      period: '최대 40년',
      highlights: [
        '연 4.28% ~ 5.73% (변동/고정 선택)',
        '최대 10억 원 한도',
        '주택 담보 대출 (LTV 최대 70%)',
        '변동금리·혼합금리·고정금리 선택 가능',
        '온라인 사전심사 가능',
      ],
      conditions: '만 19세 이상, 소득 증빙 가능자, 담보 주택 보유',
      repayment: '원리금균등상환, 원금균등상환',
      tags: ['주택담보', '부동산', '아파트', '전세'],
    },
    {
      id: 'loan_003',
      name: 'DGB무방문전세자금대출',
      category: '전세자금대출',
      minRate: 3.80,
      maxRate: 5.20,
      maxAmount: 500000000,
      period: '전세 계약 기간 (최대 2년)',
      highlights: [
        '연 3.80% ~ 5.20%',
        '최대 5억 원 한도',
        '비대면 전세자금 대출',
        '지점 방문 없이 100% 비대면 처리',
        'HF(주택금융공사) 보증 상품',
      ],
      conditions: '무주택 세대주, 전세보증금 5억 원 이하, 연 소득 증빙',
      repayment: '만기일시상환 (전세 계약 종료 시)',
      tags: ['전세', '비대면', '무주택', '전세자금'],
    },
  ],

  // ── 신용카드 ──
  credit_card: [
    {
      id: 'cc_001',
      name: 'iM 세븐캐쉬백 카드',
      category: '신용카드',
      annualFee: 15000,
      highlights: [
        '7개 가맹점 최대 7% 캐시백',
        '대상: 스타벅스, CU, GS25, 맥도날드, 배달의민족, 쿠팡, 넷플릭스',
        '월 최대 7,000원 캐시백',
        '전월 실적 30만 원 이상 시 적용',
      ],
      benefits: [
        { category: '카페·편의점', rate: '7% 캐시백' },
        { category: '배달·OTT', rate: '7% 캐시백' },
        { category: '기타 가맹점', rate: '0.5% 기본 적립' },
      ],
      conditions: '전월 이용실적 30만 원 이상',
      tags: ['캐시백', '편의점', '배달', '스타벅스'],
    },
    {
      id: 'cc_002',
      name: 'iM K-패스 카드',
      category: '신용카드',
      annualFee: 0,
      highlights: [
        '대중교통 이용금액 최대 10% 적립',
        '연회비 무료',
        'K-패스 정부 지원 연계',
        '월 15회 이상 이용 시 21% 환급(청년)',
        '버스·지하철·GTX 모두 적용',
      ],
      benefits: [
        { category: '대중교통', rate: '10% 적립 (일반) / 21% 환급 (청년)' },
        { category: '쇼핑·식비', rate: '0.5% 기본 적립' },
      ],
      conditions: '연회비 없음, K-패스 앱 등록 필요',
      tags: ['대중교통', 'K-패스', '청년', '연회비없음'],
    },
    {
      id: 'cc_003',
      name: 'iM 트래블 카드',
      category: '신용카드',
      annualFee: 30000,
      highlights: [
        '해외 결제 수수료 완전 무료',
        '공항 라운지 무제한 이용 (동반 1인 포함)',
        '해외 ATM 출금 수수료 면제 (월 3회)',
        '전 세계 가맹점 1.5% 적립',
        '여행자보험 자동 가입',
      ],
      benefits: [
        { category: '해외 가맹점', rate: '1.5% 적립 + 수수료 무료' },
        { category: '국내 가맹점', rate: '0.7% 적립' },
        { category: '공항 라운지', rate: '무제한 이용' },
      ],
      conditions: '연회비 30,000원 (첫 해 면제)',
      tags: ['해외', '여행', '공항라운지', '트래블'],
    },
    {
      id: 'cc_004',
      name: '단디카드',
      category: '신용카드',
      annualFee: 10000,
      highlights: [
        '생활 밀착형 할인 특화 카드',
        '주유 100원/L 할인',
        '대형마트·백화점 5% 할인',
        '통신요금 5% 할인 (SKT·KT·LGU+)',
        '의료비 3% 청구 할인',
      ],
      benefits: [
        { category: '주유', rate: '100원/L 할인' },
        { category: '마트·백화점', rate: '5% 청구 할인' },
        { category: '통신요금', rate: '5% 청구 할인' },
        { category: '의료비', rate: '3% 청구 할인' },
      ],
      conditions: '전월 실적 50만 원 이상',
      tags: ['주유', '마트', '통신', '생활비'],
    },
    {
      id: 'cc_005',
      name: '그린카드 v2',
      category: '신용카드',
      annualFee: 0,
      highlights: [
        '친환경 소비 포인트 적립 특화',
        '에코머니 포인트 최대 5% 적립',
        '대중교통 5% 포인트 적립',
        '연회비 무료',
        '공과금 자동이체 2% 포인트',
      ],
      benefits: [
        { category: '친환경 가맹점', rate: '5% 에코머니 적립' },
        { category: '대중교통', rate: '5% 적립' },
        { category: '공과금', rate: '2% 적립' },
      ],
      conditions: '연회비 없음, 전월 실적 30만 원 이상',
      tags: ['친환경', '에코', '연회비없음', '대중교통'],
    },
  ],

  // ── 체크카드 ──
  debit_card: [
    {
      id: 'dc_001',
      name: 'iM Z 체크카드',
      category: '체크카드',
      annualFee: 0,
      highlights: [
        '전 가맹점 0.2% 캐시백',
        'MZ세대 특화 디자인',
        '연회비 무료',
        '편의점·카페 추가 0.3% 캐시백',
        '네이버페이·카카오페이 실적 인정',
      ],
      benefits: [
        { category: '전 가맹점', rate: '0.2% 캐시백' },
        { category: '편의점·카페', rate: '추가 0.3% (합계 0.5%)' },
      ],
      conditions: '연회비 없음, 실적 무관',
      tags: ['체크카드', 'MZ', '캐시백', '연회비없음'],
    },
    {
      id: 'dc_002',
      name: 'iM A 체크카드',
      category: '체크카드',
      annualFee: 0,
      highlights: [
        '주요 생활 가맹점 5% 할인',
        '스타벅스·맥도날드·KFC 5% 할인',
        '배달앱 5% 할인 (배달의민족·쿠팡이츠)',
        '월 최대 5,000원 할인',
        '연회비 무료',
      ],
      benefits: [
        { category: '카페·패스트푸드', rate: '5% 청구 할인' },
        { category: '배달앱', rate: '5% 청구 할인' },
      ],
      conditions: '전월 실적 20만 원 이상, 연회비 없음',
      tags: ['체크카드', '카페', '배달', '할인'],
    },
    {
      id: 'dc_003',
      name: '부자되세요 더마일리지 체크카드',
      category: '체크카드',
      annualFee: 3000,
      highlights: [
        '대한항공 마일리지 1,000원당 1마일 적립',
        '해외 이용 시 2배 마일리지',
        '연회비 3,000원으로 항공 마일리지 적립',
        '대한항공·KE 탑승 보너스 마일리지',
      ],
      benefits: [
        { category: '국내 가맹점', rate: '1,000원당 1마일리지' },
        { category: '해외 가맹점', rate: '1,000원당 2마일리지' },
      ],
      conditions: '연회비 3,000원 (연 1회 청구)',
      tags: ['체크카드', '마일리지', '대한항공', '여행'],
    },
  ],

  // ── 투자·연금 ──
  investment: [
    {
      id: 'inv_001',
      name: '개인형IRP (개인형 퇴직연금)',
      category: 'IRP',
      highlights: [
        '연간 최대 900만 원 세액공제 (연금저축 합산)',
        '세액공제율 13.2%~16.5% (소득에 따라)',
        '비대면 수수료 전액 면제 (업계 최저)',
        '다양한 펀드·ETF·예금 선택 투자',
        '55세 이후 연금 수령 시 저율 과세',
      ],
      benefits: [
        { category: '세액공제', rate: '최대 148.5만 원/년 절세' },
        { category: '수수료', rate: '비대면 계좌 0원' },
        { category: '운용수익', rate: '과세 이연 복리 효과' },
      ],
      conditions: '근로소득자·자영업자·프리랜서 누구나',
      tags: ['IRP', '퇴직연금', '세액공제', '절세'],
    },
    {
      id: 'inv_002',
      name: 'ISA (개인종합자산관리계좌)',
      category: 'ISA',
      highlights: [
        '비과세 한도 200만~400만 원/년',
        '하나의 계좌에서 예금·펀드·ETF 통합 운용',
        '3년 만기 후 연금계좌 전환 시 추가 세액공제',
        '의무 가입 기간 3년',
        '연간 납입 한도 2,000만 원 (3년 6,000만 원)',
      ],
      benefits: [
        { category: '비과세', rate: '일반형 200만 원, 서민형 400만 원' },
        { category: '손익통산', rate: '수익·손실 합산 과세 (세 부담 감소)' },
        { category: '이월 납입', rate: '미납입 한도 다음 해 이월 가능' },
      ],
      conditions: '만 19세 이상 (서민형: 소득 5,000만 원 이하 또는 농어민)',
      tags: ['ISA', '절세', '종합자산', '비과세'],
    },
  ],
}

// ── 카테고리 한글 매핑 ──
export const CATEGORY_LABELS = {
  deposit:     '예금',
  savings:     '적금',
  loan:        '대출',
  credit_card: '신용카드',
  debit_card:  '체크카드',
  investment:  '투자·연금',
}

// ── 전체 상품 목록 평탄화 (검색용) ──
export function getAllProducts() {
  return Object.entries(PRODUCTS).flatMap(([type, products]) =>
    products.map((p) => ({ ...p, type, typeLabel: CATEGORY_LABELS[type] }))
  )
}

// ── 상품 검색 ──
export function searchProducts({ type, keyword, tag } = {}) {
  let all = getAllProducts()

  if (type) {
    all = all.filter((p) => p.type === type)
  }

  if (keyword) {
    const kw = keyword.toLowerCase()
    all = all.filter((p) =>
      p.name.toLowerCase().includes(kw) ||
      p.category.toLowerCase().includes(kw) ||
      (p.highlights || []).some((h) => h.toLowerCase().includes(kw)) ||
      (p.tags || []).some((t) => t.toLowerCase().includes(kw))
    )
  }

  if (tag) {
    all = all.filter((p) => (p.tags || []).includes(tag))
  }

  return all
}

// ── 상품 상세 조회 ──
export function getProductById(id) {
  return getAllProducts().find((p) => p.id === id) || null
}
