# Scroll Stopper — MarinHacks Edition

A vertical reel feed that hijacks the doomscroll reflex and points it at STEM. Every reel ends in a
live code challenge, and the feed won't unlock the next one until you clear it.

Built with Next.js 16 (App Router, Turbopack), React 19, Tailwind v4, and `acorn` for real static
analysis of learner code.

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

Optional — wire up the AI tutor so nobody has to paste a key during a demo:

```bash
cp .env.local.example .env.local   # then add your key
npm run dev                        # restart to pick up the env var
```

## Scripts

| Script              | What it does                                                     |
| ------------------- | ---------------------------------------------------------------- |
| `npm run dev`       | Dev server with Turbopack                                        |
| `npm run build`     | Production build                                                 |
| `npm run typecheck` | `tsc --noEmit` (the build itself has `ignoreBuildErrors: true`)   |
| `npm run lint`      | ESLint with `eslint-config-next`                                  |
| `npm run verify`    | Content + analyzer test suite (see below)                         |
| `npm run check`     | All three of the above, in order                                  |

---

## How it works

### The feed

`app/page.tsx` renders one full-height `<section>` per module inside a
`snap-y snap-mandatory` scroll container, plus a summary card at the end. Each reel autoplays only
while it's the one snapped into view, driven by an `IntersectionObserver` in
[`components/reel-feed.tsx`](components/reel-feed.tsx).

### The AST analyzer — the interesting bit

Checking a challenge by comparing output alone is trivially cheatable: type `98;` and you "passed"
Newton's second law. So [`lib/analyzer.ts`](lib/analyzer.ts) parses the learner's code with `acorn`
and walks the AST **before** it ever runs, checking that the technique the reel taught actually
appears.

Each module declares a `requiredSyntax` contract in
[`lib/feed-data.ts`](lib/feed-data.ts):

```ts
requiredSyntax: {
  label: "ES6 array methods",
  allOfMethods: ["filter", "reduce"],
  hint: "Chain them: reels.filter(...).reduce((sum, r) => ..., 0)",
}
```

Supported checks:

| Field                     | Catches                                                     |
| ------------------------- | ----------------------------------------------------------- |
| `allOfMethods`            | Every listed method must be called                           |
| `anyOfMethods`            | At least one must be called                                  |
| `anyOfOperators`          | Accepts an operator alternative (e.g. `**` instead of `.pow()`) |
| `requiredIdentifiers`     | Blocks magic numbers — the formula must use the variables    |
| `requiredMemberAccessOn`  | Requires `cache[n]`, not merely `const cache = {}`           |
| `requiresRecursion`       | A function must call itself (handles named *and* arrow-const forms) |

Plus automatic **hardcode detection**: a bare literal at the top level with no computation anywhere
in the program is flagged regardless of what the module declares.

Outcomes:

- Wrong output → **0 XP**, red console
- Right output, contract unmet → **+50 XP**, amber warning + a hint
- Right output, contract met → **+100 XP**, confetti

The parse also runs first, so a syntax error is reported *without* evaluating anything.

### Safety guardrails

`components/progress-provider.tsx` tracks a skip run: leaving a reel in under 6 seconds without
running its code counts as a skip. Three in a row triggers the **Mindful Pause** — a 5-second
countdown modal that freezes the feed container (not just `<body>`, since the reels scroll in a
nested div) and can't be dismissed early.

The **Cognitive Safety Index** in the header is derived from that same state: clearing modules pushes
it up, skips and forced pauses drag it down.

### Persistence

Everything survives a refresh via `localStorage`:

| Key                          | Contents                                                |
| ---------------------------- | ------------------------------------------------------- |
| `scrollstopper_progress_v1`  | Awarded XP per module, attempted reels, unlock position  |
| `scrollstopper_intro_seen_v1`| Whether to show the landing screen                       |
| `openai_api_key`             | Tutor key, only when no server key is configured         |
| `openai_model`               | `gpt-5-mini` or `gpt-5-nano`                             |

Storage reads go through [`lib/use-local-storage.ts`](lib/use-local-storage.ts), which uses
`useSyncExternalStore` so there's no hydration flash and no setState-in-effect cascade.

### The AI tutor

Requests go to [`app/api/tutor/route.ts`](app/api/tutor/route.ts), this app's own server route —
never straight from the browser to OpenAI. The route prefers `process.env.OPENAI_API_KEY` and only
falls back to a browser-supplied key when the server has none. When a server key *is* present,
`/api/tutor/status` tells the client, and the key field disappears from the UI entirely.

The route validates roles, message count, and length, pins the model to an allowlist, and retries
once without optional tuning params if the account rejects them.

---

## Tests

`npm run verify` runs [`scripts/verify-challenges.mts`](scripts/verify-challenges.mts) on Node's
built-in TypeScript stripping — no build step, no test runner. For every module it asserts:

1. The starter code parses.
2. The starter does **not** already produce the expected answer (no freebies).
3. The intended solution runs and matches the expected output.
4. The intended solution satisfies its own `requiredSyntax` contract.
5. The quiz's `answerIndex` is in range.

Then it runs six **cheats** — a for-loop instead of `filter`/`reduce`, a hardcoded `98`, iterative
Fibonacci, recursion without the cache, plain division instead of exponents, string concatenation
instead of `split`/`map`/`join` — and asserts each produces the *correct output* but is still
denied full credit.

This is what caught the memoization module originally shipping a starter that already returned
`832040`.

---

## Known gaps

- **The videos are placeholders.** Every `videoUrl` in `lib/feed-data.ts` points at Google's public
  sample clips (Big Buck Bunny et al.) — they have nothing to do with the STEM content. Swapping in
  real footage is a data-only change; nothing else needs to move.
- **The tutor's live path is untested.** Both error paths (no key → 401, empty messages → 400) are
  verified, but no request has been made against the real OpenAI API from here — that needs a key.
- **`next.config.mjs` sets `typescript.ignoreBuildErrors: true`.** Left as-is from the original
  scaffold, which is why `npm run typecheck` exists as a separate script. It currently passes clean.
- **The sandbox uses `eval`.** Deliberately — it's the learner's own code in the learner's own tab,
  and it's the only way to get "the last expression is the answer" semantics. It's isolated in
  [`lib/run-snippet.ts`](lib/run-snippet.ts) behind indirect `eval` (global scope, no access to
  component internals) and never runs until `acorn` has parsed the input successfully. This is not
  a security boundary and would need a Worker or iframe sandbox if code were ever shared between
  users.
