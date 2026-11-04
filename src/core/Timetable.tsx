import { useState, type ReactNode } from 'react'
import { WEEKDAYS, type Bundle, type PaperBody, type ShelfItem, type Weekday } from './types'

interface Props {
  item: ShelfItem
  shelf: ShelfItem[]
  manual: Record<string, PaperBody>
  onPick: (section: string, bundle: string) => void
  onClose?: () => void
}

interface Entry {
  section: ShelfItem
  bundle: Bundle
  key: number
}

const PASTELS = ['peach', 'sky', 'lemon', 'mint', 'lilac']

// Words that tell roughly when ("夕方", "お昼前"): about this many minutes
// from midnight. "前"/"まで" is a little earlier, "あと"/"すぎ" a little later.
const ROUGHLY: [string, number][] = [
  ['ランチ', 720],
  ['昼', 720],
  ['午後', 840],
  ['夕方', 990],
  ['夜', 1140],
]

function roughly(time: string): number | undefined {
  const t = time.normalize('NFKC')
  const hit = ROUGHLY.find(([w]) => t.includes(w))
  if (!hit) return undefined
  if (/前|まで/.test(t)) return hit[1] - 30
  if (/あと|後|すぎ|過ぎ/.test(t)) return hit[1] + 60
  return hit[1]
}

// When a bundle happens, in minutes from midnight, if its time tells:
// a clock time, or words that tell roughly ("夕方").
function clock(bundle: Bundle): number | undefined {
  if (bundle.minutes !== undefined && bundle.minutes >= 0) return bundle.minutes
  return bundle.time ? roughly(bundle.time) : undefined
}

// Where a bundle goes in the day. Words that tell no time ("レジ締めのあと",
// "開店前") keep their place on the page: just after the timed bundle above
// them, or else just before the one below. A part with no times at all goes
// first if it is the first part of the day ("来たらすぐ"), otherwise after
// every time ("帰る前"), in the order of the parts.
function keyOf(section: ShelfItem, bundles: Bundle[], i: number, order: string[]): number {
  const own = clock(bundles[i])
  if (own !== undefined) return own
  for (let j = i - 1; j >= 0; j--) {
    const m = clock(bundles[j])
    if (m !== undefined) return m + (i - j) / 100
  }
  for (let j = i + 1; j < bundles.length; j++) {
    const m = clock(bundles[j])
    if (m !== undefined) return m - (j - i) / 100
  }
  const at = Math.max(0, order.indexOf(section.id))
  return at === 0 ? -1 : 24 * 60 + at
}

// The day's timetable: not a place to file work, a map of the day built
// from the times the chef mentioned in the other parts.
// Today in the shop's week (月 first).
export function today(): Weekday {
  return WEEKDAYS[(new Date().getDay() + 6) % 7]
}

export function Timetable({ item, shelf, manual, onPick, onClose }: Props) {
  const [day, setDay] = useState<Weekday>(today)
  const parts = shelf.filter((s) => !s.timetable && !s.untimed)
  const order = parts.map((s) => s.id)
  const timed: Entry[] = []
  const untimed: Entry[] = []
  const routineDays = new Set<Weekday>()
  for (const section of parts) {
    const bundles = manual[section.id]?.bundles ?? []
    bundles.forEach((bundle, i) => {
      bundle.days?.forEach((d) => routineDays.add(d))
      // A weekday routine shows only on its days; everything else, every day.
      if (bundle.days?.length && !bundle.days.includes(day)) return
      if (bundle.time) timed.push({ section, bundle, key: keyOf(section, bundles, i, order) })
      else untimed.push({ section, bundle, key: 0 })
    })
  }
  timed.sort((a, b) => a.key - b.key)

  // Bundles at the same time share one slot.
  const slots: { time: string; entries: Entry[] }[] = []
  for (const e of timed) {
    const last = slots[slots.length - 1]
    if (last && last.time === e.bundle.time) last.entries.push(e)
    else slots.push({ time: e.bundle.time!, entries: [e] })
  }

  const job = (e: Entry, i: number) => (
    <button
      key={`${e.section.id}-${e.bundle.title}`}
      type="button"
      className="job"
      onClick={() => onPick(e.section.id, e.bundle.title)}
    >
      <span className={`illust ${PASTELS[i % PASTELS.length]}`}>{e.bundle.icon}</span>
      <span className="grow">
        <span className="where">
          {e.section.icon} {e.section.title}
        </span>
        <b>
          {e.bundle.title}
          {!!e.bundle.days?.length && <span className="week">{e.bundle.days.join('・')}</span>}
        </b>
        {e.bundle.summary && <small>{e.bundle.summary}</small>}
        {!!e.bundle.facts?.length && <Facts facts={e.bundle.facts} />}
      </span>
    </button>
  )

  let n = 0
  return (
    <section className={onClose ? 'page sheet-page' : 'page'}>
      <div className="paper">
        <div className="paper-head">
          <h2>
            {item.icon} {item.title}
          </h2>
          {onClose && (
            <button type="button" className="close" aria-label="閉じる" onClick={onClose}>
              ✕
            </button>
          )}
        </div>

        <div className="days" role="tablist">
          {WEEKDAYS.map((d) => (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={d === day}
              className={['day', d === day && 'on', d === today() && 'today'].filter(Boolean).join(' ')}
              onClick={() => setDay(d)}
            >
              {d}
              {routineDays.has(d) && <span className="has" />}
            </button>
          ))}
        </div>

        {slots.length === 0 ? (
          <p className="blank">シェフのお話に時刻が出てくると、ここに時間の順に並びます。</p>
        ) : (
          <div className="tt">
            {slots.map((slot) => (
              <div key={slot.time} className="slot">
                <div className="time">{slot.time}</div>
                <div className="rail">
                  <span className="dot" />
                </div>
                <div className="jobs">{slot.entries.map((e) => job(e, n++))}</div>
              </div>
            ))}
          </div>
        )}

        {untimed.length > 0 && (
          <details className="hist later">
            <summary>時刻がまだ分からない仕事（{untimed.length}）</summary>
            <div className="jobs">{untimed.map((e) => job(e, n++))}</div>
          </details>
        )}
      </div>
    </section>
  )
}

export function Facts({ facts }: { facts: { label: string; text: string }[] }) {
  return (
    <span className="facts">
      {facts.map((f, i) => (
        <span key={i}>
          {f.label}：{f.text}
        </span>
      ))}
    </span>
  )
}

// A note in brackets at the end of an amount ("6g（5.5gで再検証が要る）")
// goes under it, small. Short ones like "（1袋）" stay with the amount.
function splitNote(text: string): [string, string] {
  const m = text.match(/^(.*\S)\s*[（(]([^（）()]{5,})[）)]$/)
  return m ? [m[1], m[2]] : [text, '']
}

// One fact a line under a heading (a recipe's 配合: material, then amount).
export function Recipe({
  facts,
  title,
  pen,
}: {
  facts: { label: string; text: string }[]
  title: string
  pen?: ReactNode
}) {
  return (
    <div className="recipe-list">
      <div className="recipe-head">
        <span>{title}</span>
        {pen}
      </div>
      {facts.map((f, i) => {
        const [amount, note] = splitNote(f.text)
        return (
          <div key={i} className="ing">
            <b>{f.label}</b>
            <span>
              {amount}
              {note && <small>{note}</small>}
            </span>
          </div>
        )
      })}
    </div>
  )
}
