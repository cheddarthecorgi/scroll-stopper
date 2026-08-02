"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react"
import { FULL_XP, feedData } from "@/lib/feed-data"
import { EMPTY_PERSISTED, INITIAL, reducer, type Persisted } from "@/lib/progress-reducer"
import { STORAGE_KEYS, readJSON, writeJSON } from "@/lib/storage"

/** Delay between clearing a challenge and auto-advancing to the next reel. */
export const AUTO_SCROLL_DELAY_MS = 1500
/** id of the snap-scroll container, so the guardrail can freeze it. */
export const FEED_SCROLL_ID = "reel-feed-scroll"

const XP_PER_LEVEL = 300
const BASE_SAFETY_INDEX = 98

export type Celebration = { index: number; xp: number; partial: boolean; nonce: number }

type ProgressValue = {
  /** False until localStorage has been read, so the UI can avoid a hydration flash. */
  hydrated: boolean
  awarded: Record<string, number>
  attempted: number[]
  unlockedIndex: number
  activeIndex: number
  xp: number
  level: number
  xpIntoLevel: number
  levelProgress: number
  completedCount: number
  /** Consecutive cleared reels from the top of the feed. */
  streak: number
  minutesAvoided: number
  safetyIndex: number
  mindfulPauses: number
  celebration: Celebration | null
  pauseOpen: boolean
  isComplete: boolean
  setActive: (index: number) => void
  markAttempted: (index: number) => void
  recordPass: (index: number, xp: number, partial: boolean) => void
  dismissPause: () => void
  clearCelebration: () => void
  scrollToReel: (index: number) => void
  resetProgress: () => void
}

const ProgressContext = createContext<ProgressValue | null>(null)

export function useProgress(): ProgressValue {
  const ctx = useContext(ProgressContext)
  if (!ctx) throw new Error("useProgress must be used inside <ProgressProvider>")
  return ctx
}

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL)
  const [celebration, setCelebration] = useState<Celebration | null>(null)

  // Refs are only ever read/written from event handlers and effects, never during render.
  const activeIndexRef = useRef(0)
  const autoScrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load persisted progress once, on the client only.
  useEffect(() => {
    const saved = readJSON<Partial<Persisted>>(STORAGE_KEYS.progress, EMPTY_PERSISTED)
    dispatch({ type: "hydrate", saved })
  }, [])

  // Mirror the persisted slice back out to storage.
  useEffect(() => {
    if (!state.hydrated) return
    writeJSON(STORAGE_KEYS.progress, {
      awarded: state.awarded,
      attempted: state.attempted,
      unlockedIndex: state.unlockedIndex,
      mindfulPauses: state.mindfulPauses,
    } satisfies Persisted)
  }, [
    state.hydrated,
    state.awarded,
    state.attempted,
    state.unlockedIndex,
    state.mindfulPauses,
  ])

  useEffect(() => {
    return () => {
      if (autoScrollTimer.current) clearTimeout(autoScrollTimer.current)
    }
  }, [])

  const scrollToReel = useCallback((index: number) => {
    if (typeof document === "undefined") return
    document.getElementById(`reel-${index}`)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [])

  /** Called by each reel's IntersectionObserver as it snaps into view. */
  const setActive = useCallback((index: number) => {
    const prev = activeIndexRef.current
    if (prev === index) return

    activeIndexRef.current = index
    dispatch({ type: "visit", index, prev })
  }, [])

  const markAttempted = useCallback((index: number) => {
    dispatch({ type: "attempt", index })
  }, [])

  const recordPass = useCallback(
    (index: number, xp: number, partial: boolean) => {
      dispatch({ type: "pass", index, xp })
      setCelebration({ index, xp, partial, nonce: Date.now() })

      if (autoScrollTimer.current) clearTimeout(autoScrollTimer.current)
      // Always advance — past the last reel that means the summary card.
      autoScrollTimer.current = setTimeout(() => scrollToReel(index + 1), AUTO_SCROLL_DELAY_MS)
    },
    [scrollToReel],
  )

  const dismissPause = useCallback(() => dispatch({ type: "dismissPause" }), [])
  const clearCelebration = useCallback(() => setCelebration(null), [])

  const resetProgress = useCallback(() => {
    dispatch({ type: "reset" })
    setCelebration(null)
    /*
     * Deliberately NOT touching activeIndexRef here. Presetting it to 0 before
     * the animated scroll-back plays out used to backfire: scrollIntoView's
     * smooth scroll visibly passes through every reel between wherever the
     * learner was and reel 0, and with the ref already saying "0", each of
     * those intermediate reels (index > 0) read as a forward skip against a
     * just-emptied `attempted` list — reset was tripping its own false skip
     * streak. Left alone, the ref updates naturally as each reel's own
     * IntersectionObserver fires during the transit, so every step is
     * correctly seen as backward (index < prev) and only ever resets the
     * streak, regardless of how many intermediate reels the browser actually
     * samples along the way.
     */
    scrollToReel(0)
  }, [scrollToReel])

  const value = useMemo<ProgressValue>(() => {
    const awardedValues = Object.values(state.awarded)
    const xp = awardedValues.reduce((sum, n) => sum + n, 0)
    const completedCount = awardedValues.length

    // Streak = cleared reels in an unbroken run from the first one.
    let streak = 0
    for (let i = 0; i < feedData.length; i++) {
      if (state.awarded[String(i)] === undefined) break
      streak++
    }

    const minutesAvoided = feedData.reduce(
      (sum, item, i) => (state.awarded[String(i)] !== undefined ? sum + item.minutesSaved : sum),
      0,
    )

    // Focus score: clearing reels nudges it up, skipping and forced pauses drag it down.
    const safetyIndex = Math.max(
      55,
      Math.min(
        100,
        BASE_SAFETY_INDEX + completedCount * 2 - state.skipCount * 4 - state.mindfulPauses * 6,
      ),
    )

    const level = Math.floor(xp / XP_PER_LEVEL) + 3 // players start at Level 3
    const xpIntoLevel = xp % XP_PER_LEVEL

    return {
      hydrated: state.hydrated,
      awarded: state.awarded,
      attempted: state.attempted,
      unlockedIndex: state.unlockedIndex,
      activeIndex: state.activeIndex,
      xp,
      level,
      xpIntoLevel,
      levelProgress: Math.round((xpIntoLevel / XP_PER_LEVEL) * 100),
      completedCount,
      streak,
      minutesAvoided,
      safetyIndex,
      mindfulPauses: state.mindfulPauses,
      celebration,
      pauseOpen: state.pauseOpen,
      isComplete: completedCount === feedData.length,
      setActive,
      markAttempted,
      recordPass,
      dismissPause,
      clearCelebration,
      scrollToReel,
      resetProgress,
    }
  }, [
    state,
    celebration,
    setActive,
    markAttempted,
    recordPass,
    dismissPause,
    clearCelebration,
    scrollToReel,
    resetProgress,
  ])

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}

export { FULL_XP }
