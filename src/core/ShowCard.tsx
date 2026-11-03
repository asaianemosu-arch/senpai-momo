import type { ReactNode } from 'react'
import type { Bundle, Focus, Photo, Step } from './types'
import { usePhoto } from './photos'

// Soft colours for the round icons, taken in turn.
const PASTELS = ['peach', 'sky', 'mint', 'lemon', 'lilac']

export function StepIcon({ step, bundle, index }: { step: Step; bundle: Bundle; index: number }) {
  const url = usePhoto(step.photo)
  if (url) return <img className="illust photo" src={url} alt={step.text} />
  return <span className={`illust ${PASTELS[index % PASTELS.length]}`}>{step.icon || bundle.icon}</span>
}

// The chef's photo of a whole bundle, on top of it.
export function BundlePhoto({ photo, children }: { photo?: Photo; children?: ReactNode }) {
  const url = usePhoto(photo?.id)
  if (!photo || !url) return null
  return (
    <figure className="bundle-photo">
      <img src={url} alt={photo.caption} />
      {photo.caption && <figcaption>{photo.caption}</figcaption>}
      {children}
    </figure>
  )
}

// A step's photo, small, beside the step on the chef's paper.
export function StepPhoto({ id, children }: { id?: string; children?: ReactNode }) {
  const url = usePhoto(id)
  if (!url) return null
  return (
    <span className="step-photo">
      <img src={url} alt="" />
      {children}
    </span>
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
