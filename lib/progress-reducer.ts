import { feedData } from "./feed-data.ts"

/** A reel is "skipped" when the learner leaves it faster than this without running code. */
export const SKIP_DWELL_MS = 6000
/** Consecutive skips that trigger the Mindful Pause guardrail. */
export const SKIPS_BEFORE_PAUSE = 3

/** The slice written to localStorage. Transient UI state is deliberately excluded. */
export type Persisted = {
  /** Reel index → XP awarded (full or partial). */
  awarded: Record<string, number>
  /** Reel indices where the learner has run code at least once. */
  attempted: number[]
  unlockedIndex: number
  mindfulPauses: number
}

export type State = Persisted & {
  activeIndex: number
  skipCount: number
  pauseOpen: boolean
  hydrated: boolean
}

export const EMPTY_PERSISTED: Persisted = {
  awarded: {},
  attempted: [],
  unlockedIndex: 0,
  mindfulPauses: 0,
}

export const INITIAL: State = {
  ...EMPTY_PERSISTED,
  activeIndex: 0,
  skipCount: 0,
  pauseOpen: false,
  hydrated: false,
}

export type Action =
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
export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "hydrate":
      return { ...state, ...EMPTY_PERSISTED, ...action.saved, hydrated: true }

    case "visit": {
      const { index, prev, dwell } = action
      if (state.activeIndex === index) return state
      const next = { ...state, activeIndex: index }

      /*
       * Count every reel left behind by this jump, not just `prev`. CSS
       * scroll-snap can carry the viewport straight from reel 0 to reel 3 in
       * one continuous motion without the browser ever sampling reels 1-2 at
       * the IntersectionObserver's 0.6 threshold — so per-reel visit events
       * aren't reliable for catching everything passed through. Deriving the
       * skip weight from index arithmetic instead means a single big jump is
       * caught immediately, with no dependency on intermediate observers
       * having fired. (This is what caused the guardrail to only trigger
       * after scrolling back up: each *individual* hop only ever contributed
       * 1, so a 3-reel jump undercounted until enough small hops piled on.)
       */
      const from = Math.min(prev, index)
      const to = Math.max(prev, index)
      let skipped = 0
      for (let i = from; i <= to; i++) {
        if (i === index) continue // just arrived here — hasn't been "left" yet
        const dwelledOnIt = i === prev && dwell >= SKIP_DWELL_MS
        if (!state.attempted.includes(i) && !dwelledOnIt) skipped++
      }

      if (skipped === 0) {
        return next.skipCount === 0 ? next : { ...next, skipCount: 0 }
      }

      const skipCount = state.skipCount + skipped
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
