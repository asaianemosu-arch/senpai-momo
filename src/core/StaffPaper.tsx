import { useState } from 'react'
import type { Focus, PaperBody, ShelfItem } from './types'
import { StepIcon } from './ShowCard'

interface Props {
  item: ShelfItem
  paper: PaperBody | undefined
  // The bundle Momo last pointed to; it opens with those steps lit.
  focus: Focus | null
  titleOf: (id: string) => string
  onOpen: (id: string) => void
  onClose?: () => void
}

// What staff see: the paper stays folded. Only what they ask about opens.
export function StaffPaper({ item, paper, focus, titleOf, onOpen, onClose }: Props) {
  const [opened, setOpened] = useState<string[]>([])
  const here = focus && focus.section === item.id ? focus : null
  const empty = !paper || (paper.rules.length === 0 && paper.bundles.length === 0)

  const toggle = (title: string) =>
    setOpened((all) => (all.includes(title) ? all.filter((t) => t !== title) : [...all, title]))

  return (
    <section className={onClose ? 'page sheet-page' : 'page'}>
      <div className="paper staff-paper">
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

        {empty ? (
          <p className="blank">まだ配られていません。</p>
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
                <div key={b.title} className={open ? 'fold open' : 'fold'}>
                  <button type="button" className="fold-top" onClick={() => toggle(b.title)}>
                    <span className="illust peach">{b.icon}</span>
                    <span className="grow">
                      <b>{b.title}</b>
                      {!open && <small>{b.summary || b.steps.slice(0, 2).map((s) => s.text).join('、')}</small>}
                    </span>
                    <span className="chev">{open ? '▾' : '▸'}</span>
                  </button>
                  {open && (
                    <div className="fold-body">
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
