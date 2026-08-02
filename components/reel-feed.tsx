"use client"

import { useEffect, useRef, useState } from "react"
import { Bookmark, Heart, Play, Volume2, VolumeX } from "lucide-react"
import { useProgress } from "@/components/progress-provider"
import { FULL_XP, PARTIAL_XP, type FeedItem } from "@/lib/feed-data"

export function ReelFeed({
  item,
  index,
  total,
}: {
  item: FeedItem
  index: number
  total: number
}) {
  const { setActive, awarded } = useProgress()
  const earned = awarded[String(index)]

  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)
  const [liked, setLiked] = useState(false)
  const [saved, setSaved] = useState(false)

  // Autoplay the reel only while it is the one snapped into view.
  useEffect(() => {
    const el = containerRef.current
    const v = videoRef.current
    if (!el || !v) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
          setActive(index)
          v.play()
            .then(() => setPlaying(true))
            .catch(() => setPlaying(false))
        } else {
          v.pause()
          setPlaying(false)
        }
      },
      { threshold: [0, 0.6, 1] },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [index, setActive])

  function togglePlay() {
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      v.play().catch(() => {})
      setPlaying(true)
    } else {
      v.pause()
      setPlaying(false)
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900"
    >
      <video
        ref={videoRef}
        src={item.videoUrl}
        poster="/reel-poster.png"
        className="absolute inset-0 size-full object-cover"
        muted={muted}
        loop
        playsInline
        preload="metadata"
        crossOrigin="anonymous"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-zinc-950/40" />

      {/* Skill module tag */}
      <div className="absolute left-3 top-3 flex max-w-[70%] items-center gap-2 rounded-full border border-emerald-400/40 bg-zinc-950/70 px-3 py-1.5 backdrop-blur">
        <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-emerald-400" />
        <span className="truncate text-[11px] font-semibold tracking-wide text-emerald-300">
          {item.field} · {item.title}
        </span>
      </div>

      {/* Position indicator */}
      <div className="absolute right-3 top-3 rounded-full border border-white/15 bg-zinc-950/60 px-2.5 py-1 text-[10px] font-semibold text-zinc-300 backdrop-blur">
        {index + 1} / {total}
      </div>

      {/* Award badge */}
      {earned !== undefined && (
        <div
          className={`absolute left-3 top-14 rounded-full border px-2.5 py-1 text-[10px] font-bold backdrop-blur ${
            earned === FULL_XP
              ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-300"
              : "border-amber-400/40 bg-amber-500/15 text-amber-300"
          }`}
        >
          {earned === PARTIAL_XP ? `+${PARTIAL_XP} XP PARTIAL` : `+${FULL_XP} XP CLEARED`}
        </div>
      )}

      {/* Center play/pause */}
      <button
        type="button"
        onClick={togglePlay}
        aria-label={playing ? "Pause reel" : "Play reel"}
        className="absolute inset-0 flex items-center justify-center"
      >
        <span
          className={`flex size-16 items-center justify-center rounded-full border border-white/20 bg-zinc-950/50 backdrop-blur transition-all duration-200 ${
            playing ? "scale-90 opacity-0" : "scale-100 opacity-100"
          }`}
        >
          <Play className="size-7 translate-x-0.5 text-zinc-100" />
        </span>
      </button>

      {/* Right action rail */}
      <div className="absolute bottom-24 right-3 flex flex-col items-center gap-4">
        <RailButton
          active={liked}
          onClick={() => setLiked((v) => !v)}
          label="Like"
          activeClass="text-rose-400"
          count={liked ? "1.3k" : "1.2k"}
        >
          <Heart className={`size-6 ${liked ? "fill-rose-400" : ""}`} />
        </RailButton>
        <RailButton
          active={saved}
          onClick={() => setSaved((v) => !v)}
          label="Save"
          activeClass="text-emerald-400"
          count="Save"
        >
          <Bookmark className={`size-6 ${saved ? "fill-emerald-400" : ""}`} />
        </RailButton>
      </div>

      {/* Caption */}
      <div className="absolute bottom-14 left-3 right-16">
        <p className="text-sm font-semibold text-zinc-100">@marinhacks_stem</p>
        <p className="mt-1 text-[13px] leading-snug text-zinc-300 text-pretty">{item.caption}</p>
      </div>

      {/* Mute toggle */}
      <button
        type="button"
        onClick={() => setMuted((m) => !m)}
        aria-label={muted ? "Unmute" : "Mute"}
        className="absolute bottom-3 right-3 flex size-9 items-center justify-center rounded-full border border-white/15 bg-zinc-950/60 text-zinc-200 backdrop-blur transition-colors hover:bg-zinc-800"
      >
        {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
      </button>

      {/* Scroll hint */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] font-medium text-zinc-400">
        Scroll down for the challenge
      </div>
    </div>
  )
}

function RailButton({
  children,
  onClick,
  active,
  label,
  activeClass,
  count,
}: {
  children: React.ReactNode
  onClick: () => void
  active: boolean
  label: string
  activeClass: string
  count: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className="flex flex-col items-center gap-1"
    >
      <span
        className={`flex size-11 items-center justify-center rounded-full border border-white/10 bg-zinc-950/50 backdrop-blur transition-all duration-200 active:scale-90 ${
          active ? activeClass : "text-zinc-100"
        }`}
      >
        {children}
      </span>
      <span className="text-[10px] font-medium text-zinc-300">{count}</span>
    </button>
  )
}
