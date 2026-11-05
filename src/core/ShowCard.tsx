import { useEffect, useState, type MouseEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { Bundle, Focus, Photo, Step } from './types'
import { isVideo, usePhoto } from './photos'

// Soft colours for the round icons, taken in turn.
const PASTELS = ['peach', 'sky', 'mint', 'lemon', 'lilac']

export function StepIcon({ step, bundle, index }: { step: Step; bundle: Bundle; index: number }) {
  if (isVideo(step.photo)) return <StepVideo id={step.photo!} className="illust photo" caption={step.text} />
  return <StepPicture step={step} bundle={bundle} index={index} />
}

function StepPicture({ step, bundle, index }: { step: Step; bundle: Bundle; index: number }) {
  const url = usePhoto(step.photo)
  if (url) return <img className="illust photo" src={url} alt={step.text} />
  return <span className={`illust ${PASTELS[index % PASTELS.length]}`}>{step.icon || bundle.icon}</span>
}

// The chef's photo of a whole bundle, on top of it.
export function BundlePhoto({
  photo,
  caption,
  children,
}: {
  photo?: Photo
  // In place of the caption line, e.g. to edit it.
  caption?: ReactNode
  children?: ReactNode
}) {
  const url = usePhoto(photo?.id)
  if (!photo || !url) return null
  return (
    <figure className="bundle-photo">
      <img src={url} alt={photo.caption} />
      {caption ?? (photo.caption && <figcaption>{photo.caption}</figcaption>)}
      {children}
    </figure>
  )
}

// A step's photo, small, beside the step on the chef's paper.
export function StepPhoto({ id, caption, children }: { id?: string; caption?: string; children?: ReactNode }) {
  if (id && isVideo(id)) return <StepVideo id={id} caption={caption} className="step-photo">{children}</StepVideo>
  return <StepImage id={id}>{children}</StepImage>
}

function StepImage({ id, children }: { id?: string; children?: ReactNode }) {
  const url = usePhoto(id)
  if (!url) return null
  return (
    <span className="step-photo">
      <img src={url} alt="" />
      {children}
    </span>
  )
}

const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`

// A step's short video: small, silent and going round, beside the step.
// Pressed, it opens big from the start, with the step's words under it.
export function StepVideo({ id, caption, className, children }: { id: string; caption?: string; className?: string; children?: ReactNode }) {
  const url = usePhoto(id)
  const [length, setLength] = useState(0)
  const [bad, setBad] = useState(false)
  const [big, setBig] = useState(false)
  if (!url) return null
  const open = (e: MouseEvent<HTMLSpanElement>) => {
    // Not the ✕ beside it, and not clicks inside the big player (it is elsewhere on the page).
    const t = e.target as HTMLElement
    if (!e.currentTarget.contains(t) || t.closest('.photo-x')) return
    setBig(true)
  }
  return (
    <span className={`step-video ${className ?? ''}`} role="button" tabIndex={0} aria-label="動画を大きく見る" onClick={open}>
      {bad ? (
        <span className="v-bad">🎬</span>
      ) : (
        <video
          src={url}
          muted
          loop
          autoPlay
          playsInline
          preload="metadata"
          onLoadedMetadata={(e) => setLength(e.currentTarget.duration)}
          onError={() => setBad(true)}
        />
      )}
      <span className="v-play">▶</span>
      {length > 0 && <span className="v-len">{clock(length)}</span>}
      {children}
      {big && createPortal(<Player url={url} caption={caption} onClose={() => setBig(false)} />, document.body)}
    </span>
  )
}

function Player({ url, caption, onClose }: { url: string; caption?: string; onClose: () => void }) {
  const [bad, setBad] = useState(false)
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [onClose])
  return (
    <div className="player-dim" onClick={onClose}>
      <div className="player" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="close" aria-label="閉じる" onClick={onClose}>
          ✕
        </button>
        {bad ? (
          <p className="player-bad">この端末では、この動画を再生できません。</p>
        ) : (
          <video src={url} controls autoPlay loop muted playsInline onError={() => setBad(true)} />
        )}
        {caption && <p className="player-cap">{caption}</p>}
      </div>
    </div>
  )
}

export function Num({ n }: { n: number }) {
  return <span className="num">{n}</span>
}

interface Props {
  focus: Focus
  where: string
  bundle: Bundle
}

// "ここですよ": the few steps Momo points to, made big, under her reply.
export function ShowCard({ focus, where, bundle }: Props) {
  return (
    <div className="show">
      <div className="show-head">
        👀 ここですよ
        <span className="where">
          {where} › {bundle.title}
        </span>
      </div>
      {focus.steps.map((n) => {
        const step = bundle.steps[n - 1]
        return (
          <div key={n} className="bigstep">
            <Num n={n} />
            <StepIcon step={step} bundle={bundle} index={n - 1} />
            <span className="t">
              {step.remind && <span className="remind">忘れずに</span>}
              {step.text}
              {step.why && <span className="why">{step.why}</span>}
            </span>
          </div>
        )
      })}
    </div>
  )
}
