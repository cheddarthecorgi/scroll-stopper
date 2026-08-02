export type RunResult =
  | { ok: true; value: unknown }
  | { ok: false; message: string }

/**
 * Evaluate a learner's challenge snippet and return its completion value —
 * the value of the last expression, which is what the challenges are written
 * against.
 *
 * Indirect eval (`(0, eval)`) is used deliberately: it runs the snippet in
 * global scope rather than capturing this function's locals, so the learner
 * can't accidentally reference internals, and each run gets a fresh
 * declarative environment for its `let`/`const` bindings.
 *
 * This lives outside the component tree on purpose — React Compiler bails out
 * of any component containing `eval`, and we'd rather keep the sandbox UI
 * optimizable. Callers must run `analyzeCode` first so a syntax error is
 * reported without ever reaching this function.
 */
export function runSnippet(code: string): RunResult {
  try {
    const indirectEval = eval
    return { ok: true, value: indirectEval(code) }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) }
  }
}
