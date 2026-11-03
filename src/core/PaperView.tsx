import { useRef, useState } from 'react'
import { WEEKDAYS, type Bundle, type Paper, type PaperBody, type Role, type ShelfItem, type Weekday } from './types'
import { Facts, Recipe } from './Timetable'
import { BundlePhoto, StepPhoto } from './ShowCard'
import { trouble } from './Handover'
import { readFile } from './files'
import { keepPhoto } from './photos'

interface Props {
  role: Role
  item: ShelfItem
  paper: Paper | undefined
  onPublish: () => void
  onChange: (body: PaperBody, note: string) => void
  titleOf: (id: string) => string
  onOpen: (id: string) => void
  // On a phone the paper slides up over the conversation and can be closed.
  onClose?: () => void
}

// The chef fixes the paper one part at a time: the ✏️ beside a part opens
// it, and "✓ できた" puts the changes on the paper.
type Part = 'head' | 'caption' | 'facts' | 'steps' | 'tips'
type Open = { b: number; part: Part; work: Bundle } | { rules: string[] }

const WHAT: Record<Part, string> = {
  head: '名前・時刻',
  caption: '写真',
  facts: '札',
  steps: '手順',
  tips: 'ポイント',
}

// Minutes from midnight for sorting the timetable: "4:30", "4時半", "10時までに".
// Words alone ("帰る前") give -1 and keep their place by the part of the day.
function minutesOf(time: string): number {
  const t = time.normalize('NFKC')
  const m = t.match(/(\d{1,2})\s*[:時]\s*(半|\d{1,2})?/)
  if (!m) return -1
  const h = Number(m[1])
  const min = m[2] === '半' ? 30 : Number(m[2] ?? 0)
  return h < 24 && min < 60 ? h * 60 + min : -1
}

function toggleDay(days: Weekday[] | undefined, d: Weekday): Weekday[] {
  const next = days?.includes(d) ? days.filter((x) => x !== d) : [...(days ?? []), d]
  return WEEKDAYS.filter((x) => next.includes(x))
}

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list
  const next = [...list]
  const [x] = next.splice(from, 1)
  next.splice(to, 0, x)
  return next
}

function put<T>(list: T[], i: number, x: T): T[] {
  return list.map((y, j) => (j === i ? x : y))
}

// What the chef typed, without the lines left empty.
function tidy(b: Bundle): Bundle {
  const time = b.time?.trim()
  return {
    ...b,
    title: b.title.trim() || b.title,
    time: time || undefined,
    minutes: time ? minutesOf(time) : undefined,
    note: b.note.trim(),
    photo: b.photo && { ...b.photo, caption: b.photo.caption.trim() },
    facts: b.facts?.map((f) => ({ label: f.label.trim(), text: f.text.trim() })).filter((f) => f.label || f.text),
    steps: b.steps.map((s) => ({ ...s, text: s.text.trim(), why: s.why.trim() })).filter((s) => s.text),
    tips: b.tips.map((t) => ({ label: t.label.trim(), text: t.text.trim() })).filter((t) => t.label || t.text),
  }
}

