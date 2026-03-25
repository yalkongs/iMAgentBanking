import { useState, useEffect, useRef } from 'react'

const FINANCIAL_MESSAGES = [
  { accent: '#FBBF24', tag: '금융정보', message: '기준금리 동결 전망. 고금리 정기예금 가입 적기입니다. iM 정기예금 연 3.8% 고정금리로 자산을 지키세요.' },
  { accent: '#818CF8', tag: '금융상품', message: 'iM 청년도약계좌 — 연 최대 6% 금리에 정부 기여금 지원. 5년 만기 시 최대 5,000만원 적립 가능합니다.' },
  { accent: '#00C9A7', tag: '추천상품', message: 'iM CMA — 수시 입출금하면서 연 3.5% 이자. 비상금 계좌를 CMA로 전환하면 이자 손실이 없습니다.' },
  { accent: '#F472B6', tag: '절약팁', message: '저축 먼저, 지출 나중 원칙. 급여일 자동이체를 설정하면 저축률을 3배 높일 수 있습니다.' },
  { accent: '#A78BFA', tag: '소비 인사이트', message: '구독 서비스 정리로 월 평균 2만 3천원 절약 가능. 자동결제 내역을 지금 확인해보세요.' },
  { accent: '#38BDF8', tag: '세금정보', message: '연말정산 공제항목을 미리 챙기면 최대 수십만원 환급받을 수 있습니다. 항목별 한도를 확인해보세요.' },
  { accent: '#FB923C', tag: '투자정보', message: '물가연동채권(TIPS) 금리 상승 중. 인플레이션 헤지 수단으로 주목받고 있습니다.' },
]

const SHOW_DURATION = 6000   // 표시 시간 (ms)
const PAUSE_DURATION = 18000 // 다음 메시지까지 대기 (ms)
const ANIM_DURATION = 380    // 슬라이드 애니메이션 (ms)

export default function DrawerBanner() {
  const [current, setCurrent] = useState(null)
  const [visible, setVisible] = useState(false)
  const timersRef = useRef([])
  const idxRef = useRef(0)

  function addTimer(fn, delay) {
    const id = setTimeout(fn, delay)
    timersRef.current.push(id)
    return id
  }

  function clearAll() {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }

  useEffect(() => {
    const pool = FINANCIAL_MESSAGES

    function showNext() {
      const msg = pool[idxRef.current % pool.length]
      idxRef.current++

      setCurrent(msg)
      addTimer(() => setVisible(true), 30)          // 렌더 후 슬라이드인

      addTimer(() => {
        setVisible(false)                            // 슬라이드아웃
        addTimer(showNext, ANIM_DURATION + PAUSE_DURATION) // 다음 순서
      }, SHOW_DURATION)
    }

    addTimer(showNext, 1200) // 초기 지연

    return () => clearAll()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`drawer-wrap${visible ? ' visible' : ''}`}>
      {current && (
        <div
          className="drawer-inner"
          style={{ '--drawer-accent': current.accent }}
        >
          <div className="drawer-accent-bar" />
          <div className="drawer-content">
            <span
              className="drawer-tag"
              style={{
                color: current.accent,
                borderColor: current.accent + '40',
                background: current.accent + '18',
              }}
            >
              {current.tag}
            </span>
            <p className="drawer-text">{current.message}</p>
          </div>
        </div>
      )}
    </div>
  )
}
