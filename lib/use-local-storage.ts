"use client"

import { useCallback, useSyncExternalStore } from "react"
import { readString, writeString } from "@/lib/storage"

/**
 * Subscribers are keyed by storage key so a write in one component re-renders
 * every other reader of that key — including in the same tab, which the native
 * `storage` event does not cover.
 */
const listeners = new Map<string, Set<() => void>>()

/** Cache the last value per key: useSyncExternalStore requires a stable snapshot. */
const cache = new Map<string, string>()

function emit(key: string) {
  listeners.get(key)?.forEach((fn) => fn())
}

function subscribe(key: string, onChange: () => void) {
  let set = listeners.get(key)
  if (!set) {
    set = new Set()
    listeners.set(key, set)
  }
  set.add(onChange)

  // Also react to writes from another tab.
  const onStorage = (e: StorageEvent) => {
    if (e.key === key) {
      cache.delete(key)
      onChange()
    }
  }
  window.addEventListener("storage", onStorage)

  return () => {
    set.delete(onChange)
    window.removeEventListener("storage", onStorage)
  }
}

/**
 * A localStorage-backed string that stays hydration-safe: during SSR and the
 * first client render it reports `serverValue`, then swaps to the stored value
 * once React attaches. Using useSyncExternalStore instead of a mount effect
 * avoids the cascading-render pattern React 19 warns about.
 */
export function useLocalStorage(
  key: string,
  serverValue = "",
): [string, (next: string) => void] {
  const value = useSyncExternalStore(
    useCallback((onChange: () => void) => subscribe(key, onChange), [key]),
    useCallback(() => {
      const cached = cache.get(key)
      if (cached !== undefined) return cached
      const fresh = readString(key, serverValue)
      cache.set(key, fresh)
      return fresh
    }, [key, serverValue]),
    useCallback(() => serverValue, [serverValue]),
  )

  const setValue = useCallback(
    (next: string) => {
      writeString(key, next)
      cache.set(key, next)
      emit(key)
    },
    [key],
  )

  return [value, setValue]
}
