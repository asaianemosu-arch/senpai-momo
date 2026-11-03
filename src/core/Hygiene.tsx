import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { HygieneAnswer, HygieneDay, HygieneForm, HygieneItem, HygienePlan, HygieneTime } from './types'
import { useListen } from './useListen'
import momoUrl from '../../assets/momo/01.png'

// 🌡️ The daily hygiene record. Staff answer Momo one question at a time:
// big number keys for temperatures, two big buttons for はい／いいえ.
// The record sheet is what comes out of it, not something people fill in.

const TIMES: { time: HygieneTime; label: string }[] = [
  { time: 'morning', label: '朝' },
  { time: 'lunch', label: 'ランチのあと' },
  { time: 'close', label: '帰る前' },
]

export const EMPTY_DAY: HygieneDay = { answers: {}, hourly: {} }

export function dayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function clock(d = new Date()): string {
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

// Which round of questions fits the hour.
function timeNow(): HygieneTime {
  const h = new Date().getHours()
  return h < 11 ? 'morning' : h < 15 ? 'lunch' : 'close'
}

const items = (form: HygieneForm) => form.groups.flatMap((g) => g.items)
const keyOf = (item: HygieneItem, time: HygieneTime) => `${item.id}@${time}`

// Whether every question of that round has an answer today.
export function roundDone(form: HygieneForm, day: HygieneDay, time: HygieneTime): boolean {
  return items(form)
    .filter((i) => i.when.includes(time))
    .every((i) => day.answers[keyOf(i, time)])
}

export const roundLabel = (time: HygieneTime) => TIMES.find((t) => t.time === time)!.label

function tempsLine(a: HygieneAnswer | undefined, item: HygieneItem): string {
  if (!a?.temps || !item.temps) return ''
  return item.temps
    .filter((t) => a.temps![t.id] !== undefined)
    .map((t) => `${t.label} ${String(a.temps![t.id]).replace('-', '−')}℃`)
    .join('／')
}

interface RecorderProps {
  form: HygieneForm
  day: HygieneDay
  onChange: (day: HygieneDay) => void
  onShowSheet?: () => void
  // The round to open on (from a checklist); otherwise the one the hour fits.
  start?: HygieneTime
}

export function HygieneRecorder({ form, day, onChange, onShowSheet, start }: RecorderProps) {
  const [time, setTime] = useState<HygieneTime>(() => start ?? timeNow())
  const [digits, setDigits] = useState('')
  const [temps, setTemps] = useState<Record<string, number>>({})
  // The answer waiting for "どうしましたか？" before it is kept.
  const [asking, setAsking] = useState<{ key: string; answer: HygieneAnswer } | null>(null)
  const [memo, setMemo] = useState('')
  const [name, setName] = useState('')
  const logRef = useRef<HTMLDivElement>(null)
  const ear = useListen({
    onWords: setMemo,
    onEnd: () => undefined,
    onTrouble: () => undefined,
  })

  // Temperatures first: that is what the morning starts with.
  const asked = items(form)
    .filter((i) => i.when.includes(time))
    .sort((a, b) => Number(!!b.temps) - Number(!!a.temps))
  const next = asked.find((i) => !day.answers[keyOf(i, time)])
  const done = asked.filter((i) => day.answers[keyOf(i, time)]).length
  const label = TIMES.find((t) => t.time === time)!.label
  const toilet = form.groups.flatMap((g) => g.items).find((i) => i.hourly)

  function keep(key: string, answer: HygieneAnswer) {
    onChange({ ...day, answers: { ...day.answers, [key]: answer } })
  }

  function answer(item: HygieneItem, ok: boolean | null, values?: Record<string, number>) {
    const a: HygieneAnswer = { ok, at: clock(), ...(values && { temps: values }) }
    if (ok === false) setAsking({ key: keyOf(item, time), answer: a })
    else keep(keyOf(item, time), a)
    setDigits('')
    setTemps({})
  }

  function enterTemp(item: HygieneItem) {
    const n = Number(digits)
    if (!digits || Number.isNaN(n)) return
    const t = item.temps!.find((x) => temps[x.id] === undefined)!
    const values = { ...temps, [t.id]: n }
    setDigits('')
    if (item.temps!.every((x) => values[x.id] !== undefined)) {
      answer(item, item.temps!.every((x) => values[x.id] <= x.max), values)
    } else {
      setTemps(values)
    }
  }

  function saveMemo() {
    if (!asking || !memo.trim()) return
    keep(asking.key, { ...asking.answer, memo: memo.trim() })
    setAsking(null)
    setMemo('')
  }

  function tapToilet() {
    if (!toilet) return
    const list = day.hourly[toilet.id] ?? []
    onChange({ ...day, hourly: { ...day.hourly, [toilet.id]: [...list, clock()] } })
  }

  // The conversation so far in this round, rebuilt from the answers.
  const log: ReactNode[] = []
  for (const item of asked) {
    const a = day.answers[keyOf(item, time)]
    if (!a) continue
    log.push(<Momo key={`${item.id}q`}>{item.text}</Momo>)
    log.push(
      <Me key={`${item.id}a`}>
        {tempsLine(a, item) || (a.ok === null ? '当てはまらない' : a.ok ? '◯ はい' : '× いいえ')}
      </Me>,
    )
    if (a.memo) {
      log.push(<Me key={`${item.id}m`}>{a.memo}</Me>)
      log.push(<Momo key={`${item.id}r`}>特記事項に書いておきますね。</Momo>)
    }
  }

  const warn = asking && next?.temps
    ? next.temps.filter((t) => (asking.answer.temps?.[t.id] ?? -Infinity) > t.max).map((t) => `${t.label}は${t.max}℃以下です`)
    : []

  let input: ReactNode
  if (asking && next) {
    input = (
      <div className="hy-memo">
        {warn.map((w) => (
          <div key={w} className="hy-warn">
            ⚠️ {w}
          </div>
        ))}
        <textarea rows={2} value={memo} placeholder="どうしたかを話すか、書いてください" onChange={(e) => setMemo(e.target.value)} />
        <div className="hy-memo-row">
          <button
            type="button"
            className={ear.listening ? 'hy-mic on' : 'hy-mic'}
            onClick={() => (ear.listening ? ear.stopAndSend() : ear.start(memo))}
          >
            🎤 {ear.listening ? '止める' : '話す'}
          </button>
          <button type="button" className="hy-go" disabled={!memo.trim()} onClick={saveMemo}>
            書いてもらう
          </button>
        </div>
      </div>
    )
  } else if (next?.temps) {
    const t = next.temps.find((x) => temps[x.id] === undefined)!
    input = (
      <div>
        <div className="hy-what">
          {t.label}（{t.max}℃以下）
        </div>
        <div className="hy-display">
          {digits || ' '}
          <span> ℃</span>
        </div>
        <div className="hy-keys">
          {['7', '8', '9', '4', '5', '6', '1', '2', '3', '−', '0', '.'].map((k) => (
            <button
              key={k}
              type="button"
              onClick={() =>
                setDigits((d) => (k === '−' ? (d.startsWith('-') ? d.slice(1) : `-${d}`) : k === '.' && d.includes('.') ? d : d + k))
              }
            >
              {k}
            </button>
          ))}
        </div>
        <div className="hy-memo-row">
          <button type="button" className="hy-back" onClick={() => setDigits((d) => d.slice(0, -1))}>
            ⌫ 消す
          </button>
          <button type="button" className="hy-go" disabled={!digits || digits === '-'} onClick={() => enterTemp(next)}>
            入れる
          </button>
        </div>
      </div>
    )
  } else if (next) {
    input = (
      <div>
        <div className="hy-yn">
          <button type="button" className="y" onClick={() => answer(next, true)}>
            ◯ はい
          </button>
          <button type="button" className="n" onClick={() => answer(next, false)}>
            × いいえ
          </button>
        </div>
        <button type="button" className="hy-skip" onClick={() => answer(next, null)}>
          うちでは当てはまらない
        </button>
      </div>
    )
  } else if (!day.recorder) {
    input = (
      <div className="hy-memo">
        <input value={name} placeholder="お名前" onChange={(e) => setName(e.target.value)} />
        <button
          type="button"
          className="hy-go"
          disabled={!name.trim()}
          onClick={() => onChange({ ...day, recorder: name.trim() })}
        >
          記録者にする
        </button>
      </div>
    )
  }

  // What Momo says now.
  let now: ReactNode = null
  if (asking && next) {
    const high = next.temps?.filter((t) => (asking.answer.temps?.[t.id] ?? -Infinity) > t.max) ?? []
    now = high.length
      ? `${high.map((t) => `${t.label} ${asking.answer.temps![t.id]}℃`).join('、')}、ちょっと高いですね。どうしましたか？`
      : 'どうしましたか？'
  }
  else if (next?.temps) {
    const t = next.temps.find((x) => temps[x.id] === undefined)!
    now = done === 0 && t === next.temps[0] ? `おはようございます！ ${label}の記録をしましょう。\n${t.label}は何度でしたか？` : `${t.label}は何度でしたか？`
  } else if (next) now = done === 0 ? `${label}の記録をしましょう (๑˃̵ᴗ˂̵)\n${next.text}` : next.text
  else if (!day.recorder) now = `${label}の記録はおしまいです。ありがとうございます！\n記録したのはどなたですか？`
  else now = `${label}の記録はおしまいです。おつかれさまでした (๑˃̵ᴗ˂̵)`

  const hours = toilet ? day.hourly[toilet.id] ?? [] : []

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [day, time, asking, temps])

  return (
    <section className="chat hygiene">
      <header className="hy-head">
        <span>🌡️ 衛生の記録</span>
        <span className="hy-dots" aria-label={`${done} / ${asked.length}`}>
          {asked.map((i) => (
            <i key={i.id} className={day.answers[keyOf(i, time)] ? 'done' : ''} />
          ))}
        </span>
      </header>
      <div className="hy-times" role="tablist">
        {TIMES.map((t) => (
          <button
            key={t.time}
            type="button"
            role="tab"
            aria-selected={t.time === time}
            className={t.time === time ? 'on' : ''}
            onClick={() => {
              setTime(t.time)
              setAsking(null)
              setDigits('')
              setTemps({})
            }}
          >
            {t.label}
          </button>
        ))}
        {/* On a phone the header is hidden and the sheet opens from here. */}
        {onShowSheet && (
          <button type="button" className="hy-sheet-btn" onClick={onShowSheet}>
            📄 記録表
          </button>
        )}
      </div>
      {toilet && (
        <button type="button" className="hy-toilet" onClick={tapToilet}>
          🚻 トイレ掃除した{hours.length > 0 && <small>（さいご {hours[hours.length - 1]}）</small>}
        </button>
      )}
      <div className="log hy-log" ref={logRef}>
        {log}
        {Object.keys(temps).length > 0 && next?.temps && (
          <Me>{tempsLine({ ok: null, at: '', temps }, next)}</Me>
        )}
        {now && <Momo>{now}</Momo>}
      </div>
      {input && <div className="hy-input">{input}</div>}
    </section>
  )
}

