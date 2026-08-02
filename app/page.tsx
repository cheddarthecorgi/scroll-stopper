"use client"

import { CelebrationOverlay } from "@/components/celebration-overlay"
import { CompletionCard } from "@/components/completion-card"
import { FeedCard } from "@/components/feed-card"
import { IntroScreen } from "@/components/intro-screen"
import { MindfulPause } from "@/components/mindful-pause"
import { FEED_SCROLL_ID, ProgressProvider, useProgress } from "@/components/progress-provider"
import { SkillHeader } from "@/components/skill-header"
import { feedData } from "@/lib/feed-data"

export default function Page() {
  return (
    <ProgressProvider>
      <IntroScreen />
      <Feed />
      <CelebrationOverlay />
      <MindfulPause />
    </ProgressProvider>
  )
}

function Feed() {
  const { activeIndex, unlockedIndex, awarded, scrollToReel } = useProgress()

  return (
    <div className="relative h-dvh overflow-hidden bg-zinc-950 text-zinc-100">
      {/* Stats bar floating over the feed */}
      <div className="absolute inset-x-0 top-0 z-30">
        <SkillHeader />
      </div>

      {/* Vertical snap-scroll feed */}
      <div
        id={FEED_SCROLL_ID}
        className="h-dvh snap-y snap-mandatory overflow-y-scroll scroll-smooth overscroll-y-contain"
      >
        {feedData.map((item, index) => (
          <FeedCard key={item.id} item={item} index={index} total={feedData.length} />
        ))}
        <CompletionCard />
      </div>

      {/* Reel position dots */}
      <nav
        aria-label="Reel navigation"
        className="absolute right-2 top-1/2 z-30 flex -translate-y-1/2 flex-col gap-2"
      >
        {feedData.map((item, i) => {
          const cleared = awarded[String(i)] !== undefined
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollToReel(i)}
              disabled={i > unlockedIndex}
              aria-label={`Go to reel ${i + 1}: ${item.title}`}
              aria-current={i === activeIndex}
              className={`w-1 rounded-full transition-all disabled:cursor-not-allowed ${
                i === activeIndex
                  ? "h-6 bg-emerald-400"
                  : cleared
                    ? "h-3 bg-emerald-600"
                    : i <= unlockedIndex
                      ? "h-3 bg-zinc-500"
                      : "h-3 bg-zinc-700"
              }`}
            />
          )
        })}
      </nav>
    </div>
  )
}
