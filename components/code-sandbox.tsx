"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, ArrowDown, Check, Play, RotateCcw, TerminalSquare, X } from "lucide-react"
import { useProgress } from "@/components/progress-provider"
import { analyzeCode } from "@/lib/analyzer"
import { runSnippet } from "@/lib/run-snippet"
import { FULL_XP, PARTIAL_XP, type FeedItem } from "@/lib/feed-data"

type Line = { kind: "cmd" | "ok" | "warn" | "err" | "muted"; text: string }
type Status = "idle" | "passed" | "partial" | "failed"

/**
 * Compare the evaluated result against the expected output. Numbers are compared
 * numerically so float noise (0.1 + 0.2) doesn't fail an otherwise-correct answer.
 */
function matchesExpected(result: unknown, expected: string): boolean {
  const got = String(result).trim()
  const want = expected.trim()
  if (got === want) return true

  const gotNum = Number(got)
  const wantNum = Number(want)
  if (Number.isFinite(gotNum) && Number.isFinite(wantNum)) {
    return Math.abs(gotNum - wantNum) < 1e-9
  }
  return false
}

export function CodeSandbox({ item, index }: { item: FeedItem; index: number }) {
  const { awarded, markAttempted, recordPass } = useProgress()
  const earned = awarded[String(index)]

  const [code, setCode] = useState(item.initialCode)
  const [output, setOutput] = useState<Line[]>([])
  const [status, setStatus] = useState<Status>(
    earned === FULL_XP ? "passed" : earned === PARTIAL_XP ? "partial" : "idle",
  )
  const [hint, setHint] = useState<string | null>(null)
  const [quizChoice, setQuizChoice] = useState<number | null>(null)
  const [glowKey, setGlowKey] = useState(0)

  const lineNumbers = useMemo(
    () => Array.from({ length: code.split("\n").length }, (_, i) => i + 1),
    [code],
  )

  function runCode() {
    markAttempted(index)
    setHint(null)

    // Static pass first: a syntax error is reported without ever evaluating.
    const analysis = analyzeCode(code, item.requiredSyntax, item.expectedOutput)

    if (!analysis.parsed) {
      setStatus("failed")
      setOutput([
        { kind: "cmd", text: "$ node challenge.js" },
        { kind: "err", text: `SyntaxError: ${analysis.parseError}` },
        { kind: "err", text: "❌ Code never ran — fix the syntax first." },
      ])
      return
    }

    const run = runSnippet(code)
    if (!run.ok) {
      setStatus("failed")
      setOutput([
        { kind: "cmd", text: "$ node challenge.js" },
        { kind: "err", text: `RuntimeError: ${run.message}` },
        { kind: "err", text: "❌ Incorrect output. Try again!" },
      ])
      return
    }

    const result = run.value
    const got = String(result).trim()
    const methodsLine =
      analysis.usedMethods.length > 0
        ? `→ static analysis: ${analysis.usedMethods.map((m) => `${m}()`).join(", ")}`
        : "→ static analysis: no method calls detected"

    if (!matchesExpected(result, item.expectedOutput)) {
      setStatus("failed")
      setOutput([
        { kind: "cmd", text: "$ node challenge.js" },
        { kind: "muted", text: `→ output: ${got}` },
        { kind: "err", text: `→ expected: ${item.expectedOutput}` },
        { kind: "err", text: "❌ Incorrect output. Try again!" },
      ])
      return
    }

    // Output is right. Now decide full vs partial credit on the AST verdict.
    if (analysis.satisfied) {
      setStatus("passed")
      setGlowKey((k) => k + 1)
      setOutput([
        { kind: "cmd", text: "$ node challenge.js" },
        { kind: "muted", text: `→ output: ${got}` },
        { kind: "muted", text: methodsLine },
        { kind: "ok", text: `✅ Test Passed! +${FULL_XP} XP` },
      ])
      recordPass(index, FULL_XP, false)
    } else {
      setStatus("partial")
      setGlowKey((k) => k + 1)
      setHint(analysis.hint ?? null)
      setOutput([
        { kind: "cmd", text: "$ node challenge.js" },
        { kind: "muted", text: `→ output: ${got}` },
        { kind: "muted", text: methodsLine },
        { kind: "warn", text: analysis.warning ?? "⚠️ Technique check failed" },
        { kind: "warn", text: `⚠️ Partial credit: +${PARTIAL_XP} XP` },
      ])
      recordPass(index, PARTIAL_XP, true)
    }
  }

  function reset() {
    setCode(item.initialCode)
    setOutput([])
    setHint(null)
    setStatus(earned === FULL_XP ? "passed" : earned === PARTIAL_XP ? "partial" : "idle")
  }

  const cleared = status === "passed" || status === "partial"

  return (
    <section
      aria-label="Code sandbox"
      className={`relative overflow-hidden rounded-2xl border bg-zinc-900 transition-colors duration-300 ${
        status === "passed"
          ? "border-emerald-400/50"
          : status === "partial"
            ? "border-amber-400/50"
            : status === "failed"
              ? "border-rose-400/40"
              : "border-zinc-800"
      }`}
    >
      {/*
        Ring pulse on a throwaway overlay. Remounting via `key` restarts the CSS
        animation without remounting the card (which would blow away the editor).
      */}
      {glowKey > 0 && cleared && (
        <span
          key={glowKey}
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 z-10 rounded-2xl ${
            status === "passed"
              ? "animate-[passglow_900ms_ease-out]"
              : "animate-[passglowpartial_900ms_ease-out]"
          }`}
        />
      )}

      {/* Editor chrome */}
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/60 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="size-3 rounded-full bg-rose-500/80" />
          <span className="size-3 rounded-full bg-amber-400/80" />
          <span className="size-3 rounded-full bg-emerald-400/80" />
          <span className="ml-2 font-mono text-[11px] text-zinc-400">challenge.js</span>
        </div>
        <span className="rounded-md bg-indigo-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-indigo-300">
          {item.concept.toUpperCase()}
        </span>
      </div>

      {/* Prompt */}
      <p className="border-b border-zinc-800 px-3 py-2 text-[12px] leading-relaxed text-zinc-400 text-pretty">
        <span className="font-semibold text-emerald-400">Quick challenge:</span>{" "}
        {item.challengePrompt}
      </p>

      {/* Gutter + editor */}
      <div className="relative flex max-h-64 overflow-auto bg-[#0b0f14] font-mono text-[12.5px] leading-6">
        <div
          aria-hidden="true"
          className="sticky left-0 select-none border-r border-zinc-800/80 bg-[#0b0f14] px-2 py-3 text-right text-zinc-600"
        >
          {lineNumbers.map((n) => (
            <div key={n}>{n}</div>
          ))}
        </div>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          aria-label="Code editor"
          className="min-h-56 flex-1 resize-none bg-transparent px-3 py-3 text-emerald-100/90 caret-emerald-400 outline-none"
        />
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-2 border-t border-zinc-800 bg-zinc-950/60 p-3">
        <button
          type="button"
          onClick={runCode}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all active:scale-95 ${
            cleared
              ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/40"
              : "bg-emerald-400 text-zinc-950 shadow-[0_0_18px_rgba(52,211,153,0.4)] hover:bg-emerald-300"
          }`}
        >
          {cleared ? <Check className="size-4" /> : <Play className="size-4" />}
          {cleared ? "Run Again" : "Run Code"}
        </button>

        <button
          type="button"
          onClick={reset}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 active:scale-95"
        >
          <RotateCcw className="size-4" />
          Reset
        </button>

        {earned !== undefined && (
          <span
            className={`ml-auto rounded-md px-2 py-1 font-mono text-[10px] font-bold ${
              earned === FULL_XP
                ? "bg-emerald-500/15 text-emerald-300"
                : "bg-amber-500/15 text-amber-300"
            }`}
          >
            +{earned} XP
          </span>
        )}
      </div>

      {/* Result banner */}
      {status !== "idle" && output.length > 0 && (
        <div
          className={`flex items-start gap-2 px-3 py-2 text-[13px] font-semibold ${
            status === "passed"
              ? "bg-emerald-500/10 text-emerald-300"
              : status === "partial"
                ? "bg-amber-500/10 text-amber-200"
                : "bg-rose-500/10 text-rose-300"
          }`}
        >
          {status === "passed" ? (
            <Check className="mt-0.5 size-4 shrink-0" />
          ) : status === "partial" ? (
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          ) : (
            <X className="mt-0.5 size-4 shrink-0" />
          )}
          <div className="min-w-0">
            <p>
              {status === "passed"
                ? `Test Passed! +${FULL_XP} XP`
                : status === "partial"
                  ? `Right answer, wrong technique — +${PARTIAL_XP} XP`
                  : "Incorrect output. Try again!"}
            </p>
            {hint && <p className="mt-0.5 font-normal text-amber-200/80">{hint}</p>}
          </div>
        </div>
      )}

      {/* Auto-advance notice */}
      {cleared && (
        <div className="flex items-center justify-center gap-1.5 bg-zinc-950/40 py-1.5 text-[11px] text-zinc-500">
          <ArrowDown className="size-3 animate-bounce" />
          Advancing to the next reel…
        </div>
      )}

      {/* Console */}
      <div className="border-t border-zinc-800 bg-[#07100b] px-3 py-3 font-mono text-[12px]">
        <div className="mb-1.5 flex items-center gap-1.5 text-zinc-500">
          <TerminalSquare className="size-3.5" />
          <span className="uppercase tracking-wider">Console</span>
        </div>
        {output.length === 0 ? (
          <p className="text-zinc-600">{"$ waiting for you to run the tests…"}</p>
        ) : (
          <div className="space-y-0.5">
            {output.map((line, i) => (
              <p
                key={i}
                className={
                  line.kind === "ok"
                    ? "font-bold text-emerald-400"
                    : line.kind === "warn"
                      ? "font-bold text-amber-300"
                      : line.kind === "err"
                        ? "text-rose-400"
                        : line.kind === "muted"
                          ? "text-zinc-500"
                          : "text-emerald-300/80"
                }
              >
                {line.text}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Bonus quiz */}
      <div className="border-t border-zinc-800 p-3">
        <p className="mb-2 text-[12px] font-semibold text-indigo-300">Bonus check</p>
        <p className="mb-2 text-[13px] text-zinc-300 text-pretty">{item.quizQuestion.prompt}</p>
        <div className="space-y-1.5">
          {item.quizQuestion.options.map((opt, i) => {
            const chosen = quizChoice === i
            const isAnswer = i === item.quizQuestion.answerIndex
            const showState = quizChoice !== null && (chosen || isAnswer)
            return (
              <button
                key={i}
                type="button"
                onClick={() => setQuizChoice(i)}
                className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-[12.5px] transition-all active:scale-[0.99] ${
                  showState
                    ? isAnswer
                      ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200"
                      : "border-rose-400/50 bg-rose-500/10 text-rose-200"
                    : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700"
                }`}
              >
                <span className="font-mono text-[10px] text-zinc-500">
                  {String.fromCharCode(65 + i)}
                </span>
                {opt}
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
