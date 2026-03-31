# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**zb**는 iM뱅크 AI 금융 어시스턴트 데모 앱이다. 자연어로 잔액 조회, 이체, 지출 분석을 수행하며, 실시간 입출금 알림(WebSocket)과 AI 인사이트(Claude API)를 제공한다.

## Commands

### Backend (`/backend`)
```bash
npm run dev      # 개발 서버 (node --watch, 포트 3001)
npm start        # 프로덕션 서버
npm test         # vitest run (단일 실행)
npx vitest run src/tests/core.test.js  # 특정 테스트 파일 실행
```

### Frontend (`/frontend`)
```bash
npm run dev      # Vite 개발 서버 (포트 5173)
npm run build    # dist/ 빌드
npm run preview  # 빌드 결과물 미리보기
```

### 환경변수 (backend `.env`)
```
ANTHROPIC_API_KEY=      # Claude API (chat, insights, 거래 코멘트)
OPENAI_API_KEY=         # Whisper 음성 인식
BLOB_READ_WRITE_TOKEN=  # Vercel Blob 대화 아카이빙 (선택)
PORT=3001               # 선택사항, 기본 3001
```

### 환경변수 (frontend `.env`)
```
VITE_API_URL=    # 백엔드 REST URL (예: https://xxx.railway.app)
VITE_WS_URL=     # 백엔드 WebSocket URL (예: wss://xxx.railway.app/ws)
```

## Architecture

### Backend (`backend/src/`)
- **`server.js`**: Express + WebSocket 서버. 모든 API 라우트, 세션 관리, 백그라운드 시뮬레이터, System Prompt 포함. `UI_CARD_TOOLS` 배열로 카드 자동 라우팅 제어.
- **`tools.js`**: Claude Tool Use 정의(`toolDefinitions`)와 각 툴 핸들러(`handleToolCall`). `aliasStore`(닉네임→실명 매핑)는 메모리 Map으로 세션별 관리.
- **`products.js`**: iM뱅크 상품 DB. 예금/적금/대출/카드/IRP·ISA 총 20개 상품. `searchProducts({ type, keyword })`, `getProductById(id)` 함수 export.
- **`mockData.js`**: 가상 계좌/거래/카드/연락처 데이터. `getInitialAccounts()` / `getInitialTransactions()`으로 리셋 가능.
- **`tests/core.test.js`**: vitest 단위 테스트 (alertId 연결, 데이터 리셋, 후보 메시지 형식 검증).

### API 엔드포인트
- **`POST /api/chat`**: SSE 스트리밍. Claude Tool Use 루프(`while continueLoop`) — 텍스트 델타는 `{type:'text'}`, 툴 호출은 `{type:'tool_call'}`, UI 카드 데이터는 `{type:'ui_card', cardType, data}`로 전송.
- **`POST /api/whisper`**: multer로 audio 수신 → OpenAI Whisper STT → `{text}` 반환.
- **`GET /api/insights`**: Claude 3회 호출로 지출 인사이트 JSON 배열 반환 (~5초 소요).
- **`GET /api/proactive`**: Railway sleep 방지용 워밍업 엔드포인트.
- **`POST /api/reset-mock`**: 계좌/거래/aliasStore 초기화.
- **`POST /api/confirm-transfer`**: 프론트 확인 후 실제 이체 실행.

### 이체 흐름 (2단계)
`transfer` 툴은 인터셉트되어 즉시 실행되지 않고 WebSocket으로 `PENDING_TRANSFER` 이벤트를 프론트에 전송 → 사용자 확인 후 `POST /api/confirm-transfer`로 실제 실행.

### WebSocket 이벤트 타입
- `TRANSACTION_ALERT` + `TRANSACTION_ALERT_COMMENT`: 90초 간격 백그라운드 거래 시뮬레이터. alertId로 두 이벤트를 연결해 코멘트를 나중에 붙임.
- `FINANCIAL_MOMENT`: 3분 간격 급여/카드대금 알림 시뮬레이터.
- `PENDING_TRANSFER`: 이체 확인 요청 (sessionId 1:1 매핑).

WebSocket 연결은 `sessionId` 쿼리 파라미터로 클라이언트와 1:1 매핑. `wsClients` Map에 저장.