function Momo({ children }: { children: ReactNode }) {
  return (
    <div className="msg">
      <div className="who">
        <img src={momoUrl} alt="" />
      </div>
      <div className="bubble">{children}</div>
    </div>
  )
}

function Me({ children }: { children: ReactNode }) {
  return (
    <div className="msg me">
      <div className="bubble">{children}</div>
    </div>
  )
}

interface SheetProps {
  form: HygieneForm
  date: string
  day: HygieneDay
  // The chef or 店長 signs as the one responsible.
  onCheck?: () => void
  onClose?: () => void
}

// The record as the guide's form: ◯／× and 特記事項, row by row.
export function HygieneSheet({ form, date, day, onCheck, onClose }: SheetProps) {
  const [y, m, d] = date.split('-').map(Number)
  const [showPlan, setShowPlan] = useState(false)
  let lastTitle = ''
  const top = (
    <div className="hy-sheet-top">
      <div className="hy-switch" role="tablist">
        <button type="button" role="tab" aria-selected={!showPlan} className={showPlan ? '' : 'on'} onClick={() => setShowPlan(false)}>
          記録表
        </button>
        <button type="button" role="tab" aria-selected={showPlan} className={showPlan ? 'on' : ''} onClick={() => setShowPlan(true)}>
          衛生管理計画
        </button>
      </div>
      {onClose && (
        <button type="button" className="close" aria-label="閉じる" onClick={onClose}>
          ✕
        </button>
      )}
    </div>
  )
  if (showPlan) {
    return (
      <div className="hy-sheet">
        {top}
        <PlanSheet plan={form.plan} />
      </div>
    )
  }
  return (
    <div className="hy-sheet">
      {top}
      <h3 className="hy-title">{form.title}</h3>
      <div className="hy-date">
        {y}年 {m}月 {d}日
      </div>
      <table>
        <tbody>
          {form.groups.map((g) => {
            const rows: ReactNode[] = []
            if (g.title !== lastTitle) {
              rows.push(
                <tr key={`${g.title}-h`}>
                  <th colSpan={2}>{g.title}</th>
                  <th className="memo-h">{lastTitle ? '' : '特記事項'}</th>
                </tr>,
              )
              lastTitle = g.title
            }
            if (g.part) {
              rows.push(
                <tr key={`${g.part}-p`}>
                  <td colSpan={3} className="part">
                    {g.part}
                  </td>
                </tr>,
              )
            }
            for (const item of g.items) rows.push(<Row key={item.id} item={item} day={day} />)
            return rows
          })}
        </tbody>
      </table>
      <div className="hy-sign">
        <span>記録者 {day.recorder ?? ''}</span>
        <span>
          責任者 {day.checkedBy ?? ''}
          {onCheck && !day.checkedBy && (
            <button type="button" className="hy-check" onClick={onCheck}>
              ✓ 確かめた
            </button>
          )}
        </span>
      </div>
      <p className="hy-src">{form.source}</p>
    </div>
  )
}

