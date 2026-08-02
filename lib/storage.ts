/**
 * localStorage helpers that no-op during SSR and swallow quota/privacy-mode
 * errors, so a blocked storage API can never take the feed down.
 */

export function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeJSON(key: string, value: unknown): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage full or disabled — progress just won't survive the refresh */
  }
}

export function readString(key: string, fallback = ""): string {
  if (typeof window === "undefined") return fallback
  try {
    return window.localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}

export function writeString(key: string, value: string): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(key, value)
  } catch {
    /* ignore */
  }
}

export function removeKey(key: string): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

export const STORAGE_KEYS = {
  progress: "scrollstopper_progress_v1",
  apiKey: "openai_api_key",
  model: "openai_model",
  introSeen: "scrollstopper_intro_seen_v1",
} as const
