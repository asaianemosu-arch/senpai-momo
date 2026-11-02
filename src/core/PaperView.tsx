import { useState } from 'react'
import type { Bundle, Paper, PaperBody, Role, ShelfItem, Step } from './types'

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
  | { kind: 'step'; b: number; s: number; text: string; why: string }
  | { kind: 'rule'; r: number; text: string }
  | { kind: 'title'; b: number; text: string }
  | { kind: 'note'; b: number; text: string }

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

  function save() {
    if (!draft) return
    const text = draft.text.trim()
    if (draft.kind === 'rule') {
      const rules = text
        ? body.rules.map((r, i) => (i === draft.r ? text : r))
        : body.rules.filter((_, i) => i !== draft.r)
      change({ ...body, rules }, 'お店の決まり')
    } else if (draft.kind === 'title' && text) {
      setBundle(draft.b, { ...body.bundles[draft.b], title: text }, text)
    } else if (draft.kind === 'note') {
      setBundle(draft.b, { ...body.bundles[draft.b], note: text }, body.bundles[draft.b].title)
    } else if (draft.kind === 'step') {
      const steps = body.bundles[draft.b].steps
      setSteps(
        draft.b,
        text
          ? steps.map((s, i) => (i === draft.s ? { ...s, text, why: draft.why.trim() } : s))
          : steps.filter((_, i) => i !== draft.s),
      )
    } else {
      setDraft(null)
    }
  }

  const editBox = (rows = 2) =>
    draft && (
      <div className="editbox">
        <textarea
          rows={rows}
          autoFocus
          value={draft.text}
          onChange={(e) => setDraft({ ...draft, text: e.target.value })}
        />
        {draft.kind === 'step' && (
          <input
            className="why-in"
            placeholder="理由（あれば）"
            value={draft.why}
            onChange={(e) => setDraft({ ...draft, why: e.target.value })}
          />
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
                  <b>お店の決まり</b>　{r}
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
                  <span className="count">{b.steps.length}つ</span>
                  <span className="chev">▸</span>
                </summary>
                <div className="body">
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
                            <span
                              className={editing ? 'grow editable' : 'grow'}
                              onClick={
                                editing
                                  ? () => setDraft({ kind: 'step', b: bi, s: si, text: s.text, why: s.why })
                                  : undefined
                              }
                            >
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
                        setDraft({ kind: 'step', b: bi, s: b.steps.length, text: '', why: '' })
                      }
                    >
                      ＋ 手順を足す
                    </button>
                  )}
                  {is({ kind: 'step', b: bi, s: b.steps.length }) && (
                    <AddStep
                      draft={draft as Extract<Draft, { kind: 'step' }>}
                      setDraft={setDraft}
                      onSave={(text, why) =>
                        setSteps(bi, [...b.steps, { text, why, link: null }])
                      }
                    />
                  )}

                  {b.tips.map((t, j) => (
                    <div key={j} className="tip">
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

function AddStep({
  draft,
  setDraft,
  onSave,
}: {
  draft: Extract<Draft, { kind: 'step' }>
  setDraft: (d: Draft | null) => void
  onSave: (text: string, why: string) => void
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
      <div className="acts">
        <button
          type="button"
          className="save"
          onClick={() => draft.text.trim() && onSave(draft.text.trim(), draft.why.trim())}
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
