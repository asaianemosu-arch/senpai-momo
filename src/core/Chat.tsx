import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import type { Message, Role } from './types'
import momoUrl from '../../assets/momo/01.png'
import { useListen, type ListenTrouble } from './useListen'
import { useVoice, type VoiceError } from './voice'
import { HandedView, MomoRead, PasteSheet, PhotoSheet, trouble } from './Handover'
import { PHOTO_ACCEPT, readFile, type Handed } from './files'
import { useNarrow } from './useNarrow'
import { keepPhoto } from './photos'

interface Props {
  role: Role
  messages: Message[]
  waiting: boolean
  // Momo is writing the paper behind the conversation.
  writing?: boolean
  onSend: (text: string, handed?: Handed) => void
  // What Momo points to under her reply, made big ("ここですよ").
  cardFor?: (m: Message) => ReactNode
  // On a phone the paper is hidden; this opens it from the conversation.
  onShowPaper?: (sectionId?: string) => void
}

const HEADER: Record<Role, string> = {
  chef: 'シェフとお話し中',
  staff: 'モモに聞く',
}

const TROUBLE: Record<ListenTrouble | VoiceError['kind'], string> = {
  unsupported: 'このブラウザでは声を聞き取れません。Chrome か Safari で開くと話せます。',
  denied: 'マイクが使えません。ブラウザに聞かれたら「許可」を押してください。',
  failed: 'うまく聞き取れませんでした。もう一度押して話してください。',
  not_ready: 'モモの声は、まだ準備中です。',
  busy: 'モモの声が混みあっています。少しして押してください。',
}

const FACE: Record<Role, string> = {
  chef: '🧑‍🍳',
  staff: '🙋',
}

export function Chat({ role, messages, waiting, writing, onSend, cardFor, onShowPaper }: Props) {
  const [draft, setDraft] = useState('')
  const [hint, setHint] = useState('')
  const [sheet, setSheet] = useState<'paste' | 'photo' | null>(null)
  const narrow = useNarrow()
  const camera = useRef<HTMLInputElement>(null)
  const photos = useRef<HTMLInputElement>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const said = useRef('')
  const ear = useListen({
    onWords: (text) => {
      said.current = text
      setDraft(text)
    },
    onEnd: (finished) => {
      if (finished) send(said.current)
    },
    onTrouble: (t) => setHint(TROUBLE[t]),
  })

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [messages, waiting, writing])

  function send(text = draft) {
    text = text.trim()
    if (!text || waiting) return
    onSend(text)
    setDraft('')
    said.current = ''
  }

  async function hand(h: Handed) {
    setSheet(null)
    setHint('')
    if (waiting) return
    // A photo is kept so Momo can paste it on the paper.
    if (h.attach.kind === 'photo' && h.media?.type === 'image') {
      try {
        h = { ...h, attach: { ...h.attach, photo: await keepPhoto(h.media.data) } }
      } catch {
        // Without the database the photo is still read; it just is not pasted.
      }
    }
    onSend('', h)
  }

  async function photo(f: File) {
    setHint('写真を読んでいます…')
    try {
      const h = await readFile(f)
      hand(h)
    } catch (e) {
      setHint(trouble(e))
    }
  }

  function chosen(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (f) photo(f)
  }

  function mic() {
    setHint('')
    if (ear.listening) ear.stopAndSend()
    else ear.start(draft)
  }

  return (
    <section className="chat">
      <header>{HEADER[role]}</header>

      <div className="log" ref={logRef}>
        {messages.map((m, i) => (
          <div key={i}>
            <div className={m.from === 'momo' ? 'msg' : 'msg me'}>
              <div className="who">
                {m.from === 'momo' ? <img src={momoUrl} alt="" /> : FACE[m.from]}
              </div>
              {m.attach ? (
                <div className="handed-wrap">
                  <HandedView attach={m.attach} />
                  {m.text && <div className="bubble">{m.text}</div>}
                </div>
              ) : (
                <div className="bubble">{m.text}</div>
              )}
              {m.from === 'momo' && <Speak text={m.text} onError={(e) => setHint(TROUBLE[e.kind])} />}
            </div>
            {m.attach && <MomoRead attach={m.attach} />}
            {cardFor?.(m)}
            {m.filed && <p className="filed">→ {m.filed}</p>}
            {m.filed && onShowPaper && (
              <button type="button" className="open-paper" onClick={() => onShowPaper(m.filedTo)}>
                📄 紙を見る
              </button>
            )}
          </div>
        ))}
        {writing && !waiting && <p className="writing">📝 モモが紙に書いています…</p>}
        {waiting && (
          <div className="msg">
            <div className="who">
              <img src={momoUrl} alt="" />
            </div>
            <div className="bubble thinking" aria-label="モモが考えています">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
      </div>

      <div className="composer">
        <div className="speak-row">
          {role === 'chef' && (
            <button
              type="button"
              className="ways"
              disabled={waiting}
              onClick={() => (narrow ? setSheet('photo') : photos.current?.click())}
            >
              <span className="ways-ic">✍️</span>
              <span className="long">手書きを読む</span>
              <span className="short">手書き</span>
            </button>
          )}
          <button
            type="button"
            className={ear.listening ? 'mic on' : 'mic'}
            aria-label={ear.listening ? '話し終えて送る' : '話す'}
            aria-pressed={ear.listening}
            onClick={mic}
          >
            <span className="mic-icon">🎤</span>
            <span className="mic-label">{ear.listening ? '送る' : '話す'}</span>
          </button>
          {role === 'chef' && (
            <button type="button" className="ways" disabled={waiting} onClick={() => setSheet('paste')}>
              <span className="ways-ic">📋</span>
              <span className="long">貼る</span>
              <span className="short">貼る</span>
            </button>
          )}
        </div>
        {hint && <p className="hint">{hint}</p>}
        <form
          className="box"
          onSubmit={(e) => {
            e.preventDefault()
            send()
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={ear.listening ? '聞いています…' : '文字でも書けます'}
          />
          <button type="submit" className="send" aria-label="送る">↑</button>
        </form>
      </div>

      <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={chosen} />
      <input ref={photos} type="file" accept={PHOTO_ACCEPT} hidden onChange={chosen} />
      {sheet === 'paste' && <PasteSheet onHand={hand} onClose={() => setSheet(null)} />}
      {sheet === 'photo' && (
        <PhotoSheet
          onPick={(c) => {
            setSheet(null)
            ;(c ? camera : photos).current?.click()
          }}
          onClose={() => setSheet(null)}
        />
      )}
    </section>
  )
}

// 🔊 under each of Momo's bubbles: press to hear her, press again to stop.
function Speak({ text, onError }: { text: string; onError: (e: VoiceError) => void }) {
  const { state, toggle } = useVoice(text, onError)
  return (
    <button
      type="button"
      className={`speak ${state}`}
      aria-label={state === 'idle' ? 'モモの声で聞く' : '止める'}
      onClick={toggle}
    >
      {state === 'playing' ? '⏹' : '🔊'}
    </button>
  )
}
