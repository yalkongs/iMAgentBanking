import { useEffect, useCallback } from 'react'

// 상태 레이블
const STATE_LABEL = {
  IDLE:       '마이크를 탭해서 말씀하세요',
  RECORDING:  '듣고 있어요…',
  PROCESSING: 'AI가 처리 중…',
  SPEAKING:   'AI가 답변 중…',
  ERROR:      '인식 실패 — 다시 시도',
}

export default function VoiceOverlay({ state, onClose, onMicTap }) {
  // Esc 키로 닫기
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="voice-overlay" role="dialog" aria-modal="true" aria-label="음성 모드">
      {/* 닫기 버튼 */}
      <button
        className="voice-overlay-close"
        onClick={onClose}
        aria-label="음성 모드 종료"
      >
        ✕
      </button>

      {/* 중앙 영역 */}
      <div className="voice-overlay-center">
        <MicVisual state={state} onMicTap={onMicTap} />

        <p className="voice-overlay-label">
          {STATE_LABEL[state] || STATE_LABEL.IDLE}
        </p>

        {state === 'RECORDING' && (
          <div className="voice-waveform" aria-hidden="true">
            {[...Array(7)].map((_, i) => (
              <span key={i} className="voice-bar" style={{ animationDelay: `${i * 0.08}s` }} />
            ))}
          </div>
        )}

        {state === 'SPEAKING' && (
          <div className="voice-waveform voice-waveform--speaking" aria-hidden="true">
            {[...Array(9)].map((_, i) => (
              <span key={i} className="voice-bar" style={{ animationDelay: `${i * 0.06}s` }} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MicVisual({ state, onMicTap }) {
  const isError = state === 'ERROR'
  const isActive = state === 'RECORDING'

  return (
    <button
      className={`voice-mic-btn${isActive ? ' voice-mic-btn--active' : ''}${isError ? ' voice-mic-btn--error' : ''}`}
      onClick={onMicTap}
      aria-label={isActive ? '녹음 중지' : '녹음 시작'}
    >
      {state === 'PROCESSING' ? (
        <span className="voice-spinner" aria-label="처리 중" />
      ) : (
        <MicIcon />
      )}
    </button>
  )
}

function MicIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="9" y1="22" x2="15" y2="22" />
    </svg>
  )
}
