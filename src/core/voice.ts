import { useEffect, useRef, useState } from 'react'

// 🔊 Momo's voice: read a bubble aloud through the relay (ElevenLabs).
// Each text is made once and kept, so playing it again costs nothing.

const made = new Map<string, Promise<string>>()
let player: HTMLAudioElement | null = null
let stopCurrent: (() => void) | null = null

export class VoiceError extends Error {
  constructor(readonly kind: 'not_ready' | 'busy' | 'failed') {
    super(kind)
  }
}

function make(text: string): Promise<string> {
  let p = made.get(text)
  if (!p) {
    p = fetch('/api/voice', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text }),
    }).then(async (res) => {
      if (!res.ok) {
        throw new VoiceError(res.status === 503 ? 'not_ready' : res.status === 429 ? 'busy' : 'failed')
      }
      return URL.createObjectURL(await res.blob())
    })
    p.catch(() => made.delete(text))
    made.set(text, p)
  }
  return p
}

export type VoiceState = 'idle' | 'loading' | 'playing'

// One bubble's voice. Starting one stops whichever was playing.
export function useVoice(text: string, onError: (e: VoiceError) => void) {
  const [state, setState] = useState<VoiceState>('idle')
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  async function toggle() {
    if (state !== 'idle') {
      stopCurrent?.()
      return
    }
    stopCurrent?.()
    setState('loading')
    let cancelled = false
    stopCurrent = () => {
      cancelled = true
      player?.pause()
      if (alive.current) setState('idle')
    }
    try {
      const url = await make(text)
      if (cancelled) return
      player ??= new Audio()
      player.src = url
      player.onended = () => {
        if (alive.current) setState('idle')
      }
      await player.play()
      if (alive.current && !cancelled) setState('playing')
    } catch (e) {
      if (alive.current) setState('idle')
      if (!cancelled) onError(e instanceof VoiceError ? e : new VoiceError('failed'))
    }
  }

  return { state, toggle }
}
