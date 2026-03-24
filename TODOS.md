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
