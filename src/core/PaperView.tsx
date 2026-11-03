import { useRef, useState, type ReactNode } from 'react'
import { WEEKDAYS, type Bundle, type Paper, type PaperBody, type Role, type ShelfItem, type Step, type Weekday } from './types'
import { Facts, Recipe } from './Timetable'
import { BundlePhoto, StepPhoto } from './ShowCard'
import { trouble } from './Handover'
import { readFile } from './files'
import { keepPhoto } from './photos'

interface Props {
  role: Role
  item: ShelfItem
  paper: Paper | undefined
  editing: boolean
  onToggleEdit: () => void
  onPublish: () => void
  onChange: (body: PaperBody, note: string) => void
  titleOf: (id: string) => string
  onOpen: (id: string) => void
  // On a phone the paper slides up over the conversation and can be closed.
  onClose?: () => void
}

// Which piece of the paper is open for typing, and what has been typed so far.
type Draft =
  | { kind: 'step'; b: number; s: number; text: string; why: string; remind: boolean }
  | { kind: 'rule'; r: number; text: string }
  | { kind: 'title'; b: number; text: string }
  | { kind: 'time'; b: number; text: string }
  | { kind: 'note'; b: number; text: string }
  | { kind: 'caption'; b: number; text: string }
  | { kind: 'fact'; b: number; f: number; label: string; text: string }

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