### Frontend (`frontend/src/`)
- **`App.jsx`**: 메인 컴포넌트. SSE 스트리밍 파싱, 메시지 상태, 데모 모드(자동 시나리오 재생), 음성 모드 관리.
- **`hooks/useWebSocket.js`**: sessionId 기반 WebSocket 연결. 끊기면 3초 후 재연결.
- **`hooks/useVoiceInput.js`**: MediaRecorder → `/api/whisper`로 Whisper STT.
- **`hooks/useVoiceConfirm.js`**: 음성 이체 확인 "네"/"아니오" 감지.
- **`components/Message.jsx`**: SSE `cardType`에 따라 적절한 카드 컴포넌트로 디스패치. 새 카드 추가 시 여기에 매핑 추가.
- **주요 카드 컴포넌트**: `BalanceCard`, `SpendingCard`, `TransactionList`, `TransferCard`, `InsightCard`, `TransactionAlertCard`, `FinancialMomentCard`, `FinancialStoryCard`, `SavingsInsightCard`, `ProductCompareCard`, `ProductListCard`, `ProductDetailCard`, `ContactCandidatesCard`, `TransferSuggestionCard`, `TransferReceiptCard`, `VoiceOverlay`.

### UI 카드 매핑
`server.js`의 `UI_CARD_TOOLS` 배열에 포함된 툴은 결과가 자동으로 `{type:'ui_card', cardType, data}` SSE 이벤트로 전송된다. `transfer`는 별도 `PENDING_TRANSFER` WebSocket 이벤트로 처리. 새 툴을 카드로 렌더링하려면 `UI_CARD_TOOLS` 추가 → `Message.jsx` 매핑 추가 → 카드 컴포넌트 작성 3단계 필요.

### Working Memory Model (GUI ↔ Chat 통합)
`buildSystemPrompt(guiContext)` 함수가 현재 화면 상태를 `[CURRENT_VIEW]` 블록으로 System Prompt에 주입. 메시지 히스토리는 유지(장기 기억), System Prompt만 교체(작업 기억). GUI 드릴다운 탐색이 채팅 히스토리를 오염시키지 않도록 격리.

### 대화 아카이빙
`BLOB_READ_WRITE_TOKEN` 환경변수가 있으면 `/api/chat` 요청마다 Vercel Blob에 `archive/{date}/{sessionId}/{timestamp}.json`으로 백그라운드 저장.

## Tool Use 정의 (tools.js)
Claude가 호출 가능한 툴 목록 (총 13개):

| 툴 | 용도 |
|---|---|
| `get_balance` | 계좌 잔액 조회 |
| `get_transactions` | 거래내역 조회 |
| `get_card_transactions` | 카드 거래내역 |
| `analyze_spending` | 지출 분석 |
| `analyze_card_spending` | 카드 지출 분석 |
| `resolve_contact` | 연락처 이름→계좌 해석 |
| `save_alias` | 닉네임 저장 |
| `get_transfer_suggestion` | 이체 제안 |
| `transfer` | 이체 실행 (인터셉트 방식) |
| `complex_query` | 복합 자연어 쿼리 |
| `get_monthly_story` | 월간 금융 스토리 |
| `get_savings_advice` | 절약 조언 + 상품 비교 |
| `search_products` | iM뱅크 상품 검색 (type: deposit/savings/loan/credit_card/debit_card/investment) |
| `get_product_detail` | 상품 상세 조회 (product_id) |

이체 전 resolve_contact → (필요시 save_alias) → get_transfer_suggestion → transfer 순서를 System Prompt에서 강제한다.

상품 조회 시 search_products → get_product_detail 순서. System Prompt에 상품 타입별 검색 전략 포함.

## Deployment

- **Backend**: Railway (`railway.toml` — nixpacks 빌드, `node src/server.js` 시작)
- **Frontend**: Vercel (`vercel.json` — Vite 빌드, SPA rewrite)
- Railway 무료 플랜은 15분 미접속 시 sleep → `/api/proactive`를 20분 간격으로 외부 cron으로 워밍업 필요.
- `/api/insights`는 Claude를 3회 호출(~5초) — 데모 전 미리 앱을 열어 로딩 완료 후 시연.
- 백엔드는 ESM(`"type": "module"`) 사용 — `require()` 불가, `import` 사용.
