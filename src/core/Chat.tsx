import { useEffect, useRef, useState } from 'react'
import type { Message, Role } from './types'
import momoUrl from '../../assets/momo/01.png'

interface Props {
  role: Role
  messages: Message[]
  waiting: boolean
  onSend: (text: string) => void
  // On a phone the paper is hidden; this opens it from the conversation.
  onShowPaper?: (sectionId?: string) => void
}

const HEADER: Record<Role, string> = {
  chef: 'シェフとお話し中',
  staff: 'モモに聞く',
}

const FACE: Record<Role, string> = {
  chef: '🧑‍🍳',
  staff: '🙋',
}

export function Chat({ role, messages, waiting, onSend, onShowPaper }: Props) {
  const [draft, setDraft] = useState('')
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [messages, waiting])

  function send() {
    const text = draft.trim()
    if (!text || waiting) return
    onSend(text)
    setDraft('')
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
              <div className="bubble">{m.text}</div>
            </div>
            {m.filed && <p className="filed">→ {m.filed}</p>}
            {m.filed && onShowPaper && (
              <button type="button" className="open-paper" onClick={() => onShowPaper(m.filedTo)}>
                📄 紙を見る
              </button>
            )}
          </div>
        ))}
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
          <button type="button" className="ways">
            <span className="ways-ic">✍️</span>
            <span className="long">手書きを読む</span>
            <span className="short">手書き</span>
          </button>
          <button type="button" className="mic" aria-label="話す">
            <span className="mic-icon">🎤</span>
            <span className="mic-label">話す</span>
          </button>
          <button type="button" className="ways">
            <span className="ways-ic">📋</span>
            <span className="long">貼る</span>
            <span className="short">貼る</span>
          </button>
        </div>
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
            placeholder="文字でも書けます"
          />
          <button type="submit" className="send" aria-label="送る">↑</button>
        </form>
      </div>
    </section>
  )
}
