import type { Bundle, Focus, Step } from './types'

// Soft colours for the round icons, taken in turn.
const PASTELS = ['peach', 'sky', 'mint', 'lemon', 'lilac']

export function StepIcon({ step, bundle, index }: { step: Step; bundle: Bundle; index: number }) {
  return <span className={`illust ${PASTELS[index % PASTELS.length]}`}>{step.icon || bundle.icon}</span>
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