function Row({ item, day }: { item: HygieneItem; day: HygieneDay }) {
  if (item.when.length === 0) {
    return (
      <tr>
        <td>{item.text}</td>
        <td className="mark na">—</td>
        <td className="memo">{item.elsewhere}</td>
      </tr>
    )
  }
  const answers = item.when.map((t) => ({ t, a: day.answers[keyOf(item, t)] }))
  const all = answers.every((x) => x.a)
  const mark = answers.some((x) => x.a?.ok === false)
    ? '×'
    : !all
      ? '…'
      : answers.every((x) => x.a!.ok === null)
        ? '—'
        : '◯'
  const sub: string[] = []
  for (const { t, a } of answers) {
    const line = tempsLine(a, item)
    if (line) sub.push(line)
    else if (item.when.length > 1) {
      const when = TIMES.find((x) => x.time === t)!.label
      sub.push(`${when} ${a ? (a.ok === false ? '×' : a.ok === null ? '—' : '◯') + `（${a.at}）` : '…'}`)
    }
  }
  const hours = item.hourly ? day.hourly[item.id] ?? [] : []
  if (hours.length) sub.push(hours.join('・'))
  const memos = answers.map((x) => x.a?.memo).filter(Boolean)
  if (all && answers.every((x) => x.a!.ok === null)) memos.push('当てはまらない')
  return (
    <tr className={all ? '' : 'wait'}>
      <td>
        {item.text}
        {sub.length > 0 && <span className="sub">{sub.join('／')}</span>}
      </td>
      <td className={`mark ${mark === '◯' ? 'ok' : mark === '×' ? 'ng' : 'na'}`}>{mark}</td>
      <td className="memo">{memos.join('　')}</td>
    </tr>
  )
}

