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
import { STORAGE_KEYS, readJSON, writeJSON } from "@/lib/storage"

/** A reel is "skipped" when the learner leaves it faster than this without running code. */
const SKIP_DWELL_MS = 6000
/** Consecutive skips that trigger the Mindful Pause guardrail. */
const SKIPS_BEFORE_PAUSE = 3
/** Delay between clearing a challenge and auto-advancing to the next reel. */
export const AUTO_SCROLL_DELAY_MS = 1500
/** id of the snap-scroll container, so the guardrail can freeze it. */
export const FEED_SCROLL_ID = "reel-feed-scroll"

const XP_PER_LEVEL = 300
const BASE_SAFETY_INDEX = 98

/** The slice written to localStorage. Transient UI state is deliberately excluded. */
type Persisted = {
  /** Reel index → XP awarded (full or partial). */
  awarded: Record<string, number>
  /** Reel indices where the learner has run code at least once. */
  attempted: number[]
  unlockedIndex: number
  mindfulPauses: number
}

type State = Persisted & {
  activeIndex: number
  skipCount: number
  pauseOpen: boolean
  hydrated: boolean
}

const EMPTY_PERSISTED: Persisted = {
  awarded: {},
  attempted: [],
  unlockedIndex: 0,
  mindfulPauses: 0,
}

const INITIAL: State = {
  ...EMPTY_PERSISTED,
  activeIndex: 0,
  skipCount: 0,
  pauseOpen: false,
  hydrated: false,
}

type Action =
  | { type: "hydrate"; saved: Partial<Persisted> }
  | { type: "visit"; index: number; prev: number; dwell: number }
  | { type: "attempt"; index: number }
  | { type: "pass"; index: number; xp: number }
  | { type: "dismissPause" }
  | { type: "reset" }

/**
 * Pure reducer — every transition, including opening the guardrail, is derived
 * from state so nothing has to fire as a side effect during render.
 */
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "hydrate":
      return { ...state, ...EMPTY_PERSISTED, ...action.saved, hydrated: true }

    case "visit": {
      if (state.activeIndex === action.index) return state
      const next = { ...state, activeIndex: action.index }

      // Reading the previous reel, or having tried its challenge, breaks the skip run.
      const engaged =
        state.attempted.includes(action.prev) || action.dwell >= SKIP_DWELL_MS
      if (engaged) return next.skipCount === 0 ? next : { ...next, skipCount: 0 }

      const skipCount = state.skipCount + 1
      if (skipCount >= SKIPS_BEFORE_PAUSE) {
        return {
          ...next,
          skipCount: 0,
          mindfulPauses: state.mindfulPauses + 1,
          pauseOpen: true,
        }
      }
      return { ...next, skipCount }
    }

    case "attempt":
      return {
        ...state,
        skipCount: 0,
        attempted: state.attempted.includes(action.index)
          ? state.attempted
          : [...state.attempted, action.index],
      }

    case "pass": {
      const key = String(action.index)
      const previous = state.awarded[key] ?? 0
      return {
        ...state,
        // Never downgrade an award — re-running a solved reel can't cost XP.
        awarded: { ...state.awarded, [key]: Math.max(previous, action.xp) },
        attempted: state.attempted.includes(action.index)
          ? state.attempted
          : [...state.attempted, action.index],
        unlockedIndex: Math.max(
          state.unlockedIndex,
          Math.min(action.index + 1, feedData.length - 1),
        ),
        skipCount: 0,
      }
    }

    case "dismissPause":
      return state.pauseOpen ? { ...state, pauseOpen: false } : state

    case "reset":
      return { ...INITIAL, hydrated: true }

    default:
      return state
  }
}

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
  const enteredAt = useRef(0)
  const activeIndexRef = useRef(0)
  const autoScrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load persisted progress once, on the client only.
  useEffect(() => {
    const saved = readJSON<Partial<Persisted>>(STORAGE_KEYS.progress, EMPTY_PERSISTED)
    enteredAt.current = Date.now()
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
    const dwell = Date.now() - enteredAt.current
    enteredAt.current = Date.now()

    dispatch({ type: "visit", index, prev, dwell })
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
    activeIndexRef.current = 0
    enteredAt.current = Date.now()
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