export function PaperView(props: Props) {
  const { role, item, paper, editing, titleOf, onOpen } = props
  const [draft, setDraft] = useState<Draft | null>(null)
  // Where a photo chosen with "📷 写真を足す" goes: a bundle, or one of its steps.
  const [photoFor, setPhotoFor] = useState<{ b: number; s?: number } | null>(null)
  const [photoNote, setPhotoNote] = useState('')
  const picker = useRef<HTMLInputElement>(null)
  const canEdit = role === 'chef'
  const empty = !paper || (paper.rules.length === 0 && paper.bundles.length === 0)
  const body: PaperBody = { rules: paper?.rules ?? [], bundles: paper?.bundles ?? [] }

  function change(next: PaperBody, what: string) {
    props.onChange(next, `シェフが直しました（${what}）`)
    setDraft(null)
  }

  function setBundle(b: number, bundle: Bundle, what: string) {
    change({ ...body, bundles: body.bundles.map((x, i) => (i === b ? bundle : x)) }, what)
  }

  function setSteps(b: number, steps: Step[]) {
    setBundle(b, { ...body.bundles[b], steps }, body.bundles[b].title)
  }

  function addPhoto(b: number, s?: number) {
    setPhotoNote('')
    setPhotoFor({ b, s })
    picker.current?.click()
  }

  async function photoChosen(file: File) {
    if (!photoFor) return
    try {
      const h = await readFile(file)
      if (h.media?.type !== 'image') throw new Error()
      const id = await keepPhoto(h.media.data)
      const bundle = body.bundles[photoFor.b]
      const s = photoFor.s
      if (s === undefined) setBundle(photoFor.b, { ...bundle, photo: { id, caption: '' } }, `${bundle.title}の写真`)
      else setSteps(photoFor.b, bundle.steps.map((x, i) => (i === s ? { ...x, photo: id } : x)))
    } catch (e) {
      setPhotoNote(trouble(e) || '写真を貼れませんでした。')
    }
    setPhotoFor(null)
  }

  function save() {
    if (!draft) return
    const text = draft.text.trim()
    if (draft.kind === 'rule') {
      const rules = text
        ? body.rules.map((r, i) => (i === draft.r ? text : r))
        : body.rules.filter((_, i) => i !== draft.r)
      change({ ...body, rules }, '大切なこと')
    } else if (draft.kind === 'time') {
      const bundle = body.bundles[draft.b]
      setBundle(draft.b, { ...bundle, time: text || undefined, minutes: text ? minutesOf(text) : undefined }, bundle.title)
    } else if (draft.kind === 'title' && text) {
      setBundle(draft.b, { ...body.bundles[draft.b], title: text }, text)
    } else if (draft.kind === 'caption') {
      const bundle = body.bundles[draft.b]
      if (bundle.photo) setBundle(draft.b, { ...bundle, photo: { ...bundle.photo, caption: text } }, `${bundle.title}の写真`)
      else setDraft(null)
    } else if (draft.kind === 'fact') {
      const bundle = body.bundles[draft.b]
      const facts = bundle.facts ?? []
      const label = draft.label.trim()
      const fact = { label, text }
      const next =
        !label && !text
          ? facts.filter((_, i) => i !== draft.f)
          : draft.f === facts.length
            ? [...facts, fact]
            : facts.map((x, i) => (i === draft.f ? fact : x))
      setBundle(draft.b, { ...bundle, facts: next }, bundle.title)
    } else if (draft.kind === 'note') {
      setBundle(draft.b, { ...body.bundles[draft.b], note: text }, body.bundles[draft.b].title)
    } else if (draft.kind === 'step') {
      const steps = body.bundles[draft.b].steps
      setSteps(
        draft.b,
        text
          ? steps.map((s, i) =>
              i === draft.s ? { ...s, text, why: draft.why.trim(), remind: draft.remind } : s,
            )
          : steps.filter((_, i) => i !== draft.s),
      )
    } else {
      setDraft(null)
    }
  }

  const editBox = (rows = 2) =>
    draft && (
      <div className="editbox">
        {draft.kind === 'fact' ? (
          <div className="fact-in">
            <input
              autoFocus
              placeholder={item.untimed ? '材料' : '見出し'}
              value={draft.label}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
            />
            <input
              placeholder={item.untimed ? '分量' : '中身'}
              value={draft.text}
              onChange={(e) => setDraft({ ...draft, text: e.target.value })}
            />
          </div>
        ) : (
        <textarea
          rows={rows}
          autoFocus
          placeholder={draft.kind === 'time' ? '例：4:30、10時までに、帰る前（消すと時間割から外れます）' : undefined}
          value={draft.text}
          onChange={(e) => setDraft({ ...draft, text: e.target.value })}
        />
        )}
        {draft.kind === 'step' && (
          <>
            <input
              className="why-in"
              placeholder="理由（あれば）"
              value={draft.why}
              onChange={(e) => setDraft({ ...draft, why: e.target.value })}
            />
            <label className="remind-in">
              <input
                type="checkbox"
                checked={draft.remind}
                onChange={(e) => setDraft({ ...draft, remind: e.target.checked })}
              />
              忘れずに
            </label>
          </>
        )}
        <div className="acts">
          <button type="button" className="save" onClick={save}>
            直す
          </button>
          <button type="button" onClick={() => setDraft(null)}>
            やめる
          </button>
        </div>
      </div>
    )

  const chefButtons = canEdit && !empty && (
    <>
      <button
        type="button"
        className={editing ? 'edit-toggle on' : 'edit-toggle'}
        onClick={() => {
          setDraft(null)
          props.onToggleEdit()
        }}
      >
        {editing ? '✏️ 直しています' : '✏️ 直す'}
      </button>
      <button type="button" className="send-btn" onClick={props.onPublish}>
        📣 スタッフに配る
      </button>
    </>
  )

  const is = (d: Partial<Draft>) =>
    !!draft && Object.entries(d).every(([k, v]) => (draft as Record<string, unknown>)[k] === v)

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
            chefButtons
          )}
        </div>

        {editing && (
          <div className="editing-bar">
            直したいところを押すと、文字を直せます。⬆︎⬇︎で順番、🗑で消す。終わったら右上の釦をもう一度。
          </div>
        )}
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
            {role === 'chef'
              ? 'まだ白い紙です。シェフのお話から、モモが書きます。'
              : 'まだ配られていません。'}
          </p>
        ) : (
          <>
            {body.rules.map((r, i) =>
              is({ kind: 'rule', r: i }) ? (
                <div key={i}>{editBox(1)}</div>
              ) : (
                <div
                  key={i}
                  className={editing ? 'rule editable' : 'rule'}
                  onClick={editing ? () => setDraft({ kind: 'rule', r: i, text: r }) : undefined}
                >
                  <b>大切なこと</b>　{r}
                </div>
              ),
            )}

            {body.bundles.map((b, bi) => (
              <details key={`${item.id}-${bi}`} className="bundle" open>
                <summary>
                  <span className="ic">{b.icon}</span>
                  {is({ kind: 'title', b: bi }) ? (
                    <span className="grow" onClick={(e) => e.preventDefault()}>
                      {editBox(1)}
                    </span>
                  ) : (
                    <span
                      className={editing ? 'grow editable' : 'grow'}
                      onClick={
                        editing
                          ? (e) => {
                              e.preventDefault()
                              setDraft({ kind: 'title', b: bi, text: b.title })
                            }
                          : undefined
                      }
                    >
                      {b.title}
                    </span>
                  )}
                  {is({ kind: 'time', b: bi }) ? (
                    <span className="grow" onClick={(e) => e.preventDefault()}>
                      {editBox(1)}
                    </span>
                  ) : editing ? (
                    <span
                      className={b.time ? 'time-chip editable' : 'time-chip add-time editable'}
                      onClick={(e) => {
                        e.preventDefault()
                        setDraft({ kind: 'time', b: bi, text: b.time ?? '' })
                      }}
                    >
                      {b.time ? `🕐 ${b.time}` : '＋ 時刻'}
                    </span>
                  ) : (
                    b.time && <span className="time-chip">🕐 {b.time}</span>
                  )}
                  {!editing && !!b.days?.length && <span className="week">{b.days.join('・')}</span>}
                  <span className="count">{b.steps.length}つ</span>
                  <span className="chev">▸</span>
                </summary>
                <div className="body">
                  {editing && (
                    <div className="day-pick" aria-label="曜日（選ばなければ毎日）">
                      <span>曜日</span>
                      {WEEKDAYS.map((d) => (
                        <button
                          key={d}
                          type="button"
                          className={b.days?.includes(d) ? 'on' : ''}
                          onClick={() => setBundle(bi, { ...b, days: toggleDay(b.days, d) }, b.title)}
                        >
                          {d}
                        </button>
                      ))}
                      <small>{b.days?.length ? '' : '毎日'}</small>
                    </div>
                  )}
                  <BundlePhoto
                    photo={b.photo}
                    caption={
                      !editing ? undefined : is({ kind: 'caption', b: bi }) ? (
                        editBox(2)
                      ) : (
                        <figcaption
                          className="editable"
                          onClick={() => setDraft({ kind: 'caption', b: bi, text: b.photo?.caption ?? '' })}
                        >
                          {b.photo?.caption || '＋ 写真の説明'}
                        </figcaption>
                      )
                    }
                  >
                    {editing && (
                      <button
                        type="button"
                        className="photo-x"
                        aria-label="写真を外す"
                        onClick={() => setBundle(bi, { ...b, photo: undefined }, `${b.title}の写真`)}
                      >
                        ✕
                      </button>
                    )}
                  </BundlePhoto>
                  {editing && !b.photo && (
                    <button type="button" className="add photo-add" onClick={() => addPhoto(bi)}>
                      📷 束の写真を足す
                    </button>
                  )}
                  {editing ? (
                    <FactsEdit
                      title={item.untimed ? '配合' : '札'}
                      facts={b.facts ?? []}
                      draftAt={draft?.kind === 'fact' && draft.b === bi ? draft.f : null}
                      editBox={editBox(1)}
                      onPick={(f) =>
                        setDraft({ kind: 'fact', b: bi, f, label: b.facts?.[f]?.label ?? '', text: b.facts?.[f]?.text ?? '' })
                      }
                      onChange={(facts) => setBundle(bi, { ...b, facts }, b.title)}
                      adding={item.untimed ? '＋ 材料を足す' : '＋ 札を足す'}
                    />
                  ) : (
                    !!b.facts?.length && (item.untimed ? <Recipe facts={b.facts} /> : <Facts facts={b.facts} />)
                  )}
                  {is({ kind: 'note', b: bi }) ? (
                    editBox(2)
                  ) : b.note ? (
                    <p
                      className={editing ? 'from editable' : 'from'}
                      onClick={editing ? () => setDraft({ kind: 'note', b: bi, text: b.note }) : undefined}
                    >
                      {b.note}
                    </p>
                  ) : null}

                  <ol className={editing ? 'steps edit' : 'steps'}>
                    {b.steps.map((s, si) => (
                      <li key={si}>
                        {is({ kind: 'step', b: bi, s: si }) ? (
                          editBox(2)
                        ) : (
                          <>
                            <StepPhoto id={s.photo}>
                              {editing && (
                                <button
                                  type="button"
                                  className="photo-x"
                                  aria-label="写真を外す"
                                  onClick={() =>
                                    setSteps(bi, b.steps.map((x, i) => (i === si ? { ...x, photo: undefined } : x)))
                                  }
                                >
                                  ✕
                                </button>
                              )}
                            </StepPhoto>
                            <span
                              className={editing ? 'grow editable' : 'grow'}
                              onClick={
                                editing
                                  ? () =>
                                      setDraft({
                                        kind: 'step',
                                        b: bi,
                                        s: si,
                                        text: s.text,
                                        why: s.why,
                                        remind: !!s.remind,
                                      })
                                  : undefined
                              }
                            >
                              {s.remind && <span className="remind">忘れずに</span>}
                              {s.text}
                              {s.why && <span className="why">{s.why}</span>}
                              {s.link && !editing && (
                                <button type="button" className="link" onClick={() => onOpen(s.link!)}>
                                  {titleOf(s.link)} を見る
                                </button>
                              )}
                            </span>
                            {editing && (
                              <span className="tools">
                                {!s.photo && (
                                  <button type="button" title="写真を足す" onClick={() => addPhoto(bi, si)}>
                                    📷
                                  </button>
                                )}
                                <button type="button" title="上へ" onClick={() => setSteps(bi, move(b.steps, si, si - 1))}>
                                  ⬆︎
                                </button>
                                <button type="button" title="下へ" onClick={() => setSteps(bi, move(b.steps, si, si + 1))}>
                                  ⬇︎
                                </button>
                                <button
                                  type="button"
                                  title="消す"
                                  onClick={() => setSteps(bi, b.steps.filter((_, i) => i !== si))}
                                >
                                  🗑
                                </button>
                              </span>
                            )}
                          </>
                        )}
                      </li>
                    ))}
                  </ol>
                  {editing && !draft && (
                    <button
                      type="button"
                      className="add"
                      onClick={() =>
                        setDraft({ kind: 'step', b: bi, s: b.steps.length, text: '', why: '', remind: false })
                      }
                    >
                      ＋ 手順を足す
                    </button>
                  )}
                  {is({ kind: 'step', b: bi, s: b.steps.length }) && (
                    <AddStep
                      draft={draft as Extract<Draft, { kind: 'step' }>}
                      setDraft={setDraft}
                      onSave={(text, why, remind) =>
                        setSteps(bi, [...b.steps, { text, why, link: null, remind }])
                      }
                    />
                  )}

                  {b.tips.map((t, j) => (
                    <div key={j} className="tip">
                      <span className="tip-tag">ポイント</span>
                      <b>{t.label}</b>　{t.text}
                    </div>
                  ))}
                </div>
              </details>
            ))}

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
      {props.onClose && chefButtons && <div className="sheet-foot">{chefButtons}</div>}
    </section>
  )
}

