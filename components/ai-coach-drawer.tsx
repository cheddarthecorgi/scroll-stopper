"use client"

import { useEffect, useRef, useState } from "react"
import {
  Bot,
  Cpu,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Send,
  ServerCog,
  Sparkles,
  X,
} from "lucide-react"
import { STORAGE_KEYS } from "@/lib/storage"
import { useLocalStorage } from "@/lib/use-local-storage"
import type { FeedItem } from "@/lib/feed-data"

type ChatMessage = { role: "user" | "assistant"; content: string }
type Model = "gpt-5-mini" | "gpt-5-nano"

const MODELS: Model[] = ["gpt-5-mini", "gpt-5-nano"]

const STARTERS = ["Explain it like I'm 12", "Give me a hint", "Why does this matter?"]

export function AiCoachDrawer({ item }: { item: FeedItem }) {
  const [open, setOpen] = useState(false)
  // Both persist across reloads under the keys the spec calls for.
  const [apiKey, setApiKey] = useLocalStorage(STORAGE_KEYS.apiKey, "")
  const [storedModel, setStoredModel] = useLocalStorage(STORAGE_KEYS.model, "gpt-5-mini")
  const model: Model = MODELS.includes(storedModel as Model)
    ? (storedModel as Model)
    : "gpt-5-mini"
  const [showKey, setShowKey] = useState(false)
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** True once the server has told us it holds its own key. */
  const [serverKey, setServerKey] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Ask the server whether it already has a key, so we can hide the key field.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    fetch("/api/tutor/status")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setServerKey(Boolean(d?.hasServerKey))
      })
      .catch(() => {
        /* status check is optional */
      })
    return () => {
      cancelled = true
    }
  }, [open])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, loading])

  // Close on Escape.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  async function send(question: string) {
    const trimmed = question.trim()
    if (!trimmed || loading) return

    setError(null)
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }]
    setMessages(nextMessages)
    setInput("")
    setLoading(true)

    try {
      // The key never goes to OpenAI from the browser — it goes to our own route,
      // which prefers the server-side key when one is configured.
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          system: item.aiContext,
          model,
          apiKey: apiKey.trim() || undefined,
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(data?.error || `Request failed (${res.status})`)
      }

      setMessages((m) => [...m, { role: "assistant", content: data.reply }])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-indigo-400/40 bg-indigo-500/10 px-4 py-3 text-sm font-semibold text-indigo-200 transition-all hover:bg-indigo-500/20 active:scale-[0.98]"
      >
        <Bot className="size-5 text-indigo-300" />
        Ask AI Tutor
        <Sparkles className="size-4 text-indigo-300" />
      </button>

      <div
        onClick={() => setOpen(false)}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-zinc-950/70 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Ask AI Tutor"
        className={`fixed inset-y-0 right-0 z-50 flex w-[92%] max-w-md flex-col border-l border-zinc-800 bg-zinc-950 shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-indigo-400/30 bg-indigo-500/10">
              <Bot className="size-4 text-indigo-300" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-100">AI Tutor</p>
              <p className="truncate text-[11px] text-zinc-500">Context: {item.title}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close drawer"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Connection settings */}
        <div className="border-b border-zinc-800 bg-zinc-900/40 p-3">
          <div className="flex items-end gap-2">
            {serverKey ? (
              <div className="flex flex-1 items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2.5">
                <ServerCog className="size-4 shrink-0 text-emerald-400" />
                <p className="text-[12px] font-medium text-emerald-200">
                  Using the server key from .env.local
                </p>
              </div>
            ) : (
              <div className="min-w-0 flex-1">
                <label
                  htmlFor="openai-key"
                  className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-zinc-300"
                >
                  <KeyRound className="size-3.5 text-emerald-400" />
                  OpenAI API Key
                </label>
                <div className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950 px-2 focus-within:border-emerald-400/50">
                  <input
                    id="openai-key"
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    autoComplete="off"
                    className="min-w-0 flex-1 bg-transparent py-2 font-mono text-[12px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((s) => !s)}
                    aria-label={showKey ? "Hide key" : "Show key"}
                    className="shrink-0 text-zinc-500 hover:text-zinc-300"
                  >
                    {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
            )}

            <div className="shrink-0">
              <label
                htmlFor="openai-model"
                className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-zinc-300"
              >
                <Cpu className="size-3.5 text-indigo-400" />
                Model
              </label>
              <select
                id="openai-model"
                value={model}
                onChange={(e) => setStoredModel(e.target.value)}
                className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-[12px] font-medium text-zinc-100 focus:border-indigo-400/50 focus:outline-none"
              >
                {MODELS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!serverKey && (
            <p className="mt-1.5 text-[10px] leading-tight text-zinc-600">
              Saved in this browser under <code className="text-zinc-500">openai_api_key</code> and
              relayed through this app&apos;s own server route. Use a throwaway key — anything in
              localStorage is readable by scripts on this origin.
            </p>
          )}
        </div>

        {/* Chat */}
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 && !loading && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 text-center">
              <Sparkles className="mx-auto mb-2 size-5 text-indigo-300" />
              <p className="text-[13px] text-zinc-400 text-pretty">
                Ask the tutor anything about{" "}
                <span className="font-medium text-emerald-300">{item.concept}</span>.
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-full border border-zinc-700 px-2.5 py-1 text-[11px] text-zinc-300 transition-colors hover:border-indigo-400/50 hover:text-indigo-200"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-[13px] leading-relaxed ${
                  m.role === "user"
                    ? "rounded-br-sm bg-emerald-400 text-zinc-950"
                    : "rounded-bl-sm border border-zinc-800 bg-zinc-900 text-zinc-100"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border border-zinc-800 bg-zinc-900 px-3 py-2 text-[13px] text-zinc-400">
                <Loader2 className="size-4 animate-spin text-indigo-300" />
                Thinking…
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-300">
              {error}
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-zinc-800 p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault()
                  send(input)
                }
              }}
              rows={1}
              placeholder="Ask the AI tutor…"
              className="max-h-28 flex-1 resize-none rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-400/50 focus:outline-none focus:ring-1 focus:ring-indigo-400/40"
            />
            <button
              type="button"
              onClick={() => send(input)}
              disabled={loading || !input.trim()}
              aria-label="Send message"
              className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500 text-white transition-all hover:bg-indigo-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="size-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
