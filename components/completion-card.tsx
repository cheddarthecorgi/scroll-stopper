"use client"

import { Award, RotateCcw, Timer, Trophy } from "lucide-react"
import { useProgress } from "@/components/progress-provider"
import { FULL_XP, feedData } from "@/lib/feed-data"

/**
 * Final reel. Always present at the end of the feed, but only celebrates once
 * every module has been cleared.
 */
export function CompletionCard() {
  const { xp, minutesAvoided, safetyIndex, completedCount, awarded, isComplete, resetProgress, scrollToReel } =
    useProgress()

  const total = feedData.length
  const perfectCount = Object.values(awarded).filter((v) => v === FULL_XP).length
  const firstUnsolved = feedData.findIndex((_, i) => awarded[String(i)] === undefined)

  return (
    <section
      id={`reel-${total}`}
      aria-label="Session summary"
      className="flex h-dvh w-full snap-start items-center justify-center px-4 pb-10 pt-24"
    >
      <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 text-center">
        <div
          className={`mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl border ${
            isComplete
              ? "border-emerald-400/40 bg-emerald-400/10"
              : "border-zinc-700 bg-zinc-950"
          }`}
        >
          <Trophy className={`size-8 ${isComplete ? "text-emerald-400" : "text-zinc-600"}`} />
        </div>

        <h2 className="text-xl font-bold text-zinc-100 text-balance">
          {isComplete ? "Skill tree maxed out" : "You've reached the end"}
        </h2>
        <p className="mx-auto mt-2 max-w-xs text-[13px] leading-relaxed text-zinc-400 text-pretty">
          {isComplete
            ? "Every module cleared. That's a full session of feed time converted into something you can actually use."
            : `${completedCount} of ${total} modules cleared. Head back up and finish the rest to max the tree.`}
        </p>

        <dl className="mt-5 grid grid-cols-3 gap-2">
          <Metric label="Total XP" value={String(xp)} icon={<Award className="size-3.5" />} />
          <Metric
            label="Full marks"
            value={`${perfectCount}/${total}`}
            icon={<Trophy className="size-3.5" />}
          />
          <Metric
            label="Min. saved"
            value={String(minutesAvoided)}
            icon={<Timer className="size-3.5" />}
          />
        </dl>

        <p className="mt-3 text-[11px] text-zinc-500">
          Cognitive Safety Index finished at{" "}
          <span className="font-mono font-bold text-emerald-300">{safetyIndex}%</span>
        </p>

        <div className="mt-5 flex gap-2">
          {!isComplete && firstUnsolved >= 0 && (
            <button
              type="button"
              onClick={() => scrollToReel(firstUnsolved)}
              className="flex-1 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-bold text-zinc-950 transition-all hover:bg-emerald-300 active:scale-[0.98]"
            >
              Finish module {firstUnsolved + 1}
            </button>
          )}
          <button
            type="button"
            onClick={resetProgress}
            className={`flex items-center justify-center gap-1.5 rounded-xl border border-zinc-700 px-4 py-3 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 active:scale-[0.98] ${
              isComplete || firstUnsolved < 0 ? "flex-1" : ""
            }`}
          >
            <RotateCcw className="size-4" />
            Start over
          </button>
        </div>
      </div>
    </section>
  )
}

function Metric({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-2 py-3">
      <dt className="flex items-center justify-center gap-1 text-[10px] font-medium text-zinc-500">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 font-mono text-lg font-bold text-zinc-100">{value}</dd>
    </div>
  )
}
