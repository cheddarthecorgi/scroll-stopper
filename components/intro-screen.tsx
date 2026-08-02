"use client"

import { ArrowDown, Brain, Code2, ShieldCheck, Sparkles } from "lucide-react"
import { STORAGE_KEYS } from "@/lib/storage"
import { useLocalStorage } from "@/lib/use-local-storage"
import { feedData } from "@/lib/feed-data"

const FEATURES = [
  {
    icon: Code2,
    title: "Watch, then prove it",
    body: "Every reel ends in a live code challenge. No skipping to the next dopamine hit.",
  },
  {
    icon: Brain,
    title: "The code gets read, not just run",
    body: "A real AST parser checks you used the technique — right answer, wrong method earns half XP.",
  },
  {
    icon: ShieldCheck,
    title: "Guardrails, not guilt",
    body: "Blow past three reels without trying one and the feed stops you for five seconds.",
  },
]

/**
 * One-time landing screen. Shown until the learner starts, then never again
 * unless progress is reset.
 */
export function IntroScreen() {
  // Server value is "1" (already seen) so the intro never flashes during
  // hydration for a returning learner.
  const [seen, setSeen] = useLocalStorage(STORAGE_KEYS.introSeen, "1")

  if (seen === "1") return null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-zinc-950 px-5 py-10">
      {/* Ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.18),transparent_55%),radial-gradient(circle_at_50%_100%,rgba(52,211,153,0.14),transparent_55%)]"
      />

      <div className="relative w-full max-w-sm animate-[risein_500ms_ease-out]">
        <div className="mb-5 flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold text-emerald-300">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
            MarinHacks
          </span>
        </div>

        <h1 className="text-4xl font-black leading-[1.05] tracking-tight text-zinc-50 text-balance">
          Stop the scroll.
          <br />
          <span className="bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">
            Start the skill tree.
          </span>
        </h1>

        <p className="mt-3 text-[14px] leading-relaxed text-zinc-400 text-pretty">
          Same vertical feed your brain is already addicted to — except every reel makes you write
          code before it lets you move on.
        </p>

        <ul className="mt-6 space-y-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-indigo-400/30 bg-indigo-500/10">
                <Icon className="size-4 text-indigo-300" />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-zinc-100">{title}</p>
                <p className="mt-0.5 text-[12px] leading-snug text-zinc-500 text-pretty">{body}</p>
              </div>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => setSeen("1")}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 py-4 text-base font-bold text-zinc-950 shadow-[0_0_28px_rgba(52,211,153,0.35)] transition-all hover:bg-emerald-300 active:scale-[0.98]"
        >
          <Sparkles className="size-5" />
          Start the feed
          <ArrowDown className="size-4" />
        </button>

        <p className="mt-3 text-center text-[11px] text-zinc-600">
          {feedData.length} modules · CS, physics, chemistry, biology
        </p>
      </div>
    </div>
  )
}
