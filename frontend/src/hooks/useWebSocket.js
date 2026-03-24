import { useEffect, useRef, useCallback } from 'react'

function getWsUrl(sessionId) {
  const base = import.meta.env.VITE_WS_URL
  if (base) return `${base}?sessionId=${sessionId}`
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${location.host}/ws?sessionId=${sessionId}`
}

export function useWebSocket(sessionId, onMessage) {
  const wsRef = useRef(null)
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(getWsUrl(sessionId))
    wsRef.current = ws

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        onMessageRef.current(data)
      } catch {}
    }

    ws.onclose = () => {
      setTimeout(connect, 3000)
    }
  }, [sessionId])

  useEffect(() => {
    connect()
    return () => {
      wsRef.current?.close()
    }
  }, [connect])
}
