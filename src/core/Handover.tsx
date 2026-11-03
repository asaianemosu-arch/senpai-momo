import { useRef, useState } from 'react'
import type { Attachment } from './types'
import { ACCEPT, CannotRead, memo, readFile, type Handed } from './files'

const TROUBLE = 'うまく読めませんでした。別の形（PDF や写真）で渡してみてください。'

export function trouble(e: unknown): string {
  return e instanceof CannotRead ? e.message : TROUBLE
}

interface SheetProps {
  onHand: (h: Handed) => void
  onClose: () => void
}

// 📋 貼る: paste or type a memo, or choose / drop a file.
export function PasteSheet({ onHand, onClose }: SheetProps) {
  const [text, setText] = useState('')
  const [file, setFile] = useState<{ name: string; handed?: Handed } | null>(null)
  const [note, setNote] = useState('')
  const [over, setOver] = useState(false)
  const picker = useRef<HTMLInputElement>(null)

  async function take(f: File) {
    setNote('')
    setFile({ name: f.name })
    try {
      setFile({ name: f.name, handed: await readFile(f) })
    } catch (e) {
      setFile(null)
      setNote(trouble(e))
    }
  }

  function hand() {
    if (file?.handed) return onHand(file.handed)
    if (text.trim()) onHand(memo(text))
  }

  const ready = file ? !!file.handed : !!text.trim()

  return (
    <div className="hand-dim" onClick={onClose}>
      <div
        className={over ? 'hand-sheet over' : 'hand-sheet'}
        onClick={(e) => e.stopPropagation()}
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          const f = e.dataTransfer.files[0]
          if (f) take(f)
        }}
      >
        <div className="hand-head">
          <h3>📋 メモを渡す</h3>
          <button type="button" className="close" aria-label="閉じる" onClick={onClose}>
            ✕
          </button>
        </div>
        <p className="hand-lead">メモや、前に書いた手順を、ここに貼ってください。</p>
        {file ? (
          <div className="hand-file">
            <span>📄 {file.name}</span>
            {file.handed ? (
              <button type="button" aria-label="やめる" onClick={() => setFile(null)}>
                ✕
              </button>
            ) : (
              <small>読んでいます…</small>
            )}
          </div>
        ) : (
          <textarea
            value={text}
            autoFocus
            onChange={(e) => setText(e.target.value)}
            onPaste={(e) => {
              const f = e.clipboardData.files[0]
              if (f) {
                e.preventDefault()
                take(f)
              }
            }}
          />
        )}
        <button type="button" className="hand-files" onClick={() => picker.current?.click()}>
          📎 ファイルを選ぶ
          <small>ここに落としてもいい</small>
        </button>
        <p className="hand-kinds">PDF・写真（JPG・PNG・HEIC）・Word・Excel・文字のファイル</p>
        {note && <p className="hand-note">{note}</p>}
        <input
          ref={picker}
          type="file"
          accept={ACCEPT}
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (f) take(f)
          }}
        />
        <button type="button" className="hand-go" disabled={!ready} onClick={hand}>
          モモに渡す
        </button>
      </div>
    </div>
  )
}

// ✍️ 手書きを読む on a phone: take a picture, or choose one.
export function PhotoSheet({ onPick, onClose }: { onPick: (camera: boolean) => void; onClose: () => void }) {
  return (
    <div className="hand-dim" onClick={onClose}>
      <div className="hand-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="hand-head">
          <h3>✍️ 手書きを読む</h3>
          <button type="button" className="close" aria-label="閉じる" onClick={onClose}>
            ✕
          </button>
        </div>
        <p className="hand-lead">メモや紙を撮ってください。字が斜めでも大丈夫です。</p>
        <div className="hand-choose">
          <button type="button" onClick={() => onPick(true)}>
            <b>📷</b>撮る
          </button>
          <button type="button" onClick={() => onPick(false)}>
            <b>🖼️</b>選ぶ
          </button>
        </div>
        <p className="hand-kinds">写真（JPG・PNG・HEIC）や、紙を読み込んだ PDF も選べます</p>
      </div>
    </div>
  )
}

const TAG: Record<Attachment['kind'], string> = {
  memo: '📋 貼ったメモ',
  file: '📄',
  photo: '📷',
}

// What the chef handed over, folded in the conversation.
export function HandedView({ attach }: { attach: Attachment }) {
  const [open, setOpen] = useState(false)
  const lines = attach.text ? attach.text.split('\n').length : 0
  if (attach.kind === 'photo') {
    return attach.thumb ? <img className="handed-photo" src={attach.thumb} alt={attach.name ?? '写真'} /> : null
  }
  const seenByMomo = !!attach.name && /\.pdf$/i.test(attach.name)
  return (
    <div className="handed">
      <div className="tag">
        {TAG[attach.kind]}
        {attach.name && ` ${attach.name}`}
      </div>
      {!seenByMomo && attach.text && (
        <>
          <pre className={open ? 'open' : ''}>{attach.text}</pre>
          {lines > 4 && (
            <button type="button" className="more" onClick={() => setOpen(!open)}>
              {open ? '▾ たたむ' : `▸ 全部見る（${lines}行）`}
            </button>
          )}
        </>
      )}
    </div>
  )
}

// Under a photo or PDF: the words Momo read, to check.
export function MomoRead({ attach }: { attach: Attachment }) {
  const looked = attach.kind === 'photo' || (!!attach.name && /\.pdf$/i.test(attach.name))
  if (!looked || !attach.text) return null
  return (
    <details className="momo-read">
      <summary>モモが読んだ文字</summary>
      <pre>{attach.text}</pre>
    </details>
  )
}
