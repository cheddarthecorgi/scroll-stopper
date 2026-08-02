import { parse } from "acorn"
import * as walk from "acorn-walk"

/**
 * A static-analysis contract attached to a challenge. The learner can often
 * produce the right *number* without using the technique the reel taught, so we
 * parse their code and check that the technique actually shows up.
 */
export type SyntaxRequirement = {
  /** Shown in the warning banner, e.g. "ES6 array methods". */
  label: string
  /** Every one of these methods must be called somewhere (e.g. ["filter", "reduce"]). */
  allOfMethods?: string[]
  /** At least one of these methods must be called. */
  anyOfMethods?: string[]
  /** Every one of these identifiers must be referenced (blocks magic numbers). */
  requiredIdentifiers?: string[]
  /**
   * Every one of these must be *indexed into* — `cache[n]`, not merely declared.
   * Stricter than `requiredIdentifiers`, which a starter's own `const cache = {}`
   * would already satisfy.
   */
  requiredMemberAccessOn?: string[]
  /** At least one of these binary operators must appear (e.g. ["**"]). */
  anyOfOperators?: string[]
  /** A function must call itself. */
  requiresRecursion?: boolean
  /** Hint rendered under the warning when the requirement is unmet. */
  hint: string
}

export type Analysis = {
  /** False when the snippet is not syntactically valid JavaScript. */
  parsed: boolean
  parseError?: string
  /** True when every declared requirement is satisfied. */
  satisfied: boolean
  /** True when the answer looks pasted in as a bare literal rather than computed. */
  hardcoded: boolean
  /** Method names the learner actually called, for the console readout. */
  usedMethods: string[]
  /** Populated when `satisfied` is false. */
  warning?: string
  hint?: string
}

type Facts = {
  methods: Set<string>
  identifiers: Set<string>
  /** Names of objects that get indexed or dotted into, e.g. `cache` in `cache[n]`. */
  memberObjects: Set<string>
  operators: Set<string>
  /** Names of functions that call themselves. */
  recursiveFns: Set<string>
  /** Every literal value in the program, stringified. */
  literals: string[]
  /** Literals that appear as a standalone top-level expression statement. */
  topLevelLiterals: string[]
  /** True if the program does any arithmetic or calls anything at all. */
  computes: boolean
}

/** Walk the AST once and collect everything the requirement checks might need. */
function collectFacts(ast: import("acorn").Program): Facts {
  const facts: Facts = {
    methods: new Set(),
    identifiers: new Set(),
    memberObjects: new Set(),
    operators: new Set(),
    recursiveFns: new Set(),
    literals: [],
    topLevelLiterals: [],
    computes: false,
  }

  // Track which function we are inside so a self-call can be detected.
  const fnStack: string[] = []

  /*
   * acorn-walk's `recursive` dispatches on node.type, and a visitor it defines
   * must recurse into children itself. `Function` is reached because the base
   * walker forwards FunctionDeclaration/FunctionExpression/ArrowFunctionExpression
   * to that key.
   */
  const visitors: Record<string, (node: any, state: unknown, c: any) => void> = {
    Function(node: any, state: any, c: any) {
      const name =
        node.id?.name ??
        // `const fib = function () {}` / `const fib = () => {}`
        (node.__inferredName as string | undefined) ??
        ""
      fnStack.push(name)
      if (node.body) c(node.body, state)
      for (const p of node.params ?? []) c(p, state)
      fnStack.pop()
    },
    VariableDeclarator(node: any, state: any, c: any) {
      // Give anonymous function expressions the name they are assigned to, so
      // `const fib = (n) => fib(n - 1)` still registers as recursion.
      if (
        node.id?.type === "Identifier" &&
        (node.init?.type === "ArrowFunctionExpression" ||
          node.init?.type === "FunctionExpression")
      ) {
        node.init.__inferredName = node.id.name
      }
      if (node.id) c(node.id, state)
      if (node.init) c(node.init, state)
    },
    CallExpression(node: any, state: any, c: any) {
      facts.computes = true
      const callee = node.callee
      if (callee?.type === "MemberExpression" && callee.property?.type === "Identifier") {
        facts.methods.add(callee.property.name)
      }
      if (callee?.type === "Identifier") {
        facts.methods.add(callee.name)
        // A call to the function we are currently inside is recursion.
        if (fnStack.length > 0 && fnStack[fnStack.length - 1] === callee.name) {
          facts.recursiveFns.add(callee.name)
        }
      }
      if (callee) c(callee, state)
      for (const arg of node.arguments ?? []) c(arg, state)
    },
    Identifier(node: any) {
      facts.identifiers.add(node.name)
    },
    MemberExpression(node: any, state: any, c: any) {
      if (node.object?.type === "Identifier") facts.memberObjects.add(node.object.name)
      if (node.object) c(node.object, state)
      // A non-computed property is a name, not a reference — don't walk it.
      if (node.computed && node.property) c(node.property, state)
    },
    BinaryExpression(node: any, state: any, c: any) {
      facts.computes = true
      facts.operators.add(node.operator)
      c(node.left, state)
      c(node.right, state)
    },
    Literal(node: any) {
      facts.literals.push(String(node.value))
    },
  }

  walk.recursive(ast as never, null, visitors as never)

  // A bare `98;` as the program's result is the classic "just type the answer" move.
  for (const node of ast.body) {
    if (node.type === "ExpressionStatement") {
      const expr = (node as { expression?: { type: string; value: unknown } }).expression
      if (expr?.type === "Literal") facts.topLevelLiterals.push(String(expr.value))
    }
  }

  return facts
}

