import { NextResponse } from "next/server"

export const runtime = "nodejs"
/** The tutor is per-request and personalised; never serve it from the cache. */
export const dynamic = "force-dynamic"

const ALLOWED_MODELS = ["gpt-5-mini", "gpt-5-nano"] as const
type AllowedModel = (typeof ALLOWED_MODELS)[number]

const MAX_MESSAGES = 24
const MAX_CHARS = 4000
const OPENAI_URL = "https://api.openai.com/v1/chat/completions"

type ChatMessage = { role: "user" | "assistant"; content: string }

type Body = {
  messages?: ChatMessage[]
  system?: string
  model?: string
  /** Fallback key supplied by the browser when the server has none configured. */
  apiKey?: string
}

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(request: Request) {
  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return bad("Request body must be JSON.")
  }

  const messages = Array.isArray(body.messages) ? body.messages : []
  if (messages.length === 0) return bad("No messages provided.")
  if (messages.length > MAX_MESSAGES) return bad("Conversation too long — start a new one.")

  for (const m of messages) {
    if (m.role !== "user" && m.role !== "assistant") return bad("Invalid message role.")
    if (typeof m.content !== "string" || m.content.length === 0) return bad("Empty message.")
    if (m.content.length > MAX_CHARS) return bad("Message too long.")
  }

  const model: AllowedModel = ALLOWED_MODELS.includes(body.model as AllowedModel)
    ? (body.model as AllowedModel)
    : "gpt-5-mini"

  // A key in the server environment always wins, so a deployed demo needs no
  // key pasted in the browser at all.
  const apiKey = process.env.OPENAI_API_KEY?.trim() || body.apiKey?.trim()
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "No API key configured. Add OPENAI_API_KEY to .env.local and restart the dev server, or paste a key in the tutor panel.",
        needsKey: true,
      },
      { status: 401 },
    )
  }

  const system =
    typeof body.system === "string" && body.system.length > 0 && body.system.length <= MAX_CHARS
      ? body.system
      : "You are a friendly, concise STEM tutor."

  const payload: Record<string, unknown> = {
    model,
    messages: [
      {
        role: "system",
        content: `${system}\n\nReply in fewer than 5 sentences. Use plain text, no markdown headers. Sprinkle in a couple of relevant emojis. End with one short follow-up question that invites the learner to go deeper.`,
      },
      ...messages,
    ],
    max_completion_tokens: 2000,
    // Low effort keeps the demo responsive; these are reasoning models.
    reasoning_effort: "low",
  }

  async function callOpenAI(sendBody: Record<string, unknown>) {
    return fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(sendBody),
    })
  }

  try {
    let res = await callOpenAI(payload)

    // If the account/model rejects an optional tuning param, retry with the
    // minimal payload rather than failing the whole request.
    if (res.status === 400) {
      const cloned = await res.clone().json().catch(() => null)
      const msg: string = cloned?.error?.message ?? ""
      if (/reasoning_effort|max_completion_tokens|unsupported|unrecognized/i.test(msg)) {
        res = await callOpenAI({ model, messages: payload.messages })
      }
    }

    const data = await res.json().catch(() => null)

    if (!res.ok) {
      const message: string = data?.error?.message ?? `OpenAI request failed (${res.status}).`
      return NextResponse.json({ error: message }, { status: res.status })
    }

    const reply: string = data?.choices?.[0]?.message?.content?.trim() ?? ""
    if (!reply) {
      return NextResponse.json(
        { error: "The model returned an empty reply. Try rephrasing your question." },
        { status: 502 },
      )
    }

    return NextResponse.json({ reply, model })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: `Could not reach OpenAI: ${message}` }, { status: 502 })
  }
}
