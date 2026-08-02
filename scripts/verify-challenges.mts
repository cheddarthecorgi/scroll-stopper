/**
 * Content + analyzer test suite. Run with `npm run verify`.
 *
 * Guards the two ways the feed can silently rot:
 *   1. A challenge whose starter already passes, or whose intended solution
 *      no longer produces the expected output.
 *   2. A "cheat" — right answer, wrong technique — that slips past the AST
 *      analyzer and wrongly earns full credit.
 *
 * Runs on Node's built-in TypeScript stripping; no build step, no test runner.
 */
import { analyzeCode } from "../lib/analyzer.ts"
import { runSnippet } from "../lib/run-snippet.ts"
import { feedData } from "../lib/feed-data.ts"

/** The intended solution for each module, in feed order. */
const SOLUTIONS: string[] = [
  `const reels = [
  { minutes: 4, score: 80 },
  { minutes: 7, score: 20 },
  { minutes: 3, score: 65 },
  { minutes: 6, score: 10 },
];
reels.filter((r) => r.score >= 50).reduce((sum, r) => sum + r.minutes, 0);`,

  `const mass = 10;
const acceleration = 9.8;
mass * acceleration;`,

  `function fib(n) {
  if (n <= 2) return 1;
  return fib(n - 1) + fib(n - 2);
}
fib(6);`,

  `const cache = {};
function fastFib(n) {
  if (cache[n]) return cache[n];
  if (n <= 2) return 1;
  return (cache[n] = fastFib(n - 1) + fastFib(n - 2));
}
fastFib(30);`,

  `const start = 80;
const halfLives = 4;
start / Math.pow(2, halfLives);`,

  `const dna = "ATGC";
const pairs = { A: "U", T: "A", C: "G", G: "C" };
dna.split("").map((base) => pairs[base]).join("");`,
]

/** Right answer, wrong technique — each must earn PARTIAL credit only. */
const CHEATS: Array<[number, string, string]> = [
  [
    0,
    "for-loop instead of filter/reduce",
    `const reels=[{minutes:4,score:80},{minutes:7,score:20},{minutes:3,score:65},{minutes:6,score:10}];
let t=0; for (const r of reels) { if (r.score>=50) t+=r.minutes } t;`,
  ],
  [1, "hardcoded 98", `const mass=10;const acceleration=9.8;\n98;`],
  [2, "iterative fibonacci", `let a=1,b=1;for(let i=2;i<6;i++){const t=a+b;a=b;b=t}b;`],
  [
    3,
    "recursion but no cache",
    `const cache={};function fastFib(n){if(n<=2)return 1;return fastFib(n-1)+fastFib(n-2)}fastFib(30);`,
  ],
  [4, "plain division, no exponent", `const start=80;const halfLives=4;start/16;`],
  [
    5,
    "string concat instead of split/map/join",
    `const dna="ATGC";const pairs={A:"U",T:"A",C:"G",G:"C"};let out="";for(const b of dna){out+=pairs[b]}out;`,
  ],
]

let failures = 0

function check(label: string, ok: boolean, detail = "") {
  if (!ok) failures++
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}${detail ? ` — ${detail}` : ""}`)
}

/** Mirrors the sandbox's tolerant numeric comparison. */
function matches(result: unknown, expected: string): boolean {
  const got = String(result).trim()
  if (got === expected.trim()) return true
  const a = Number(got)
  const b = Number(expected)
  return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < 1e-9
}

console.log(`\n=== Module integrity (${feedData.length} modules) ===\n`)

feedData.forEach((item, i) => {
  console.log(`[${i + 1}] ${item.title} — expects "${item.expectedOutput}"`)

  const starter = analyzeCode(item.initialCode, item.requiredSyntax, item.expectedOutput)
  check("starter parses", starter.parsed, starter.parseError ?? "")

  const starterRun = runSnippet(item.initialCode)
  check(
    "starter does not already pass",
    !(starterRun.ok && matches(starterRun.value, item.expectedOutput)),
  )

  const run = runSnippet(SOLUTIONS[i])
  check("solution runs", run.ok, run.ok ? `→ ${String(run.value)}` : run.message)
  check("solution output matches", run.ok && matches(run.value, item.expectedOutput))

  const analysis = analyzeCode(SOLUTIONS[i], item.requiredSyntax, item.expectedOutput)
  check("solution earns full credit", analysis.satisfied, analysis.warning ?? "")

  check("quiz answer index is in range", item.quizQuestion.answerIndex < item.quizQuestion.options.length)
  console.log("")
})

console.log("=== Cheat detection (correct output, wrong technique) ===\n")

for (const [i, label, code] of CHEATS) {
  const item = feedData[i]
  const run = runSnippet(code)

  console.log(`[${i + 1}] ${item.title} — ${label}`)
  check("output is correct", run.ok && matches(run.value, item.expectedOutput))

  const analysis = analyzeCode(code, item.requiredSyntax, item.expectedOutput)
  check("flagged as NOT full credit", !analysis.satisfied, analysis.warning ?? "no warning!")
  check("warning + hint present", Boolean(analysis.warning) && Boolean(analysis.hint))
  console.log("")
}

console.log("=== Guards ===\n")
const broken = analyzeCode("const x = ;", feedData[0].requiredSyntax, "7")
check("syntax error caught before eval", !broken.parsed, broken.parseError ?? "")

console.log("")
console.log(failures === 0 ? "✅ ALL CHECKS PASSED" : `❌ ${failures} CHECK(S) FAILED`)
process.exit(failures === 0 ? 0 : 1)