export function PaperView(props: Props) {
  const { role, item, paper, titleOf, onOpen } = props
  const [open, setOpen] = useState<Open | null>(null)
  const [photoNote, setPhotoNote] = useState('')
  // Which step a chosen photo goes to (undefined: the bundle itself).
  const photoFor = useRef<number | undefined>(undefined)
  const picker = useRef<HTMLInputElement>(null)
  const canEdit = role === 'chef'
  const empty = !paper || (paper.rules.length === 0 && paper.bundles.length === 0)
  const body: PaperBody = { rules: paper?.rules ?? [], bundles: paper?.bundles ?? [] }

  function finish() {
    if (!open) return
    if ('rules' in open) {
      const rules = open.rules.map((r) => r.trim()).filter(Boolean)
      props.onChange({ ...body, rules }, 'シェフが直しました（大切なこと）')
    } else {
      const bundles = body.bundles.map((x, i) => (i === open.b ? tidy(open.work) : x))
      const what = open.part === 'facts' && item.list ? item.list.title : WHAT[open.part]
      props.onChange({ ...body, bundles }, `シェフが直しました（${open.work.title}の${what}）`)
    }
    setOpen(null)
  }

  // Opening another part first puts down what was being fixed.
  function start(next: Open) {
    finish()
    setPhotoNote('')
    setOpen(next)
  }

  const isOpen = (b: number, part: Part) => !!open && 'b' in open && open.b === b && open.part === part
  const work = open && 'work' in open ? open.work : null
  const setWork = (w: Bundle) => setOpen((o) => (o && 'work' in o ? { ...o, work: w } : o))

  const pen = (b: number, part: Part) => {
    if (!canEdit) return null
    const on = isOpen(b, part)
    return (
      <button
        type="button"
        className={on ? 'pen on' : 'pen'}
        aria-label={on ? 'できた' : '直す'}
        onClick={(e) => {
          e.preventDefault()
          if (on) finish()
          // Another part of the same bundle may be open: start from its changes.
          else start({ b, part, work: structuredClone(work && open && 'b' in open && open.b === b ? tidy(work) : body.bundles[b]) })
        }}
      >
        {on ? '✓ できた' : '✏️'}
      </button>
    )
  }

  function addPhoto(step?: number) {
    setPhotoNote('')
    photoFor.current = step
    picker.current?.click()
  }

  async function photoChosen(file: File) {
    const step = photoFor.current
    try {
      const h = await readFile(file)
      if (h.media?.type !== 'image') throw new Error()
      const id = await keepPhoto(h.media.data)
      setOpen((o) => {
        if (!o || !('work' in o)) return o
        const w = o.work
        return {
          ...o,
          work:
            step === undefined
              ? { ...w, photo: { id, caption: w.photo?.caption ?? '' } }
              : { ...w, steps: w.steps.map((s, i) => (i === step ? { ...s, photo: id } : s)) },
        }
      })
    } catch (e) {
      setPhotoNote(trouble(e))
    }
  }

  const publishButton = canEdit && !empty && (
    <button
      type="button"
      className="send-btn"
      onClick={() => {
        finish()
        props.onPublish()
      }}
    >
      📣 スタッフに配る
    </button>
  )

  const rulesEdit = open && 'rules' in open ? open.rules : null

  return (
    <section className={props.onClose ? 'page sheet-page' : 'page'}>
      <div className="paper">
        <div className="paper-head">
          <h2>
            {item.icon} {item.title}
          </h2>
          {props.onClose ? (
            <button type="button" className="close" aria-label="閉じる" onClick={props.onClose}>
              ✕
            </button>
          ) : (
            publishButton
          )}
        </div>

        {photoNote && <p className="hand-note">{photoNote}</p>}
        <input
          ref={picker}
          type="file"
          accept="image/*,.heic,.heif"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (f) photoChosen(f)
          }}
        />

        {empty ? (
          <p className="blank">
            {role === 'chef' ? 'まだ白い紙です。シェフのお話から、モモが書きます。' : 'まだ配られていません。'}
          </p>
        ) : (
          <>
            {rulesEdit ? (
              <div className="part editing">
                <div className="part-head">
                  <span>大切なこと</span>
                  <button type="button" className="pen on" onClick={finish}>
                    ✓ できた
                  </button>
                </div>
                {rulesEdit.map((r, i) => (
                  <div key={i} className="erow">
                    <textarea rows={2} value={r} onChange={(e) => setOpen({ rules: put(rulesEdit, i, e.target.value) })} />
                    <Mini
                      onUp={() => setOpen({ rules: move(rulesEdit, i, i - 1) })}
                      onDown={() => setOpen({ rules: move(rulesEdit, i, i + 1) })}
                      onDrop={() => setOpen({ rules: rulesEdit.filter((_, j) => j !== i) })}
                    />
                  </div>
                ))}
                <button type="button" className="add" onClick={() => setOpen({ rules: [...rulesEdit, ''] })}>
                  ＋ 大切なことを足す
                </button>
              </div>
            ) : (
              body.rules.map((r, i) => (
                <div key={i} className="rule">
                  <span className="grow">
                    <b>大切なこと</b>　{r}
                  </span>
                  {canEdit && i === 0 && (
                    <button type="button" className="pen" aria-label="直す" onClick={() => start({ rules: [...body.rules] })}>
                      ✏️
                    </button>
                  )}
                </div>
              ))
            )}

            {body.bundles.map((shown, bi) => {
              const b = work && open && 'b' in open && open.b === bi ? work : shown
              const facts = b.facts ?? []
              return (
                <details key={`${item.id}-${bi}`} className="bundle" open>
                  <summary>
                    <span className="ic">{b.icon}</span>
                    <span className="grow">{b.title}</span>
                    {b.time && <span className="time-chip">🕐 {b.time}</span>}
                    {!!b.days?.length && <span className="week">{b.days.join('・')}</span>}
                    {pen(bi, 'head')}
                    {b.steps.length > 0 && <span className="count">{b.steps.length}つ</span>}
                    <span className="chev">▸</span>
                  </summary>
                  <div className="body">
                    {isOpen(bi, 'head') && (
                      <div className="part editing">
                        <label className="field">
                          <span>名前</span>
                          <input value={b.title} onChange={(e) => setWork({ ...b, title: e.target.value })} />
                        </label>
                        <label className="field">
                          <span>時刻</span>
                          <input
                            value={b.time ?? ''}
                            placeholder="例：4:30、10時までに、帰る前"
                            onChange={(e) => setWork({ ...b, time: e.target.value })}
                          />
                        </label>
                        <div className="day-pick" aria-label="曜日（選ばなければ毎日）">
                          <span>曜日</span>
                          {WEEKDAYS.map((d) => (
                            <button
                              key={d}
                              type="button"
                              className={b.days?.includes(d) ? 'on' : ''}
                              onClick={() => setWork({ ...b, days: toggleDay(b.days, d) })}
                            >
                              {d}
                            </button>
                          ))}
                          <small>{b.days?.length ? '' : '毎日'}</small>
                        </div>
                        <label className="field">
                          <span>前置き</span>
                          <textarea rows={2} value={b.note} onChange={(e) => setWork({ ...b, note: e.target.value })} />
                        </label>
                        {!b.photo && (
                          <button type="button" className="add" onClick={() => addPhoto()}>
                            📷 束の写真を足す
                          </button>
                        )}
                      </div>
                    )}

                    <BundlePhoto
                      photo={b.photo}
                      caption={
                        isOpen(bi, 'caption') ? (
                          <div className="part editing">
                            <textarea
                              rows={2}
                              value={b.photo?.caption ?? ''}
                              placeholder="写っていること"
                              onChange={(e) => b.photo && setWork({ ...b, photo: { ...b.photo, caption: e.target.value } })}
                            />
                            <div className="erow-tools">
                              <button type="button" className="mini-btn" onClick={() => setWork({ ...b, photo: undefined })}>
                                写真を外す
                              </button>
                              {pen(bi, 'caption')}
                            </div>
                          </div>
                        ) : (
                          <figcaption className="with-pen">
                            <span className="grow">{b.photo?.caption}</span>
                            {pen(bi, 'caption')}
                          </figcaption>
                        )
                      }
                    />

                    {isOpen(bi, 'facts') ? (
                      <div className="recipe-list editing">
                        <div className="recipe-head">
                          <span>{item.list?.title ?? '札'}</span>
                          {pen(bi, 'facts')}
                        </div>
                        {facts.map((f, i) => (
                          <div key={i} className="erow">
                            <div className="fact-in">
                              <input
                                placeholder={item.list?.label ?? '見出し'}
                                value={f.label}
                                onChange={(e) => setWork({ ...b, facts: put(facts, i, { ...f, label: e.target.value }) })}
                              />
                              <textarea
                                rows={Math.min(4, Math.ceil(f.text.length / 11) || 1)}
                                placeholder={item.list?.text ?? '中身'}
                                value={f.text}
                                onChange={(e) => setWork({ ...b, facts: put(facts, i, { ...f, text: e.target.value }) })}
                              />
                            </div>
                            <Mini
                              onUp={() => setWork({ ...b, facts: move(facts, i, i - 1) })}
                              onDown={() => setWork({ ...b, facts: move(facts, i, i + 1) })}
                              onDrop={() => setWork({ ...b, facts: facts.filter((_, j) => j !== i) })}
                            />
                          </div>
                        ))}
                        <button
                          type="button"
                          className="add"
                          onClick={() => setWork({ ...b, facts: [...facts, { label: '', text: '' }] })}
                        >
                          {`＋ ${item.list?.label ?? '札'}を足す`}
                        </button>
                      </div>
                    ) : item.list ? (
                      (facts.length > 0 || canEdit) && <Recipe facts={facts} title={item.list.title} pen={pen(bi, 'facts')} />
                    ) : (
                      facts.length > 0 && (
                        <div className="with-pen">
                          <Facts facts={facts} />
                          {pen(bi, 'facts')}
                        </div>
                      )
                    )}

                    {b.note && !isOpen(bi, 'head') && <p className="from">{b.note}</p>}

                    {canEdit && (
                      <div className="part-head steps-head">
                        <span>手順</span>
                        {pen(bi, 'steps')}
                      </div>
                    )}
                    {isOpen(bi, 'steps') ? (
                      <div className="part editing">
                        {b.steps.map((s, si) => (
                          <div key={si} className="erow">
                            <div className="erow-top">
                              <span className="n">{si + 1}.</span>
                              <textarea
                                rows={2}
                                value={s.text}
                                onChange={(e) => setWork({ ...b, steps: put(b.steps, si, { ...s, text: e.target.value }) })}
                              />
                            </div>
                            <input
                              className="why-in"
                              placeholder="理由（あれば）"
                              value={s.why}
                              onChange={(e) => setWork({ ...b, steps: put(b.steps, si, { ...s, why: e.target.value }) })}
                            />
                            <div className="erow-tools">
                              <label className="remind-in">
                                <input
                                  type="checkbox"
                                  checked={!!s.remind}
                                  onChange={(e) => setWork({ ...b, steps: put(b.steps, si, { ...s, remind: e.target.checked }) })}
                                />
                                忘れずに
                              </label>
                              {s.photo ? (
                                <StepPhoto id={s.photo}>
                                  <button
                                    type="button"
                                    className="photo-x"
                                    aria-label="写真を外す"
                                    onClick={() => setWork({ ...b, steps: put(b.steps, si, { ...s, photo: undefined }) })}
                                  >
                                    ✕
                                  </button>
                                </StepPhoto>
                              ) : (
                                <button type="button" className="mini-btn" title="写真を足す" onClick={() => addPhoto(si)}>
                                  📷
                                </button>
                              )}
                              <Mini
                                onUp={() => setWork({ ...b, steps: move(b.steps, si, si - 1) })}
                                onDown={() => setWork({ ...b, steps: move(b.steps, si, si + 1) })}
                                onDrop={() => setWork({ ...b, steps: b.steps.filter((_, j) => j !== si) })}
                              />
                            </div>
                          </div>
                        ))}
                        <button
                          type="button"
                          className="add"
                          onClick={() => setWork({ ...b, steps: [...b.steps, { text: '', why: '', link: null }] })}
                        >
                          ＋ 手順を足す
                        </button>
                      </div>
                    ) : (
                      <ol className="steps">
                        {b.steps.map((s, si) => (
                          <li key={si}>
                            <StepPhoto id={s.photo} />
                            {s.remind && <span className="remind">忘れずに</span>}
                            {s.text}
                            {s.why && <span className="why">{s.why}</span>}
                            {s.link && (
                              <button type="button" className="link" onClick={() => onOpen(s.link!)}>
                                {titleOf(s.link)} を見る
                              </button>
                            )}
                          </li>
                        ))}
                      </ol>
                    )}

                    {isOpen(bi, 'tips') ? (
                      <div className="part editing">
                        <div className="part-head">
                          <span>ポイント</span>
                          {pen(bi, 'tips')}
                        </div>
                        {b.tips.map((t, i) => (
                          <div key={i} className="erow">
                            <input
                              className="why-in"
                              placeholder="見出し"
                              value={t.label}
                              onChange={(e) => setWork({ ...b, tips: put(b.tips, i, { ...t, label: e.target.value }) })}
                            />
                            <textarea
                              rows={2}
                              value={t.text}
                              onChange={(e) => setWork({ ...b, tips: put(b.tips, i, { ...t, text: e.target.value }) })}
                            />
                            <Mini
                              onUp={() => setWork({ ...b, tips: move(b.tips, i, i - 1) })}
                              onDown={() => setWork({ ...b, tips: move(b.tips, i, i + 1) })}
                              onDrop={() => setWork({ ...b, tips: b.tips.filter((_, j) => j !== i) })}
                            />
                          </div>
                        ))}
                        <button type="button" className="add" onClick={() => setWork({ ...b, tips: [...b.tips, { label: '', text: '' }] })}>
                          ＋ ポイントを足す
                        </button>
                      </div>
                    ) : (
                      b.tips.map((t, j) => (
                        <div key={j} className="tip">
                          <span className="grow">
                            <span className="tip-tag">ポイント</span>
                            <b>{t.label}</b>　{t.text}
                          </span>
                          {j === 0 && pen(bi, 'tips')}
                        </div>
                      ))
                    )}
                  </div>
                </details>
              )
            })}

            {canEdit && paper && paper.history.length > 0 && (
              <details className="hist">
                <summary>書き足しの記録（{paper.history.length}）</summary>
                {paper.history.map((h, i) => (
                  <div key={i}>{h}</div>
                ))}
              </details>
            )}
          </>
        )}
      </div>
      {props.onClose && publishButton && <div className="sheet-foot">{publishButton}</div>}
    </section>
  )
}

// ⬆︎⬇︎🗑 under a line being fixed.
function Mini({ onUp, onDown, onDrop }: { onUp: () => void; onDown: () => void; onDrop: () => void }) {
  return (
    <span className="mini">
      <button type="button" title="上へ" onClick={onUp}>
        ⬆︎
      </button>
      <button type="button" title="下へ" onClick={onDown}>
        ⬇︎
      </button>
      <button type="button" title="消す" onClick={onDrop}>
        🗑
      </button>
    </span>
  )
}
