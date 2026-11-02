import { useState } from 'react'
import type { Bundle, PaperBody, ShelfItem } from './types'

// One page of the check before handing the manual to the staff.
export interface ReviewPage {
  section: ShelfItem
  kind: 'new' | 'fixed' | 'removed'
  rules?: string[]
  bundle?: Bundle
}

const TAG = { new: '新しく書いた', fixed: '直した', removed: '消した' }

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

// What changed since the last hand-out, one bundle (or the rules) per page.
export function changesSince(
  shelf: ShelfItem[],
  current: Record<string, PaperBody>,
  published: Record<string, PaperBody>,
): ReviewPage[] {
  const pages: ReviewPage[] = []
  for (const section of shelf) {
    const now = current[section.id] ?? { rules: [], bundles: [] }
    const before = published[section.id] ?? { rules: [], bundles: [] }
    if (!same(now.rules, before.rules) && now.rules.length > 0) {
      pages.push({ section, kind: before.rules.length ? 'fixed' : 'new', rules: now.rules })
    }
    for (const b of now.bundles) {
      const old = before.bundles.find((x) => x.title === b.title)
      if (!old) pages.push({ section, kind: 'new', bundle: b })
      else if (!same(old, b)) pages.push({ section, kind: 'fixed', bundle: b })
    }
    for (const old of before.bundles) {
      if (!now.bundles.some((x) => x.title === old.title)) pages.push({ section, kind: 'removed', bundle: old })
    }
  }
  return pages
}

interface Props {
  pages: ReviewPage[]
  onFix: (sectionId: string) => void
  onPublish: () => void
  onClose: () => void
}

export function Review({ pages, onFix, onPublish, onClose }: Props) {
  const [at, setAt] = useState(0)
  const page = pages[at]
  const last = at === pages.length - 1

  return (
    <div className="overlay" role="dialog" aria-label="スタッフに配る前に">
      <div className="review">
        <div className="rv-top">
          <h2>📣 スタッフに配る前に</h2>
          {pages.length > 0 && (
            <span className="pos">
              {at + 1} / {pages.length}
            </span>
          )}
        </div>

        {pages.length === 0 ? (
          <>
            <p className="lead">前に配ったときから、変わったところはありません。</p>
            <div className="pager">
              <button type="button" className="go" onClick={onClose}>
                閉じる
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="lead">前に配ったときから、新しく書いたところ・直したところを、ひとつずつ見ていきます。</p>

            <div className="pg">
              <div className="crumb">
                {page.section.icon} {page.section.title}
                <span className={`tag ${page.kind}`}>{TAG[page.kind]}</span>
                {page.kind !== 'removed' && (
                  <button type="button" className="fixbtn" onClick={() => onFix(page.section.id)}>
                    ✏️ 直す
                  </button>
                )}
              </div>
              {page.rules ? (
                <>
                  <h3>お店の決まり</h3>
                  {page.rules.map((r, i) => (
                    <div key={i} className="rule">
                      <b>お店の決まり</b>　{r}
                    </div>
                  ))}
                </>
              ) : (
                page.bundle && (
                  <>
                    <h3>
                      {page.bundle.icon} {page.bundle.title}
                    </h3>
                    {page.kind === 'removed' && <p className="lead">この束は、スタッフの紙から消えます。</p>}
                    {page.bundle.note && <p className="from">{page.bundle.note}</p>}
                    <ol className="steps">
                      {page.bundle.steps.map((s, i) => (
                        <li key={i}>
                          {s.text}
                          {s.why && <span className="why">{s.why}</span>}
                        </li>
                      ))}
                    </ol>
                    {page.bundle.tips.map((t, i) => (
                      <div key={i} className="tip">
                        <b>{t.label}</b>　{t.text}
                      </div>
                    ))}
                  </>
                )
              )}
            </div>

            <div className="pager">
              <button
                type="button"
                style={{ visibility: at === 0 ? 'hidden' : 'visible' }}
                onClick={() => setAt(at - 1)}
              >
                ← 前へ
              </button>
              <span className="dots">
                {pages.map((_, i) => (
                  <i key={i} className={i === at ? 'on' : ''} onClick={() => setAt(i)} />
                ))}
              </span>
              {last ? (
                <button type="button" className="go" onClick={onPublish}>
                  これで配る
                </button>
              ) : (
                <button type="button" className="go" onClick={() => setAt(at + 1)}>
                  次へ →
                </button>
              )}
            </div>
          </>
        )}
        <button type="button" className="later" onClick={onClose}>
          あとで（閉じる）
        </button>
      </div>
    </div>
  )
}
