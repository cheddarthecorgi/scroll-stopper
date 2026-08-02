"use client"

import { useEffect, useRef } from "react"
import { useProgress } from "@/components/progress-provider"

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  rotation: number
  spin: number
  color: string
  life: number
}

const FULL_COLORS = ["#34d399", "#6366f1", "#fbbf24", "#f472b6", "#22d3ee", "#a3e635"]
const PARTIAL_COLORS = ["#fbbf24", "#f59e0b", "#fcd34d", "#eab308"]
const GRAVITY = 0.18
const DRAG = 0.992
const LIFE_FRAMES = 150

/**
 * Full-screen celebration: a confetti burst plus a floating XP counter.
 * Rendered once at the app root and driven by `celebration` from the provider,
 * so it survives the reel auto-scrolling away underneath it.
 */
export function CelebrationOverlay() {
  const { celebration, clearCelebration } = useProgress()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef<number>(0)

  const nonce = celebration?.nonce ?? 0
  const partial = celebration?.partial ?? false
  const xp = celebration?.xp ?? 0

  useEffect(() => {
    if (!nonce) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const width = window.innerWidth
    const height = window.innerHeight
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.scale(dpr, dpr)

    const colors = partial ? PARTIAL_COLORS : FULL_COLORS
    const count = reduceMotion ? 0 : partial ? 60 : 140
    const particles: Particle[] = []

    // Two angled jets from the bottom corners, the classic "cannon" look.
    for (let i = 0; i < count; i++) {
      const fromLeft = i % 2 === 0
      const spread = (Math.random() - 0.5) * 1.1
      const speed = 9 + Math.random() * 9
      particles.push({
        x: fromLeft ? width * 0.08 : width * 0.92,
        y: height * 0.92,
        vx: (fromLeft ? 1 : -1) * Math.cos(spread) * speed * (0.5 + Math.random() * 0.6),
        vy: -Math.abs(Math.sin(spread + 1.2)) * speed - 6,
        size: 5 + Math.random() * 6,
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.3,
        color: colors[i % colors.length],
        life: LIFE_FRAMES,
      })
    }

    let alive = true

    function tick() {
      if (!alive || !ctx) return
      ctx.clearRect(0, 0, width, height)

      let visible = 0
      for (const p of particles) {
        p.life -= 1
        if (p.life <= 0) continue
        visible++

        p.vx *= DRAG
        p.vy = p.vy * DRAG + GRAVITY
        p.x += p.vx
        p.y += p.vy
        p.rotation += p.spin

        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)
        ctx.globalAlpha = Math.min(1, p.life / 40)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        ctx.restore()
      }

      if (visible > 0) {
        frameRef.current = requestAnimationFrame(tick)
      } else {
        ctx.clearRect(0, 0, width, height)
      }
    }

    frameRef.current = requestAnimationFrame(tick)

    // Clear the celebration once the badge animation has finished playing.
    const done = setTimeout(clearCelebration, 2200)

    return () => {
      alive = false
      cancelAnimationFrame(frameRef.current)
      clearTimeout(done)
      ctx.clearRect(0, 0, width, height)
    }
  }, [nonce, partial, clearCelebration])

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[60]">
      <canvas ref={canvasRef} className="size-full" />

      {celebration && (
        <>
          {/* Aura pulse tinted to the award tier */}
          <div
            key={`aura-${celebration.nonce}`}
            className={`absolute inset-0 animate-[aura_1.4s_ease-out_forwards] ${
              partial
                ? "bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.28),transparent_65%)]"
                : "bg-[radial-gradient(circle_at_center,rgba(52,211,153,0.3),transparent_65%)]"
            }`}
          />

          {/* Floating XP counter */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              key={`xp-${celebration.nonce}`}
              className="animate-[xpfloat_1.8s_cubic-bezier(0.2,0.8,0.2,1)_forwards] text-center"
            >
              <p
                className={`font-mono text-6xl font-black drop-shadow-[0_0_25px_rgba(0,0,0,0.8)] ${
                  partial ? "text-amber-300" : "text-emerald-300"
                }`}
              >
                +{xp} XP
              </p>
              <p
                className={`mt-1 text-sm font-bold tracking-widest ${
                  partial ? "text-amber-200/90" : "text-emerald-200/90"
                }`}
              >
                {partial ? "PARTIAL CREDIT" : "CHALLENGE CLEARED"}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
