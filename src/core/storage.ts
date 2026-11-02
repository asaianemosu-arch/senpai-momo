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