/**
 * Parse the learner's snippet and check it against the challenge's requirement.
 * Runs *before* evaluation, so a syntax error is reported without executing.
 */
export function analyzeCode(
  code: string,
  requirement?: SyntaxRequirement,
  expectedOutput?: string,
): Analysis {
  let ast: import("acorn").Program
  try {
    ast = parse(code, { ecmaVersion: "latest", sourceType: "script" })
  } catch (err) {
    return {
      parsed: false,
      parseError: err instanceof Error ? err.message : String(err),
      satisfied: false,
      hardcoded: false,
      usedMethods: [],
    }
  }

  const facts = collectFacts(ast)
  const usedMethods = [...facts.methods].sort()

  // The answer is "hardcoded" when it sits at the top level as a raw literal
  // and the program never computes anything.
  const expected = expectedOutput?.trim()
  const hardcoded =
    expected !== undefined &&
    expected !== "" &&
    facts.topLevelLiterals.includes(expected) &&
    !facts.computes

  if (!requirement) {
    return {
      parsed: true,
      satisfied: !hardcoded,
      hardcoded,
      usedMethods,
      warning: hardcoded
        ? "⚠️ Answer hardcoded — the value is right but nothing was computed"
        : undefined,
      hint: hardcoded ? "Compute the result from the variables above." : undefined,
    }
  }

  const missing: string[] = []

  for (const m of requirement.allOfMethods ?? []) {
    if (!facts.methods.has(m)) missing.push(`.${m}()`)
  }

  if (requirement.anyOfMethods?.length) {
    const hasAny = requirement.anyOfMethods.some((m) => facts.methods.has(m))
    const hasOperator = (requirement.anyOfOperators ?? []).some((op) => facts.operators.has(op))
    if (!hasAny && !hasOperator) {
      // List the operator alternatives too, so the hint isn't misleadingly narrow.
      const alternatives = [
        ...requirement.anyOfMethods.map((m) => `.${m}()`),
        ...(requirement.anyOfOperators ?? []),
      ]
      missing.push(alternatives.join(" or "))
    }
  } else if (requirement.anyOfOperators?.length) {
    if (!requirement.anyOfOperators.some((op) => facts.operators.has(op))) {
      missing.push(requirement.anyOfOperators.join(" or "))
    }
  }

  for (const id of requirement.requiredIdentifiers ?? []) {
    if (!facts.identifiers.has(id)) missing.push(`\`${id}\``)
  }

  for (const obj of requirement.requiredMemberAccessOn ?? []) {
    if (!facts.memberObjects.has(obj)) missing.push(`a read/write of \`${obj}[...]\``)
  }

  if (requirement.requiresRecursion && facts.recursiveFns.size === 0) {
    missing.push("a self-calling function")
  }

  const satisfied = missing.length === 0 && !hardcoded

  let warning: string | undefined
  if (hardcoded) {
    warning = "⚠️ Answer hardcoded — the value is right but nothing was computed"
  } else if (missing.length > 0) {
    warning = `⚠️ Missing required ${requirement.label} — ${missing.join(", ")}`
  }

  return {
    parsed: true,
    satisfied,
    hardcoded,
    usedMethods,
    warning,
    hint: satisfied ? undefined : requirement.hint,
  }
}