// 配合 (or a bundle's short facts) in edit mode: one a line, to fix, move or drop.
function FactsEdit({
  title,
  facts,
  draftAt,
  editBox,
  onPick,
  onChange,
  adding,
}: {
  title: string
  facts: { label: string; text: string }[]
  draftAt: number | null
  editBox: ReactNode
  onPick: (f: number) => void
  onChange: (facts: { label: string; text: string }[]) => void
  adding: string
}) {
  return (
    <div className="recipe-list">
      <div className="recipe-head">{title}</div>
      {facts.map((f, i) =>
        draftAt === i ? (
          <div key={i}>{editBox}</div>
        ) : (
          <div key={i} className="ing">
            <b className="editable" onClick={() => onPick(i)}>
              {f.label}
            </b>
            <span className="editable" onClick={() => onPick(i)}>
              {f.text}
            </span>
            <span className="tools">
              <button type="button" title="上へ" onClick={() => onChange(move(facts, i, i - 1))}>
                ⬆︎
              </button>
              <button type="button" title="下へ" onClick={() => onChange(move(facts, i, i + 1))}>
                ⬇︎
              </button>
              <button type="button" title="消す" onClick={() => onChange(facts.filter((_, j) => j !== i))}>
                🗑
              </button>
            </span>
          </div>
        ),
      )}
      {draftAt === facts.length ? (
        editBox
      ) : (
        draftAt === null && (
          <button type="button" className="add" onClick={() => onPick(facts.length)}>
            {adding}
          </button>
        )
      )}
    </div>
  )
}

function AddStep({
  draft,
  setDraft,
  onSave,
}: {
  draft: Extract<Draft, { kind: 'step' }>
  setDraft: (d: Draft | null) => void
  onSave: (text: string, why: string, remind: boolean) => void
}) {
  return (
    <div className="editbox add-box">
      <textarea
        rows={2}
        autoFocus
        placeholder="足す手順"
        value={draft.text}
        onChange={(e) => setDraft({ ...draft, text: e.target.value })}
      />
      <input
        className="why-in"
        placeholder="理由（あれば）"
        value={draft.why}
        onChange={(e) => setDraft({ ...draft, why: e.target.value })}
      />
      <label className="remind-in">
        <input
          type="checkbox"
          checked={draft.remind}
          onChange={(e) => setDraft({ ...draft, remind: e.target.checked })}
        />
        忘れずに
      </label>
      <div className="acts">
        <button
          type="button"
          className="save"
          onClick={() => draft.text.trim() && onSave(draft.text.trim(), draft.why.trim(), draft.remind)}
        >
          足す
        </button>
        <button type="button" onClick={() => setDraft(null)}>
          やめる
        </button>
      </div>
    </div>
  )
}
