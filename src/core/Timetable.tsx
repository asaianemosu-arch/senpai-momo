import type { Bundle, PaperBody, ShelfItem } from './types'

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

// Where a bundle with only words ("帰る前") goes: spread by the part of the
// day it is in, the first part at the start of the day, the last at its end.
function keyOf(section: ShelfItem, bundle: Bundle, order: string[]): number {
  if (bundle.minutes !== undefined && bundle.minutes >= 0) return bundle.minutes
  const at = Math.max(0, order.indexOf(section.id))
  return order.length < 2 ? 0 : Math.round((at / (order.length - 1)) * 24 * 60) - 1
}

// The day's timetable: not a place to file work, a map of the day built
// from the times the chef mentioned in the other parts.
export function Timetable({ item, shelf, manual, onPick, onClose }: Props) {
  const parts = shelf.filter((s) => !s.timetable)
  const order = parts.map((s) => s.id)
  const timed: Entry[] = []
  const untimed: Entry[] = []
  for (const section of parts) {
    for (const bundle of manual[section.id]?.bundles ?? []) {
      if (bundle.time) timed.push({ section, bundle, key: keyOf(section, bundle, order) })
      else untimed.push({ section, bundle, key: 0 })
    }
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
        <b>{e.bundle.title}</b>
        {e.bundle.summary && <small>{e.bundle.summary}</small>}
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
