/**
 * Regression suite for the Mindful Pause skip-counting logic.
 *
 * Guards against two real bugs found in testing, both in how a skip "run" is
 * tallied across a fast, multi-reel scroll:
 *
 * 1. The guardrail originally counted a skip only when a reel's own
 *    IntersectionObserver fired, but CSS scroll-snap can carry the viewport
 *    straight past several reels in one continuous motion without ever
 *    sampling the ones in between at the 0.6 visibility threshold. A fast
 *    3-reel skip registered as one skip, not three, and only finished
 *    accumulating once the learner scrolled again (including backward) —
 *    the "have to scroll back up for it to pop up" symptom.
 *
 * 2. The fix for #1 derived skip weight from index arithmetic, but initially
 *    still exempted the reel being left (`prev`) if the learner had dwelled
 *    on it 6+ seconds — which is true in almost every real session (you
 *    always spend a few seconds on the current reel before flicking past the
 *    next few). That silently dropped a real 3-reel skip to 2, so it still
 *    never fired in practice. Dwelling on a reel is not the same as running
 *    its code, and the app's whole premise is "run the code" — so only
 *    `attempted` breaks a skip streak now, not merely having looked at it.
 */
import { INITIAL, reducer, SKIPS_BEFORE_PAUSE, type State } from "../lib/progress-reducer.ts"

let failures = 0
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failures++
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}${detail ? ` — ${detail}` : ""}`)
}

function visit(state: State, index: number, prev: number): State {
  return reducer(state, { type: "visit", index, prev })
}

console.log("\n=== Mindful Pause guardrail ===\n")

// --- Bug #1: one fast jump across 3 unattempted reels, no intermediate events ---
{
  console.log("[1] One continuous jump 0 -> 3 (no intermediate observer firings)")
  const after = visit(INITIAL, 3, 0)
  check("pause opens immediately, in a single jump", after.pauseOpen === true)
  check("mindfulPauses incremented", after.mindfulPauses === 1)
  check("skipCount reset after firing", after.skipCount === 0)
  console.log("")
}

// --- Equivalent behavior when the browser DOES fire every intermediate reel ---
{
  console.log("[2] Same distance via three individual single-step hops")
  let s = INITIAL
  s = visit(s, 1, 0)
  check("1 skip after first hop, no pause yet", s.skipCount === 1 && !s.pauseOpen)
  s = visit(s, 2, 1)
  check("2 skips after second hop, no pause yet", s.skipCount === 2 && !s.pauseOpen)
  s = visit(s, 3, 2)
  check("pause opens on the third hop", s.pauseOpen === true && s.mindfulPauses === 1)
  console.log("")
}

// --- Attempting a reel should exclude it from the skip weight ---
{
  console.log("[3] Attempted reels don't count as skips")
  let s = INITIAL
  s = reducer(s, { type: "attempt", index: 1 }) // learner ran code on reel 1
  const after = visit(s, 3, 0) // then jumps 0 -> 3, passing over 0, 1(attempted), 2
  check("only 2 of 3 passed-over reels count (index 1 was attempted)", after.skipCount === 2)
  check("no pause yet — below threshold", after.pauseOpen === false)
  console.log("")
}

// --- Bug #2: merely dwelling on the origin reel must NOT exempt it ---
{
  console.log("[4] Time spent on the origin reel does not exempt it from the skip count")
  // Simulates the real-world failure: the learner sat on reel 0 reading it for
  // a while (mirrored here by simply not attempting it — the reducer has no
  // concept of elapsed time at all anymore), then flicked past reels 1 and 2
  // straight to reel 3 in one motion.
  const after = visit(INITIAL, 3, 0)
  check(
    "all 3 passed-over reels count, none exempted just for being visited a while",
    after.skipCount === 0 && after.pauseOpen === true,
  )
  console.log("")
}

// --- Engaging resets any partial skip streak ---
{
  console.log("[5] Attempting a challenge resets an in-progress skip streak")
  let s = INITIAL
  s = visit(s, 1, 0)
  s = visit(s, 2, 1)
  check("2 skips accumulated", s.skipCount === 2)
  s = reducer(s, { type: "attempt", index: 2 })
  check("attempt resets skipCount to 0", s.skipCount === 0)
  console.log("")
}

// --- Backward jumps count too (matches the original design intent) ---
{
  console.log("[6] A fast backward jump also triggers the guardrail")
  // Constructed directly rather than reached via the reducer: state.activeIndex
  // must actually be 3 already, or the reducer's no-op guard (activeIndex ===
  // index) would swallow this as a non-move before the skip math ever runs.
  const startedAtReelThree: State = { ...INITIAL, activeIndex: 3 }
  const after = visit(startedAtReelThree, 0, 3) // was on reel 3, jumps straight back to 0
  check("pause opens on a 3-reel backward jump", after.pauseOpen === true)
  console.log("")
}

// --- dismissPause only ever clears the flag, never touches other state ---
{
  console.log("[7] dismissPause clears pauseOpen without side effects")
  const paused = visit(INITIAL, 3, 0)
  const after = reducer(paused, { type: "dismissPause" })
  check("pauseOpen cleared", after.pauseOpen === false)
  check("activeIndex untouched", after.activeIndex === paused.activeIndex)
  console.log("")
}

check("SKIPS_BEFORE_PAUSE is still 3 (sanity — tests assume this)", SKIPS_BEFORE_PAUSE === 3)

console.log("")
console.log(failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`)
process.exit(failures === 0 ? 0 : 1)
