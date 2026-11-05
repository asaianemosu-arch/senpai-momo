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

// A photo that comes with the sample shop, kept under its own id.
export async function putPhoto(id: string, blob: Blob): Promise<void> {
  await run('readwrite', (s) => s.put(blob, id))
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

// A short video of a step, kept the same way under an id starting "v-".
// It goes in the step's photo place, so a step has a photo or a video.
// Momo cannot watch it: it is there for people to see the hands at work.
export const VIDEO_MAX_SEC = 30
const VIDEO_MAX_BYTES = 250 * 1024 * 1024

export function isVideo(id: string | undefined): boolean {
  return !!id && id.startsWith('v-')
}

// Its length in seconds, or NaN when this browser cannot open it.
function lengthOf(file: Blob): Promise<number> {
  return new Promise((ok) => {
    const v = document.createElement('video')
    const url = URL.createObjectURL(file)
    const done = (n: number) => {
      URL.revokeObjectURL(url)
      ok(n)
    }
    v.preload = 'metadata'
    v.muted = true
    v.onloadedmetadata = () => done(v.duration)
    v.onerror = () => done(NaN)
    setTimeout(() => done(NaN), 8000)
    v.src = url
  })
}

// Keeps a video the chef chose; says why when it cannot.
export async function keepVideo(file: File): Promise<string> {
  if (!file.type.startsWith('video/') && !/\.(mov|mp4|m4v|webm)$/i.test(file.name)) {
    throw new VideoTrouble('動画のファイルを選んでください。')
  }
  if (file.size > VIDEO_MAX_BYTES) throw new VideoTrouble(`動画が大きすぎます。${VIDEO_MAX_SEC}秒くらいまでにしてください。`)
  const sec = await lengthOf(file)
  // A length this browser cannot tell (NaN, Infinity) is let through.
  if (Number.isFinite(sec) && sec > VIDEO_MAX_SEC + 0.5) throw new VideoTrouble(`動画は${VIDEO_MAX_SEC}秒までです（いまは${Math.round(sec)}秒）。短く切ってから入れてください。`)
  const id = `v-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  await run('readwrite', (s) => s.put(file.type ? file : new Blob([file], { type: 'video/mp4' }), id))
  return id
}

export class VideoTrouble extends Error {}
