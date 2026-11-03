import { useEffect, useState } from 'react'

// The chef's photos pasted on the paper. They are too big for the place
// that keeps the conversation and the paper, so they live in the browser's
// database (IndexedDB), on this device only, under a short id.

const DB = 'senpai-momo'
const STORE = 'photos'

function open(): Promise<IDBDatabase> {
  return new Promise((ok, fail) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => ok(req.result)
    req.onerror = () => fail(req.error)
  })
}

async function run<T>(mode: IDBTransactionMode, act: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  return new Promise((ok, fail) => {
    const req = act(db.transaction(STORE, mode).objectStore(STORE))
    req.onsuccess = () => ok(req.result)
    req.onerror = () => fail(req.error)
  })
}

// A JPEG given as base64; returns the id it is kept under.
export async function keepPhoto(base64: string): Promise<string> {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  const id = `p-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  await run('readwrite', (s) => s.put(new Blob([bytes], { type: 'image/jpeg' }), id))
  return id
}

const urls = new Map<string, Promise<string | null>>()

function urlOf(id: string): Promise<string | null> {
  let p = urls.get(id)
  if (!p) {
    p = run<Blob | undefined>('readonly', (s) => s.get(id))
      .then((blob) => (blob ? URL.createObjectURL(blob) : null))
      .catch(() => null)
    urls.set(id, p)
  }
  return p
}

export function usePhoto(id: string | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    setUrl(null)
    if (id) urlOf(id).then((u) => live && setUrl(u))
    return () => {
      live = false
    }
  }, [id])
  return url
}
