import { useEffect, useRef, useState } from 'react'

// 🎤 The chef's voice into words, with the browser's own listening
// (Chrome, Safari). Words appear as they are said.

interface Recognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

type RecognitionClass = new () => Recognition

function recognitionClass(): RecognitionClass | undefined {
  const w = window as unknown as { SpeechRecognition?: RecognitionClass; webkitSpeechRecognition?: RecognitionClass }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

export type ListenTrouble = 'unsupported' | 'denied' | 'failed'

interface Options {
  // The words so far, including what came before listening started.
  onWords: (text: string) => void
  // Listening stopped; `send` is true when the chef pressed to finish.
  onEnd: (send: boolean) => void
  onTrouble: (t: ListenTrouble) => void
}

export function useListen({ onWords, onEnd, onTrouble }: Options) {
  const [listening, setListening] = useState(false)
  const rec = useRef<Recognition | null>(null)
  const finish = useRef(false)
  const opts = useRef({ onWords, onEnd, onTrouble })
  opts.current = { onWords, onEnd, onTrouble }

  useEffect(() => () => rec.current?.abort(), [])

  function start(before: string) {
    const Rec = recognitionClass()
    if (!Rec) return opts.current.onTrouble('unsupported')
    const r = new Rec()
    r.lang = 'ja-JP'
    r.continuous = true
    r.interimResults = true
    const lead = before ? before.replace(/\s+$/, '') + ' ' : ''
    r.onresult = (e) => {
      let said = ''
      for (let i = 0; i < e.results.length; i++) said += e.results[i][0].transcript
      opts.current.onWords(lead + said)
    }
    r.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return
      finish.current = false
      opts.current.onTrouble(e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'denied' : 'failed')
    }
    r.onend = () => {
      rec.current = null
      setListening(false)
      opts.current.onEnd(finish.current)
      finish.current = false
    }
    finish.current = false
    rec.current = r
    try {
      r.start()
      setListening(true)
    } catch {
      rec.current = null
      opts.current.onTrouble('failed')
    }
  }

  // Second press: stop, and send what was said.
  function stopAndSend() {
    finish.current = true
    rec.current?.stop()
  }

  return { listening, start, stopAndSend }
}
