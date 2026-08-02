import nextCoreWebVitals from "eslint-config-next/core-web-vitals"

const config = [
  {
    ignores: ["node_modules/**", ".next/**", "out/**", "next-env.d.ts", "tmp-*"],
  },
  ...nextCoreWebVitals,
  {
    files: ["lib/run-snippet.ts"],
    rules: {
      // This module exists to isolate the sandbox's deliberate use of eval:
      // it evaluates the learner's own snippet, in the learner's own tab,
      // after the AST analyzer has already parsed it.
      "no-eval": "off",
      "react-hooks/unsupported-syntax": "off",
    },
  },
]

export default config
