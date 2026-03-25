# iMAgentBanking

iM뱅크 AI 금융 어시스턴트 데모 앱. 자연어로 잔액 조회, 이체, 지출 분석을 수행하며 AI와 실시간으로 대화합니다.

**Live Demo**: https://frontend-seven-beta-54.vercel.app

---

## 왜 이걸 만들었나

대화형 뱅킹은 요즘 너나 할 것 없이 여기저기서 많이 논의됩니다.

그러나 막상 실제 제작에 들어가면 인터페이스를 어떻게 구성하는 것이 좋을지 판단하는 과정이 생각보다 쉽지 않습니다. **모든 기능을 대화로만 풀어가는 방식은, 직접 써보니 불편하기 짝이 없었습니다.**

대화형 뱅킹은 현실적으로 **GUI와 적절한 조합**이 필요합니다. 실제 인터페이스를 작동해가면서 기획자와 개발자 모두 경험을 통해 새로운 사용 패턴을 축적하지 않으면 안 됩니다.

전통적인 GUI 기반 모바일 앱은 기존 데스크탑 경험을 상당 부분 이전할 수 있었습니다. 그러나 대화형 뱅킹은 **축적된 사전 사용 경험 자체가 없습니다.** 해봐야 압니다.

여러 차례 시도 끝에, 최소한의 사용 경험 축적을 위한 샘플을 제작했습니다.

- "엄마", "동생" 같은 **송금 대상 aliasing** 기능
- 카드·거래내역 탭과 대화창을 연결하는 **GUI-대화 결합**
- **음성 입력** (OpenAI Whisper API)
- **음성 모드** — 화면을 보지 않고 말만으로 이체·조회·확인까지 완결
- **AI 절약 어드바이저** — 지출 패턴 분석 후 절약 가능 금액과 맞춤 상품 추천

아직 불편한 점이 많이 있지만, 백문이불여일견.

시간 나는 대로 계속:
- 버그 픽스
- Mock Data 확충
- 모임통장 같은 커뮤니티 기능

을 구현해 나갈 예정입니다.

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| 자연어 금융 조회 | "이번 달 얼마 썼어?", "잔액 알려줘" 등 일상적인 말로 조회 |
| 실시간 이체 | 스와이프 제스처로 이체 확인 — 버튼 없이 슬라이드로 승인 |
| 음성 입력 | 마이크 버튼 탭 → Whisper STT → 자동 전송 |
| **음성 모드** | 풀스크린 오버레이 — 말로 이체 지시 → "네" 한 마디로 확인까지 완결 |
| TTS 읽기 | AI 응답을 한국어로 음성 읽기 (Web Speech API) |
| **AI 절약 어드바이저** | 카테고리별 절약 가능 금액 분석 + 맞춤 적금 상품 비교 |
| 재무 모멘트 알림 | 급여 입금, 카드 결제일 D-3, 과소비 감지 실시간 푸시 |
| 이달의 재무 스토리 | "이번 달 어땠어?" → 서사형 월간 요약 카드 |
| 재무 건강 지수 | 저축률·자산 기반 0~100점 건강 점수 (헤더 표시) |
| 컨텍스트 퀵숏컷 | 마지막 조회 항목에 따라 관련 단축 버튼 자동 변경 |
| 카드-대화 브릿지 | 거래내역·지출 항목 탭 → 관련 질문 자동 입력 |

---

## 신규 기능 상세

### 음성 모드 (Voice Mode)

메뉴 → **◎ 음성 데모**를 누르면 풀스크린 음성 모드가 시작됩니다.

```
말하기  →  AI 처리  →  결과 TTS 읽기  →  다음 말하기
                        ↓
                  이체 요청 시:
              "엄마한테 5만원 보내줄까요?"
                   "네" → 이체 실행
                  "아니오" → 취소
```

- **5상태 머신**: IDLE → RECORDING → PROCESSING → SPEAKING → ERROR
- **음성 이체 확인**: SpeechRecognition으로 "네" / "아니오" 감지, 5초 무응답 시 버튼 fallback
- **TTS 분리**: 일반 텍스트 응답(Path 1)과 UI 카드 요약(Path 2)을 분리해 음성 데모에서 중복 발화 방지
- **X 버튼 / Esc 키**로 언제든 종료

### AI 절약 어드바이저

"이번 달 얼마 절약할 수 있어?" 라고 물어보면:

1. **절약 분석 카드** — 카테고리별 진행 바와 절약 가능 금액 표시
2. **"이 금액으로 적금 상품 찾기" CTA** 클릭
3. **상품 비교 카드** — iM뱅크 추천 상품을 Hero로, 타행 상품을 비교 행으로 표시

```
get_savings_advice  →  SavingsInsightCard  →  CTA 클릭
                                                  ↓
compare_products    →  ProductCompareCard (Featured Hero)
```

---

## 기술 스택

**Frontend**
- React + Vite (모바일 최적화, max-width 480px)
- CSS Custom Properties 기반 금융 전용 디자인 시스템
- Web Speech API (TTS + SpeechRecognition), MediaRecorder (음성 녹음)

**Backend**
- Node.js + Express (SSE 스트리밍)
- WebSocket (실시간 알림)
- Claude API (Tool Use, claude-3-5-sonnet)
- OpenAI Whisper (음성 인식)
- Vercel Blob (대화 아카이브)

