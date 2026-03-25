# TODOS

## TODO-1: 데모 당일 체크리스트 작성

**What:** 데모 전 준비 사항을 1-페이지 체크리스트로 정리.
**Why:** InsightCard 로딩 타임아웃, Railway cold start, 세션 초기화 등을 놓치면 임원 앞에서 빈 화면이나 스피너만 보인다.
**Pros:** 데모 실패 리스크를 제로에 가깝게 줄임.
**Cons:** 작성 시간 5분.
**Context:**
- InsightCard: /api/insights는 Claude 3번 호출 (~5초). 앱을 30초 전 미리 열어두어야 로딩 완료.
- Railway cold start: 무료 플랜은 15분 이상 미접속 시 sleep. 데모 직전 한 번 대화해두기.
- git init + 초기 커밋 완료 여부 확인.
- 환경변수 확인: ANTHROPIC_API_KEY, OPENAI_API_KEY (Whisper용).
**Effort:** S (human: ~5min / CC: N/A)
**Priority:** P1 (데모 전 필수)
**Depends on:** 구현 완료 후

---

## TODO-2: Railway 워밍업 cron 설정

**What:** cron-job.org (또는 유사 서비스)에서 20분마다 Railway 백엔드의 `/api/proactive`를 GET 요청.
**Why:** Railway 무료 플랜은 15분 이상 트래픽이 없으면 서버가 sleep 상태로 전환되어 WebSocket 연결이 완전히 실패함. 데모에서 TRANSACTION_ALERT가 동작하지 않을 수 있다.
**Pros:** Cold start 없이 항상 응답 준비 상태. 무료.
**Cons:** cron-job.org 계정 필요.
**Context:**
- 대상 URL: `https://{railway-backend-url}/api/proactive`
- 간격: 20분 (Railway sleep 기준 15분보다 짧게)
- CEO 리뷰에서 결정됨 (2026-03-24).
**Effort:** S (human: ~10min / CC: N/A, 외부 서비스 설정)
**Priority:** P1 (데모 전 필수)
**Depends on:** Railway 배포 완료

---

## TODO-3: 음성 인식/TTS 실패 이벤트 로깅

**What:** `useVoiceConfirm.js`와 `speakKorean()` 함수에 `console.error` 최소 로깅 추가.
**Why:** 데모 시연 중 음성 인식이나 TTS가 조용히 실패해도 원인 파악 불가. DevTools 없이 현장 디버깅 불가능.
**Pros:** 데모 안정성 향상, 이슈 발생 시 빠른 원인 파악.
**Cons:** 거의 없음 — S급 추가 작업.
**Context:**
- `useVoiceConfirm`: `SpeechRecognitionError` 발생 시 error.error 코드 로깅
- `speakKorean()`: try-catch 미적용 시 TTS 실패가 무음으로 넘어감
- CEO 리뷰 2026-03-25 결정.
**Effort:** S (human: ~15min / CC+gstack: ~5min)
**Priority:** P2
**Depends on:** Feature A 구현 완료

---

## TODO-4: Railway 워밍업 cron 재확인 (Feature A 완료 후)

**What:** Feature A+B 배포 후 Railway 워밍업 cron이 새 엔드포인트와 함께 정상 동작하는지 확인. 기존 TODO-2의 후속.
**Why:** Feature B의 `/api/chat` 새 툴 핸들러가 cold start 시 처음 호출에 초기화 지연이 생길 수 있음.
**Pros:** 데모 당일 Feature B 첫 호출 지연 없음.
**Cons:** 외부 cron 설정 변경 필요 없음 — 기존 `/api/proactive` ping으로 충분.
**Context:**
- 기존 TODO-2와 동일 cron 사용 가능 (경로 변경 없음)
- Feature A+B 배포 완료 후 확인 체크만 필요
- CEO 리뷰 2026-03-25 결정.
**Effort:** S (human: ~5min)
**Priority:** P2
**Depends on:** Feature A+B 배포 완료
