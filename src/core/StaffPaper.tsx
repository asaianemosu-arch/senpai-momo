import { useEffect, useRef, useState } from 'react'
import type { Focus, PaperBody, ShelfItem } from './types'
import { BundlePhoto, StepIcon } from './ShowCard'
import { Facts, Recipe } from './Timetable'
import { Checklist } from './Checklist'

interface Props {
  item: ShelfItem
  paper: PaperBody | undefined
  // The bundle Momo last pointed to; it opens with those steps lit.
  focus: Focus | null
  titleOf: (id: string) => string
  onOpen: (id: string) => void
  onClose?: () => void
  // Parts staff tick off for the day (オープン前・クローズ).
  checks?: {
    done: string[]
    onToggle: (title: string) => void
    recordDone: boolean
    onRecord: () => void
  }
}

// What staff see: the paper stays folded. Only what they ask about opens.
export function StaffPaper({ item, paper, focus, titleOf, onOpen, onClose, checks }: Props) {
  const [opened, setOpened] = useState<string[]>([])
  const here = focus && focus.section === item.id ? focus : null
  const empty = !paper || (paper.rules.length === 0 && paper.bundles.length === 0)
  // ☑️ first where there is a list, unless Momo has just pointed into the paper.
  const [ticking, setTicking] = useState(!here)
  const [lookAt, setLookAt] = useState<string | null>(null)
  const pageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (here) setTicking(false)
  }, [here])

  // "見る ›" on the list: the paper opens at that bundle.
  useEffect(() => {
    if (!lookAt || ticking) return
    pageRef.current?.querySelector(`[data-bundle="${CSS.escape(lookAt)}"]`)?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    setLookAt(null)
  }, [lookAt, ticking])

  const listed = item.checklist && checks && !empty

  const toggle = (title: string) =>
    setOpened((all) => (all.includes(title) ? all.filter((t) => t !== title) : [...all, title]))

  return (
    <section className={onClose ? 'page sheet-page' : 'page'}>
      <div className="paper staff-paper" ref={pageRef}>
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

        {listed && (
          <div className="hy-switch ck-switch" role="tablist">
            <button type="button" role="tab" aria-selected={!ticking} className={ticking ? '' : 'on'} onClick={() => setTicking(false)}>
              📖 読む
            </button>
            <button type="button" role="tab" aria-selected={ticking} className={ticking ? 'on' : ''} onClick={() => setTicking(true)}>
              ☑️ チェック
            </button>
          </div>
        )}

        {empty ? (
          <p className="blank">まだ配られていません。</p>
        ) : listed && ticking ? (
          <Checklist
            item={{ ...item, checklist: item.checklist! }}
            paper={paper}
            {...checks}
            onLook={(title) => {
              setOpened((all) => (all.includes(title) ? all : [...all, title]))
              setTicking(false)
              setLookAt(title)
            }}
          />
        ) : (
          <>
            {paper.rules.map((r, i) => (
              <div key={i} className="rule">
                <b>大切なこと</b>　{r}
              </div>
            ))}
            {paper.bundles.map((b) => {
              const lit = here?.bundle === b.title ? here.steps : []
              const open = here?.bundle === b.title || opened.includes(b.title)
              return (
                <div key={b.title} data-bundle={b.title} className={open ? 'fold open' : 'fold'}>
                  <button type="button" className="fold-top" onClick={() => toggle(b.title)}>
                    <span className="illust peach">{b.icon}</span>
                    <span className="grow">
                      <b>
                        {b.title}
                        {b.time && <span className="time-chip">🕐 {b.time}</span>}
                        {!!b.days?.length && <span className="week">{b.days.join('・')}</span>}
                      </b>
                      {!open && (
                        <small>
                          {b.summary ||
                            (b.steps.length
                              ? b.steps.slice(0, 2).map((s) => s.text).join('、')
                              : (b.facts ?? []).map((f) => `${f.label}：${f.text}`).join('、'))}
                        </small>
                      )}
                    </span>
                    <span className="chev">{open ? '▾' : '▸'}</span>
                  </button>
                  {open && (
                    <div className="fold-body">
                      <BundlePhoto photo={b.photo} />
                      {!!b.facts?.length && (item.list ? <Recipe facts={b.facts} title={item.list.title} /> : <Facts facts={b.facts} />)}
                      {b.note && <p className="from">{b.note}</p>}
                      {b.steps.map((s, i) => (
                        <div key={i} className={lit.includes(i + 1) ? 'ostep lit' : 'ostep'}>
                          <span className="n">{i + 1}</span>
                          <StepIcon step={s} bundle={b} index={i} />
                          <span className="grow">
                            {s.remind && <span className="remind">忘れずに</span>}
                            {s.text}
                            {s.why && <span className="why">{s.why}</span>}
                            {s.link && (
                              <button type="button" className="link" onClick={() => onOpen(s.link!)}>
                                {titleOf(s.link)} を見る
                              </button>
                            )}
                          </span>
                        </div>
                      ))}
                      {b.tips.map((t, j) => (
                        <div key={j} className="tip">
                          <span className="tip-tag">ポイント</span>
                          <b>{t.label}</b>　{t.text}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </>
        )}
      </div>
    </section>
  )
}
