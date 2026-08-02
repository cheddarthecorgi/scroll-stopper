"use client"

import { useEffect, useRef, useState } from "react"
import { Brain, ShieldCheck } from "lucide-react"
import { FEED_SCROLL_ID, useProgress } from "@/components/progress-provider"

const PAUSE_SECONDS = 5

/**
 * Safety guardrail. Fires when the learner blows past three reels in a row
 * without attempting a challenge — the doomscroll pattern the app exists to
 * interrupt. The dismiss button stays disabled for the full countdown.
 */
export function MindfulPause() {
  const { pauseOpen, mindfulPauses } = useProgress()
  if (!pauseOpen) return null
  // Remount per pause so the countdown starts fresh without resetting state
  // from inside an effect.
  return <PauseDialog key={mindfulPauses} />
}

function PauseDialog() {
  const { dismissPause, activeIndex, scrollToReel } = useProgress()
  const [remaining, setRemaining] = useState(PAUSE_SECONDS)
  const dismissRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining((r) => (r <= 1 ? 0 : r - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Move focus onto the modal once it becomes actionable.
  useEffect(() => {
    if (remaining === 0) dismissRef.current?.focus()
  }, [remaining])

  /*
   * Freeze the feed itself, not just <body> — the reels live in a nested
   * scroll container, so locking the body alone would let the learner keep
   * scrolling straight past the guardrail.
   */
  useEffect(() => {
    if (typeof document === "undefined") return
    const feed = document.getElementById(FEED_SCROLL_ID)
    const previousBody = document.body.style.overflow
    const previousFeed = feed?.style.overflow ?? ""

    document.body.style.overflow = "hidden"
    if (feed) feed.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = previousBody
      if (feed) feed.style.overflow = previousFeed
    }
  }, [])

  const progress = ((PAUSE_SECONDS - remaining) / PAUSE_SECONDS) * 100
  const ready = remaining === 0

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="mindful-pause-title"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-zinc-950/90 p-5 backdrop-blur-md"
    >
      <div className="w-full max-w-sm animate-[risein_400ms_ease-out] rounded-3xl border border-indigo-400/30 bg-zinc-900/95 p-6 text-center shadow-2xl">
        {/* Breathing ring */}
        <div className="relative mx-auto mb-5 flex size-24 items-center justify-center">
          <span className="absolute inset-0 animate-[breathe_4s_ease-in-out_infinite] rounded-full bg-indigo-500/20" />
          <span className="absolute inset-3 animate-[breathe_4s_ease-in-out_infinite_200ms] rounded-full bg-indigo-500/25" />
          <Brain className="relative size-9 text-indigo-300" />
        </div>

        <h2 id="mindful-pause-title" className="text-lg font-bold text-zinc-100">
          Mindful Pause
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-zinc-400 text-pretty">
          You scrolled past three reels without trying a challenge. That&apos;s the pattern this app
          exists to break — take five seconds, then pick one and actually solve it.
        </p>

        <div className="mt-5 flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-left">
          <ShieldCheck className="size-4 shrink-0 text-emerald-400" />
          <p className="text-[11px] leading-tight text-zinc-500">
            Your Cognitive Safety Index took a hit. Clearing challenges brings it back up.
          </p>
        </div>

        {/* Countdown */}
        <div
          className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Pause countdown"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-[width] duration-1000 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        <button
          ref={dismissRef}
          type="button"
          onClick={() => {
            dismissPause()
            // Send them back to the reel they skipped past, not further down.
            scrollToReel(activeIndex)
          }}
          disabled={!ready}
          className={`mt-4 w-full rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
            ready
              ? "bg-emerald-400 text-zinc-950 hover:bg-emerald-300 active:scale-[0.98]"
              : "cursor-not-allowed bg-zinc-800 text-zinc-500"
          }`}
        >
          {ready ? "I'm ready — show me the challenge" : `Breathe… ${remaining}s`}
        </button>
      </div>
    </div>
  )
}
