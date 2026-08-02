import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Tells the client whether the server holds its own OpenAI key, so the drawer
 * can hide the key field entirely on a properly configured deployment.
 * Only ever reports presence — never the key itself.
 */
export async function GET() {
  return NextResponse.json({ hasServerKey: Boolean(process.env.OPENAI_API_KEY?.trim()) })
}