---

## Claude Tool Use 목록

| 툴 | 설명 |
|----|------|
| `get_balance` | 계좌 잔액 조회 |
| `get_transactions` | 거래 내역 조회 |
| `resolve_contact` | 연락처 검색 (alias 포함) |
| `save_alias` | 닉네임 저장 ("엄마" → 이순자) |
| `get_transfer_suggestion` | 이체 정보 확인 |
| `transfer` | 이체 실행 (2단계: PENDING → confirm) |
| `analyze_spending` | 지출 분석 |
| `analyze_card_spending` | 카드 지출 분석 |
| `get_card_transactions` | 카드 거래 내역 |
| `complex_query` | 복합 질의 |
| `get_monthly_story` | 월간 재무 스토리 |
| `get_savings_advice` | **신규** — 절약 가능 금액 분석 |
| `compare_products` | **신규** — 적금/예금 상품 비교 |

---

## 로컬 개발

```bash
# Backend
cd backend
cp .env.example .env
# .env에 실제 API 키 입력
npm install
npm run dev        # http://localhost:3001

# Frontend (별도 터미널)
cd frontend
cp .env.example .env.local
# VITE_API_URL=http://localhost:3001
# VITE_WS_URL=ws://localhost:3001/ws
npm install
npm run dev        # http://localhost:5173
```

### 환경변수

**backend/.env**
```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...
BLOB_READ_WRITE_TOKEN=vercel_blob_...   # 대화 아카이브용 (선택)
PORT=3001
```

**frontend/.env.local**
```
VITE_API_URL=https://your-backend.railway.app
VITE_WS_URL=wss://your-backend.railway.app/ws
```

---

## 배포

| 서비스 | 플랫폼 | 설정 파일 |
|--------|--------|-----------|
| Frontend | Vercel | `frontend/vercel.json` |
| Backend | Railway | `backend/railway.toml` |

```bash
# Frontend 배포
cd frontend && vercel deploy --prod

# Backend 배포
cd backend && railway up
```

Railway 무료 플랜은 15분 미접속 시 sleep 전환됩니다. `cron-job.org` 등으로 `/api/proactive`를 20분 간격으로 요청하면 cold start 없이 유지됩니다.

---

## 대화 아카이브

모든 사용자-AI 대화는 **Vercel Blob Storage**에 자동 저장됩니다.

### 저장 구조

```
archive/
  └── 2026-03-25/               # 날짜별
        └── {sessionId}/
              └── {timestamp}.json
```

### 아카이브 JSON 형식

```json
{
  "id": "session-123-1711234567890",
  "sessionId": "session-123",
  "timestamp": "2026-03-25T04:30:00.000Z",
  "userMessage": "이번 달 지출 분석해줘",
  "assistantText": "이번 달 총 지출은 1,234,000원입니다...",
  "toolCalls": [
    { "name": "analyze_spending", "input": { "group_by": "category" } }
  ]
}
```

아카이브는 `BLOB_READ_WRITE_TOKEN` 환경변수가 설정된 경우에만 동작합니다. 설정하지 않으면 아카이브 없이 정상 작동합니다.

---

## 보안 주의사항

- Railway와 Vercel의 환경변수 설정 화면에서 API 키를 입력하세요
- Vercel Blob 아카이브는 `access: 'private'`으로 설정되어 공개 접근 불가

---

## 프로젝트 구조

```
iMAgentBanking/
├── backend/
│   ├── src/
│   │   ├── server.js      # Express + WebSocket + SSE 스트리밍
│   │   ├── tools.js       # Claude Tool Use 핸들러 (13개 툴)
│   │   ├── mockData.js    # 가상 계좌/거래/카드/절약 데이터
│   │   └── tests/
│   │       └── core.test.js   # vitest 단위 테스트 (12개)
│   ├── .env.example
│   └── railway.toml
└── frontend/
    ├── src/
    │   ├── App.jsx                        # 메인 컴포넌트 (음성 모드 포함)
    │   ├── styles.css                     # 금융 전용 디자인 시스템
    │   ├── components/
    │   │   ├── BalanceCard.jsx            # 계좌 잔액 카드
    │   │   ├── TransactionList.jsx        # 거래내역 (날짜 그룹핑)
    │   │   ├── SpendingCard.jsx           # 지출 분석
    │   │   ├── TransferCard.jsx           # 스와이프 이체 확인 (음성 확인 포함)
    │   │   ├── FinancialMomentCard.jsx    # 실시간 재무 알림
    │   │   ├── FinancialStoryCard.jsx     # 월간 재무 스토리
    │   │   ├── VoiceOverlay.jsx           # 음성 모드 풀스크린 오버레이
    │   │   ├── SavingsInsightCard.jsx     # 절약 분석 카드
    │   │   └── ProductCompareCard.jsx     # 적금 상품 비교 카드
    │   └── hooks/
    │       ├── useWebSocket.js            # 실시간 WebSocket 연결
    │       ├── useVoiceInput.js           # 음성 입력 (Web Speech API + Whisper)
    │       └── useVoiceConfirm.js         # 음성 이체 확인 훅
    └── vercel.json
```

---

## 개발자

**황원철** — [@yalkongs](https://x.com/yalkongs)
