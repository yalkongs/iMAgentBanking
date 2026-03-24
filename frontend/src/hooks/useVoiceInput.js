import { useState, useRef, useCallback } from 'react'

export function useVoiceInput(onTranscript) {
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState(null)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])

  const startRecording = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const formData = new FormData()
        formData.append('audio', blob, 'audio.webm')

        try {
          const res = await fetch('/api/whisper', { method: 'POST', body: formData })
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

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
  }, [])

  const toggleRecording = useCallback(() => {
    if (isRecording) stopRecording()
    else startRecording()
  }, [isRecording, startRecording, stopRecording])

  return { isRecording, toggleRecording, error }
}
