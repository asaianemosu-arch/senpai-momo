import type { Bundle, PaperBody, ShelfItem } from './types'
import { today } from './Timetable'
import { roundLabel } from './Hygiene'
import momoUrl from '../../assets/momo/01.png'

interface Props {
  item: ShelfItem & { checklist: NonNullable<ShelfItem['checklist']> }
  paper: PaperBody | undefined
  // Titles of the bundles ticked today.
  done: string[]
  onToggle: (title: string) => void
  // Whether today's hygiene round of that time is all answered.
  recordDone: boolean
  onRecord: () => void
  onLook: (title: string) => void
}

const RECORD = '🌡️'

const clocked = (b: Bundle) => b.minutes !== undefined && b.minutes >= 0

// ☑️ Today's work in this part, ticked off one by one. It is built from the
// paper itself, so what the shop told Momo is what is on the list. Ticks last
// for the day only; there is no looking back here.
export function Checklist({ item, paper, done, onToggle, recordDone, onRecord, onLook }: Props) {
  const day = today()
  const bundles = (paper?.bundles ?? []).filter((b) => !b.days?.length || b.days.includes(day))

  // The hygiene round goes where it happens: in the morning after the first
  // clock times (出勤), at closing just before the last ones (退店).
  const record = item.checklist.record
  let at = 0
  if (record === 'close') {
    at = bundles.length
    while (at > 0 && clocked(bundles[at - 1])) at--
    if (at === 0) at = bundles.length
  } else {
    while (at < bundles.length && clocked(bundles[at])) at++
  }
  const rows: (Bundle | typeof RECORD)[] = [...bundles.slice(0, at), RECORD, ...bundles.slice(at)]

  const ticked = bundles.filter((b) => done.includes(b.title)).length + Number(recordDone)
  const all = rows.length

  return (
    <div className="checklist">
      <div className="ck-count">
        <span>
          {ticked} / {all}
        </span>
        <div className="ck-meter">
          <i style={{ width: `${(ticked / all) * 100}%` }} />
        </div>
      </div>

      {rows.map((r) =>
        r === RECORD ? (
          <div key="record" className={recordDone ? 'ck-row rec done' : 'ck-row rec'}>
            <span className="ck-box" aria-hidden="true">
              {recordDone ? '✓' : ''}
            </span>
            <span className="grow">
              <b>{RECORD} 衛生の記録（{roundLabel(record)}）</b>
              <small>{recordDone ? '記録しました' : '記録すると、ここにも ✓ がつきます'}</small>
            </span>
            <button type="button" className="ck-look" onClick={onRecord}>
              記録へ ›
            </button>
          </div>
        ) : (
          <div key={r.title} className={done.includes(r.title) ? 'ck-row done' : 'ck-row'}>
            <button
              type="button"
              className="ck-box"
              role="checkbox"
              aria-checked={done.includes(r.title)}
              aria-label={r.title}
              onClick={() => onToggle(r.title)}
            >
              {done.includes(r.title) ? '✓' : ''}
            </button>
            <span className="grow" onClick={() => onToggle(r.title)}>
              <b>
                {r.icon} {r.title}
              </b>
              {r.summary && <small>{r.summary}</small>}
            </span>
            {r.time && <span className="time-chip">{r.time}</span>}
            <button type="button" className="ck-look" onClick={() => onLook(r.title)}>
              見る ›
            </button>
          </div>
        ),
      )}

      {all > 1 && ticked === all && (
        <div className="ck-momo">
          <img src={momoUrl} alt="" />
          <div className="bubble">{item.checklist.done}</div>
        </div>
      )}
      <p className="ck-reset">チェックは、次の日には空に戻ります</p>
    </div>
  )
}
