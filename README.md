# iMAgentBanking

iM뱅크 AI 금융 어시스턴트 데모 앱. 자연어로 잔액 조회, 이체, 지출 분석을 수행하며 Claude AI와 실시간으로 대화합니다.

**Live Demo**: https://frontend-seven-beta-54.vercel.app

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| 자연어 금융 조회 | "이번 달 얼마 썼어?", "잔액 알려줘" 등 일상적인 말로 조회 |
| 실시간 이체 | 스와이프 제스처로 이체 확인 — 버튼 없이 슬라이드로 승인 |
| 음성 입력 | 마이크 버튼 탭 → Whisper STT → 자동 전송 |
| TTS 읽기 | AI 응답을 한국어로 음성 읽기 (Web Speech API) |
| 재무 모멘트 알림 | 급여 입금, 카드 결제일 D-3, 과소비 감지 실시간 푸시 |
| 이달의 재무 스토리 | "이번 달 어땠어?" → 서사형 월간 요약 카드 |
| 재무 건강 지수 | 저축률·자산 기반 0~100점 건강 점수 (헤더 표시) |
| 컨텍스트 퀵숏컷 | 마지막 조회 항목에 따라 관련 단축 버튼 자동 변경 |
| 카드-대화 브릿지 | 거래내역·지출 항목 탭 → 관련 질문 자동 입력 |

---

## 기술 스택

**Frontend**
- React + Vite (모바일 최적화, max-width 480px)
- CSS Custom Properties 기반 금융 전용 디자인 시스템
- Web Speech API (TTS), MediaRecorder (음성 녹음)

**Backend**
- Node.js + Express (SSE 스트리밍)
- WebSocket (실시간 알림)
- Claude API (Tool Use, claude-3-5-sonnet)
- OpenAI Whisper (음성 인식)
- Vercel Blob (대화 아카이브)

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

### 아카이브 데이터 활용

**1. Vercel Blob 대시보드 조회**
Vercel 프로젝트 대시보드 → Storage → Blob에서 파일 목록과 내용 확인

**2. API로 직접 조회**
```bash
# Vercel Blob List API
curl "https://api.vercel.com/v1/blob?prefix=archive/2026-03-25/" \
  -H "Authorization: Bearer $VERCEL_TOKEN"
```

**3. 분석 활용 예시**
```javascript
// 날짜별 대화량 집계
// 자주 쓰는 기능 파악 (toolCalls 분석)
// 사용자 질문 패턴 분석 (userMessage 텍스트 마이닝)
// AI 응답 품질 평가 (assistantText 리뷰)
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
│   │   ├── tools.js       # Claude Tool Use 핸들러
│   │   └── mockData.js    # 가상 계좌/거래/카드 데이터 (6개월치)
│   ├── .env.example
│   └── railway.toml
└── frontend/
    ├── src/
    │   ├── App.jsx                        # 메인 컴포넌트
    │   ├── styles.css                     # 금융 전용 디자인 시스템
    │   ├── components/
    │   │   ├── BalanceCard.jsx            # 계좌 잔액 카드
    │   │   ├── TransactionList.jsx        # 거래내역 (날짜 그룹핑)
    │   │   ├── SpendingCard.jsx           # 지출 분석
    │   │   ├── TransferCard.jsx           # 스와이프 이체 확인
    │   │   ├── FinancialMomentCard.jsx    # 실시간 재무 알림
    │   │   └── FinancialStoryCard.jsx     # 월간 재무 스토리
    │   └── hooks/
    │       ├── useWebSocket.js            # 실시간 WebSocket 연결
    │       └── useVoiceInput.js           # 음성 입력 (Whisper)
    └── vercel.json
```
