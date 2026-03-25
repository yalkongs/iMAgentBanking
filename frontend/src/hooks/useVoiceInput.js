import { useState, useRef, useCallback } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || ''

// ── Whisper 폴백용 유틸 ──
function getSupportedMimeType() {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  return ''
}

function mimeToExt(mimeType) {
  if (mimeType.includes('mp4')) return 'mp4'
  if (mimeType.includes('ogg')) return 'ogg'
  return 'webm'
}

const hasSpeechAPI = typeof window !== 'undefined' &&
  !!(window.SpeechRecognition || window.webkitSpeechRecognition)

export function useVoiceInput(onTranscript) {
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState(null)
  const recognitionRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])

  // ── 1. Web Speech API — 실시간 스트리밍 (iOS Safari / Chrome) ──
  const startStreaming = useCallback(() => {
    setError(null)
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SR()
    recognition.lang = 'ko-KR'
    recognition.continuous = false    // 자연스러운 발화 종료 감지
    recognition.interimResults = true // 말하는 동안 중간 결과 실시간 전달

    recognition.onresult = (event) => {
      let interim = ''
      let final = ''
      for (const result of event.results) {
        if (result.isFinal) final += result[0].transcript
        else interim += result[0].transcript
      }
      // 중간 결과도 입력창에 즉시 반영 (스트리밍 효과)
      onTranscript(final || interim)
    }

    recognition.onend = () => setIsRecording(false)

    recognition.onerror = (event) => {
      if (event.error !== 'no-speech') {
        setError('음성 인식 오류: ' + event.error)
      }
      setIsRecording(false)
    }

    recognition.start()
    recognitionRef.current = recognition
    setIsRecording(true)
  }, [onTranscript])

  const stopStreaming = useCallback(() => {
    recognitionRef.current?.stop()
    setIsRecording(false)
  }, [])

  // ── 2. Whisper 폴백 — 녹음 후 전송 (Web Speech API 미지원 브라우저) ──
  const startWhisper = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = getSupportedMimeType()
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {})
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const actualMime = mediaRecorder.mimeType || mimeType || 'audio/webm'
        const ext = mimeToExt(actualMime)
        const blob = new Blob(chunksRef.current, { type: actualMime })
        const formData = new FormData()
        formData.append('audio', blob, `audio.${ext}`)

        try {
          const res = await fetch(`${API_BASE}/api/whisper`, { method: 'POST', body: formData })
          const data = await res.json()
          if (data.text) onTranscript(data.text)
          else setError('음성 인식 결과가 없습니다.')
        } catch (err) {
          setError('음성 인식 실패: ' + err.message)
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (err) {
      setError('마이크 접근 실패: ' + err.message)
    }
  }, [onTranscript])

  const stopWhisper = useCallback(() => {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
  }, [])

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      if (hasSpeechAPI) stopStreaming()
      else stopWhisper()
    } else {
      if (hasSpeechAPI) startStreaming()
      else startWhisper()
    }
  }, [isRecording, startStreaming, stopStreaming, startWhisper, stopWhisper])

  const stopRecording = useCallback(() => {
    if (hasSpeechAPI) stopStreaming()
    else stopWhisper()
  }, [stopStreaming, stopWhisper])

  return { isRecording, toggleRecording, stopRecording, error }
}
