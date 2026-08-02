import type { SyntaxRequirement } from "@/lib/analyzer"

export type QuizQuestion = {
  prompt: string
  options: string[]
  answerIndex: number
}

export type FeedItem = {
  id: number
  title: string
  concept: string
  /** Short tag used by the reel chrome, e.g. "CS" or "PHYSICS". */
  field: string
  videoUrl: string
  caption: string
  initialCode: string
  /** Result the evaluated code must produce (numbers compared numerically). */
  expectedOutput: string
  challengePrompt: string
  aiContext: string
  quizQuestion: QuizQuestion
  /**
   * Static-analysis contract. Passing the output check without satisfying this
   * earns partial credit instead of the full award.
   */
  requiredSyntax?: SyntaxRequirement
  /** Minutes of doomscrolling this module displaces, for the "Brainrot Avoided" stat. */
  minutesSaved: number
}

export const FULL_XP = 100
export const PARTIAL_XP = 50

export const feedData: FeedItem[] = [
  {
    id: 1,
    title: "Array Methods",
    concept: "Filter & Reduce",
    field: "CS",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    caption:
      "A `for` loop is the slow scroll. `.filter()` and `.reduce()` are the swipe — describe what you want, not how to walk the list.",
    challengePrompt:
      "Keep only the reels you actually learned from (score ≥ 50), then total their minutes.",
    initialCode: `// Each entry is a reel you watched today.
const reels = [
  { minutes: 4, score: 80 },
  { minutes: 7, score: 20 },
  { minutes: 3, score: 65 },
  { minutes: 6, score: 10 },
];

// TODO: use .filter() then .reduce() to total the minutes
// of the reels scoring 50 or higher.
0;`,
    expectedOutput: "7",
    requiredSyntax: {
      label: "ES6 array methods",
      allOfMethods: ["filter", "reduce"],
      hint: "Chain them: reels.filter(...).reduce((sum, r) => ..., 0)",
    },
    aiContext:
      "You are a friendly computer science tutor teaching JavaScript array methods — map, filter, and reduce. Explain declarative vs imperative iteration, the reduce accumulator, and why chaining reads better than a for loop. Keep answers concise and encouraging.",
    quizQuestion: {
      prompt: "What is the second argument to `.reduce()`?",
      options: [
        "The index to start from",
        "The initial value of the accumulator",
        "The array to reduce into",
      ],
      answerIndex: 1,
    },
    minutesSaved: 4,
  },
  {
    id: 2,
    title: "Newton's Second Law",
    concept: "Force = Mass × Acceleration",
    field: "PHYSICS",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    caption:
      "Force is just how hard you push mass to make it accelerate. A 10 kg mass in free fall — how many Newtons?",
    challengePrompt: "mass = 10 kg, acceleration = 9.8 m/s². Return the net force in Newtons.",
    initialCode: `// Newton's 2nd law:  F = m * a
const mass = 10;          // kilograms
const acceleration = 9.8; // m/s^2

// TODO: return the net force in Newtons.
// Compute it from the variables — don't type the answer.
0;`,
    expectedOutput: "98",
    requiredSyntax: {
      label: "variable-driven math",
      requiredIdentifiers: ["mass", "acceleration"],
      hint: "Multiply the two variables so the formula still works if the numbers change.",
    },
    aiContext:
      "You are a friendly physics tutor teaching Newton's second law (F = m * a). Explain force, mass, and acceleration with everyday examples and units. Keep answers concise and encouraging.",
    quizQuestion: {
      prompt: "If you double the mass but keep acceleration constant, the force...",
      options: ["Stays the same", "Doubles", "Is halved"],
      answerIndex: 1,
    },
    minutesSaved: 4,
  },
  {
    id: 3,
    title: "Recursion",
    concept: "Divide & Conquer",
    field: "CS",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    caption:
      "Each Fibonacci number is the sum of the two before it. Recursion lets a function call itself to build the sequence.",
    challengePrompt: "Finish the recursion so fib(6) returns the 6th Fibonacci number (1,1,2,3,5,8).",
    initialCode: `// Sequence: 1, 1, 2, 3, 5, 8, ...
function fib(n) {
  // TODO: add the base case, then the recursive case.
  return n;
}

fib(6);`,
    expectedOutput: "8",
    requiredSyntax: {
      label: "recursion",
      requiresRecursion: true,
      hint: "fib() has to call fib() — stop the descent with `if (n <= 2) return 1`.",
    },
    aiContext:
      "You are a friendly computer science tutor teaching recursion and the Fibonacci sequence. Explain base cases, recursive cases, the call stack, and time complexity in simple terms. Keep answers concise and encouraging.",
    quizQuestion: {
      prompt: "Why does naive recursive Fibonacci get slow for large n?",
      options: [
        "It uses too much memory for the base case",
        "It recomputes the same subproblems many times",
        "JavaScript can't handle recursion",
      ],
      answerIndex: 1,
    },
    minutesSaved: 5,
  },
  {
    id: 4,
    title: "Memoization",
    concept: "Trading Space for Time",
    field: "CS",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    caption:
      "Naive fib(30) makes ~2.7 million calls. Cache each answer the first time you compute it and that collapses to 30.",
    challengePrompt:
      "Finish fastFib so it recurses — and caches each answer in `cache` on the way back up.",
    initialCode: `const cache = {};

function fastFib(n) {
  // TODO: 1. return cache[n] when we've already solved n
  //       2. recurse like module 3
  //       3. store the result in cache[n] before returning it
  if (n <= 2) return 1;
  return 0;
}

fastFib(30);`,
    expectedOutput: "832040",
    requiredSyntax: {
      label: "memo cache usage",
      requiresRecursion: true,
      // Merely declaring `const cache = {}` must not count — it has to be indexed.
      requiredMemberAccessOn: ["cache"],
      hint: "if (cache[n]) return cache[n]; … then `return (cache[n] = fastFib(n-1) + fastFib(n-2))`",
    },
    aiContext:
      "You are a friendly computer science tutor teaching memoization and dynamic programming. Explain caching, the space/time tradeoff, and how memoization turns exponential Fibonacci into linear time. Keep answers concise and encouraging.",
    quizQuestion: {
      prompt: "Memoized Fibonacci trades away which resource to gain speed?",
      options: ["Accuracy", "Memory", "Stack depth"],
      answerIndex: 1,
    },
    minutesSaved: 5,
  },
  {
    id: 5,
    title: "Radioactive Decay",
    concept: "Half-Life",
    field: "CHEMISTRY",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    caption:
      "Every half-life, exactly half the sample is gone. That's not subtraction — it's repeated halving, which means exponents.",
    challengePrompt: "Start with 80 g. How many grams remain after 4 half-lives?",
    initialCode: `// Every half-life, half of what remains decays away.
const start = 80;     // grams
const halfLives = 4;

// TODO: return the grams remaining.
// Use Math.pow() or the ** operator — not a hand-typed division.
0;`,
    expectedOutput: "5",
    requiredSyntax: {
      label: "exponent math",
      anyOfMethods: ["pow"],
      anyOfOperators: ["**"],
      hint: "remaining = start / 2 ** halfLives",
    },
    aiContext:
      "You are a friendly chemistry tutor teaching radioactive decay and half-life. Explain exponential decay, why it never quite reaches zero, and real examples like carbon-14 dating. Keep answers concise and encouraging.",
    quizQuestion: {
      prompt: "After 3 half-lives, what fraction of the original sample is left?",
      options: ["1/3", "1/6", "1/8"],
      answerIndex: 2,
    },
    minutesSaved: 4,
  },
  {
    id: 6,
    title: "DNA Transcription",
    concept: "Base Pairing",
    field: "BIOLOGY",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    caption:
      "Transcription rewrites DNA into RNA one base at a time: A→U, T→A, C→G, G→C. That's a map over a sequence.",
    challengePrompt: "Transcribe the DNA strand \"ATGC\" into its RNA strand.",
    initialCode: `const dna = "ATGC";
const pairs = { A: "U", T: "A", C: "G", G: "C" };

// TODO: split the strand into bases, map each one through
// \`pairs\`, and join it back into a string.
"";`,
    expectedOutput: "UACG",
    requiredSyntax: {
      label: "ES6 array methods",
      allOfMethods: ["split", "map", "join"],
      hint: 'dna.split("").map((base) => pairs[base]).join("")',
    },
    aiContext:
      "You are a friendly biology tutor teaching DNA transcription and base pairing. Explain the difference between DNA and RNA, why uracil replaces thymine, and what mRNA does next. Keep answers concise and encouraging.",
    quizQuestion: {
      prompt: "Which base replaces thymine (T) when DNA is transcribed into RNA?",
      options: ["Cytosine (C)", "Uracil (U)", "Guanine (G)"],
      answerIndex: 1,
    },
    minutesSaved: 4,
  },
]

export const TOTAL_MINUTES_AVAILABLE = feedData.reduce((sum, i) => sum + i.minutesSaved, 0)
