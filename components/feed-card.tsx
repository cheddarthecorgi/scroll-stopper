"use client"

import { Lock } from "lucide-react"
import { AiCoachDrawer } from "@/components/ai-coach-drawer"
import { CodeSandbox } from "@/components/code-sandbox"
import { ReelFeed } from "@/components/reel-feed"
import { useProgress } from "@/components/progress-provider"
import type { FeedItem } from "@/lib/feed-data"

export function FeedCard({ item, index, total }: { item: FeedItem; index: number; total: number }) {
  const { unlockedIndex, scrollToReel } = useProgress()
  const locked = index > unlockedIndex

  return (
    <section
      id={`reel-${index}`}
      aria-label={`Learning reel ${index + 1}: ${item.title}`}
      className="h-dvh w-full snap-start overflow-y-auto"
    >
      <div className="mx-auto flex max-w-md flex-col gap-4 px-4 pb-16 pt-32">
        {/* Reel fills the first viewport */}
        <div className="h-[calc(100dvh-11rem)] w-full">
          <ReelFeed item={item} index={index} total={total} />
        </div>

        {locked ? (
          <div className="flex flex-col items-center gap-2 rounded-3xl border border-zinc-800 bg-zinc-900/60 px-6 py-10 text-center">
            <span className="flex size-12 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950 text-zinc-400">
              <Lock className="size-5" />
            </span>
            <p className="text-sm font-semibold text-zinc-200">Reel locked</p>
            <p className="max-w-xs text-[13px] text-zinc-500 text-pretty">
              Clear the challenge on module {unlockedIndex + 1} to unlock this one.
            </p>
            <button
              type="button"
              onClick={() => scrollToReel(unlockedIndex)}
              className="mt-2 rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-3 py-1.5 text-[12px] font-semibold text-emerald-300 transition-colors hover:bg-emerald-400/20"
            >
              Take me there
            </button>
          </div>
        ) : (
          <>
            <CodeSandbox item={item} index={index} />
            <AiCoachDrawer item={item} />
          </>
        )}
      </div>
    </section>
  )
}
