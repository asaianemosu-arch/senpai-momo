import { useEffect, useState } from 'react'

// Everything lives in this browser only. Storage can be unavailable (private mode),
// so every read and write is guarded and the app still works for the session.
const PREFIX = 'senpai-momo:v1:'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

export function usePersistent<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => read(key, fallback))
  useEffect(() => {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value))
    } catch {
      // ignore: keep working in memory
    }
  }, [key, value])
  return [value, setValue] as const
}

function ours(): string[] {
  try {
    return Object.keys(localStorage).filter((k) => k.startsWith(PREFIX))
  } catch {
    return []
  }
}

// Nothing kept yet: someone opening Momo for the first time.
export function firstVisit(): boolean {
  return ours().length === 0
}

// Starts over: everything kept is dropped, then `store` (key → value) is kept.
// The page is reloaded after this, so nothing on screen writes the old back.
export function startOver(store: Record<string, unknown>) {
  try {
    for (const k of ours()) localStorage.removeItem(k)
    for (const [k, v] of Object.entries(store)) localStorage.setItem(PREFIX + k, JSON.stringify(v))
  } catch {
    // ignore: storage is unavailable, the app starts empty as before
  }
}
