import { useEffect, useRef } from 'react'

// iM뱅크 teal + UI accent purple 팔레트
const BLOBS = [
  { x: 0.15, y: 0.25, r: 0.55, color: [0, 201, 167],   dx:  0.000055, dy:  0.000038, phase: 0.0   },
  { x: 0.82, y: 0.65, r: 0.48, color: [129, 140, 248],  dx: -0.000042, dy:  0.000060, phase: 2.1   },
  { x: 0.50, y: 0.05, r: 0.40, color: [0, 229, 190],    dx:  0.000030, dy: -0.000045, phase: 4.2   },
  { x: 0.05, y: 0.85, r: 0.35, color: [99, 102, 241],   dx:  0.000068, dy:  0.000025, phase: 1.5   },
]

const PARTICLE_COUNT = 36

function initParticles() {
  return Array.from({ length: PARTICLE_COUNT }, () => ({
    x: Math.random(),
    y: Math.random(),
    size: Math.random() * 1.2 + 0.4,
    baseOpacity: Math.random() * 0.35 + 0.10,
    dx: (Math.random() - 0.5) * 0.000025,
    dy: (Math.random() - 0.5) * 0.000025,
    phase: Math.random() * Math.PI * 2,
  }))
}

export default function AnimatedBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId
    let t = 0

    // 블롭 상태를 로컬 복사 (원본 BLOBS 불변 유지)
    const blobs = BLOBS.map((b) => ({ ...b }))
    const particles = initParticles()

    const resize = () => {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const LINK_DIST  = 110   // px — 이 거리 이하일 때 선 연결
    const LINK_ALPHA = 0.06  // 최대 선 투명도

    const draw = () => {
      const w = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, w, h)

      // ── Aurora blobs ─────────────────────────
      for (const b of blobs) {
        b.x += b.dx
        b.y += b.dy
        if (b.x < -0.1 || b.x > 1.1) b.dx *= -1
        if (b.y < -0.1 || b.y > 1.1) b.dy *= -1

        // 호흡 효과: 반지름·투명도가 sin 주기로 미세하게 변동
        const breath = Math.sin(t * 0.0008 + b.phase)
        const opacity = 0.055 + breath * 0.018

        const gx = b.x * w
        const gy = b.y * h
        const gr = b.r * Math.max(w, h) * (1 + breath * 0.04)

        const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr)
        grad.addColorStop(0,   `rgba(${b.color.join(',')}, ${opacity})`)
        grad.addColorStop(0.5, `rgba(${b.color.join(',')}, ${opacity * 0.3})`)
        grad.addColorStop(1,   `rgba(${b.color.join(',')}, 0)`)

        ctx.fillStyle = grad
        ctx.fillRect(0, 0, w, h)
      }

      // ── Particles ─────────────────────────────
      for (const p of particles) {
        p.x += p.dx
        p.y += p.dy
        if (p.x < 0) p.x = 1
        if (p.x > 1) p.x = 0
        if (p.y < 0) p.y = 1
        if (p.y > 1) p.y = 0

        const flicker = 0.7 + 0.3 * Math.sin(t * 0.002 + p.phase)
        const alpha   = p.baseOpacity * flicker

        ctx.beginPath()
        ctx.arc(p.x * w, p.y * h, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(0, 210, 175, ${alpha})`
        ctx.fill()
      }

      // ── Neural connections ─────────────────────
      ctx.lineWidth = 0.6
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx   = (particles[i].x - particles[j].x) * w
          const dy   = (particles[i].y - particles[j].y) * h
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < LINK_DIST) {
            const a = LINK_ALPHA * (1 - dist / LINK_DIST)
            ctx.beginPath()
            ctx.moveTo(particles[i].x * w, particles[i].y * h)
            ctx.lineTo(particles[j].x * w, particles[j].y * h)
            ctx.strokeStyle = `rgba(0, 201, 167, ${a})`
            ctx.stroke()
          }
        }
      }

      t++
      animId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animId)
      ro.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  )
}
