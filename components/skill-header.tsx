"use client"

import { Brain, Flame, GitBranch, RotateCcw, Timer, Zap } from "lucide-react"
import { useProgress } from "@/components/progress-provider"
import { feedData } from "@/lib/feed-data"

export function SkillHeader() {
  const {
    hydrated,
    xp,
    level,
    xpIntoLevel,
    levelProgress,
    streak,
    minutesAvoided,
    safetyIndex,
    isComplete,
    resetProgress,
  } = useProgress()

  const total = feedData.length

  // Colour the safety index by band so a drop is visible at a glance.
  const safetyTone =
    safetyIndex >= 90
      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
      : safetyIndex >= 75
        ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
        : "border-rose-400/30 bg-rose-400/10 text-rose-300"

  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-md items-center gap-3 px-4 pt-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-400/10">
          <GitBranch className="size-5 text-emerald-400" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate text-sm font-semibold text-zinc-100">
              STEM Skill Tree <span className="text-emerald-400">Level {level}</span>
            </p>
            <span className="shrink-0 font-mono text-[11px] text-zinc-500">
              {xpIntoLevel} / 300 XP
            </span>
          </div>

          <div
            className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-zinc-800"
            role="progressbar"
            aria-valuenow={levelProgress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Skill tree level progress"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.55)] transition-all duration-700 ease-out"
              style={{ width: `${hydrated ? levelProgress : 0}%` }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={resetProgress}
          title="Reset progress"
          aria-label="Reset progress"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-zinc-800 text-zinc-500 transition-colors hover:border-zinc-700 hover:text-zinc-300"
        >
          <RotateCcw className="size-3.5" />
        </button>
      </div>

      {/* Live stat strip */}
      <div className="mx-auto flex max-w-md items-center gap-1.5 overflow-x-auto px-4 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Stat
          icon={<Flame className="size-3.5 text-orange-400" />}
          tone="border-orange-400/30 bg-orange-400/10 text-orange-300"
          value={`${streak} Reel Streak`}
          srLabel={`${streak} reels cleared in a row`}
        />
        <Stat
          icon={<Timer className="size-3.5 text-sky-400" />}
          tone="border-sky-400/30 bg-sky-400/10 text-sky-300"
          value={`Brainrot Avoided: ${minutesAvoided} min`}
          srLabel={`${minutesAvoided} minutes of doomscrolling avoided`}
        />
        <Stat
          icon={<Brain className="size-3.5" />}
          tone={safetyTone}
          value={`Cognitive Safety Index: ${safetyIndex}%`}
          srLabel={`Cognitive safety index ${safetyIndex} percent`}
        />
      </div>

      <div className="mx-auto flex max-w-md items-center gap-1.5 px-4 pb-2.5">
        <Zap className="size-3.5 shrink-0 text-indigo-400" aria-hidden="true" />
        <p className="text-[11px] font-medium text-zinc-400">
          {isComplete
            ? "All modules cleared — you maxed out today's XP streak!"
            : `${xp} XP earned · clear all ${total} modules for a 2× bonus`}
        </p>
      </div>
    </header>
  )
}

function Stat({
  icon,
  value,
  tone,
  srLabel,
}: {
  icon: React.ReactNode
  value: string
  tone: string
  srLabel: string
}) {
  return (
    <span
      className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-semibold whitespace-nowrap ${tone}`}
    >
      {icon}
      <span aria-hidden="true">{value}</span>
      <span className="sr-only">{srLabel}</span>
    </span>
  )
}
