import { useEffect, useRef, useCallback } from 'react'

const hasSpeechAPI = typeof window !== 'undefined' &&
  !!(window.SpeechRecognition || window.webkitSpeechRecognition)

/**
 * 음성으로 이체 확인을 처리하는 훅
 * voiceMode가 true이고 isActive일 때 음성 인식 시작
 * "네" / "확인" → onConfirm, "아니오" / "취소" → onCancel, 5초 타임아웃 → onTimeout
 */
export function useVoiceConfirm({ isActive, onConfirm, onCancel, onTimeout, timeoutMs = 5000 }) {
  const recognitionRef = useRef(null)
  const timerRef = useRef(null)

  const stop = useCallback(() => {
    clearTimeout(timerRef.current)
    try { recognitionRef.current?.stop() } catch (_) {}
    recognitionRef.current = null
  }, [])

  useEffect(() => {
    if (!isActive || !hasSpeechAPI) return

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SR()
    recognition.lang = 'ko-KR'
    recognition.continuous = false
    recognition.interimResults = false
    recognitionRef.current = recognition

    recognition.onresult = (event) => {
      clearTimeout(timerRef.current)
      const text = event.results[0]?.[0]?.transcript?.trim() ?? ''
      const yes = /^(네|예|응|확인|이체|보내|보냄|맞아|맞아요|진행|오케이|ok)/.test(text)
      const no = /^(아니|취소|안돼|안 돼|No|노|중단)/.test(text)
      if (yes) { stop(); onConfirm?.() }
      else if (no) { stop(); onCancel?.() }
      // 인식됐지만 yes/no 모두 아닌 경우 → 타임아웃 재시작
      else {
        timerRef.current = setTimeout(() => { stop(); onTimeout?.() }, timeoutMs)
      }
    }

    recognition.onerror = (event) => {
      console.error('[useVoiceConfirm] SpeechRecognitionError:', event.error)
      clearTimeout(timerRef.current)
      stop()
      onTimeout?.()
    }

    recognition.onend = () => {
      recognitionRef.current = null
    }

    recognition.start()

    timerRef.current = setTimeout(() => {
      stop()
      onTimeout?.()
    }, timeoutMs)

    return stop
  }, [isActive]) // eslint-disable-line react-hooks/exhaustive-deps

  return { stop }
}