// The 衛生管理計画: the guide's worked example, with this shop's changes starred.
function PlanSheet({ plan }: { plan: HygienePlan }) {
  return (
    <>
      <h3 className="hy-title">{plan.title}</h3>
      <table className="hy-plan">
        <colgroup>
          <col style={{ width: '22%' }} />
          <col style={{ width: '9%' }} />
          <col style={{ width: '17%' }} />
          <col style={{ width: '28%' }} />
          <col style={{ width: '24%' }} />
        </colgroup>
        <tbody>
          <tr>
            <th>チェックポイント</th>
            <th>頻度</th>
            <th>いつ</th>
            <th>実施事項</th>
            <th>問題があった場合</th>
          </tr>
          {plan.sections.map((sec) => [
            <tr key={sec.title}>
              <td colSpan={5} className="part">
                {sec.title}
              </td>
            </tr>,
            ...sec.rows.flatMap((r) =>
              r.pairs.map(([act, fix], i) => (
                <tr key={`${r.point}-${i}`}>
                  {i === 0 && (
                    <>
                      <td rowSpan={r.pairs.length}>
                        {r.point}
                        {r.ours?.note && <span className="ours">★ {r.ours.note}</span>}
                      </td>
                      <td rowSpan={r.pairs.length} className={r.ours?.freq ? 'ours-cell' : ''}>
                        {r.ours?.freq ? `★ ${r.ours.freq}` : r.freq}
                      </td>
                      <td rowSpan={r.pairs.length} className={r.ours?.when ? 'ours-cell' : ''}>
                        {r.ours?.when ? `★ ${r.ours.when}` : r.when}
                      </td>
                    </>
                  )}
                  <td>{act}</td>
                  <td>{fix}</td>
                </tr>
              )),
            ),
          ])}
        </tbody>
      </table>
      <p className="hy-src">{plan.source}</p>
    </>
  )
}
