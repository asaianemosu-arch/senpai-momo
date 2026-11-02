import type { Paper, Role, ShelfItem } from './types'

interface Props {
  role: Role
  item: ShelfItem
  paper: Paper | undefined
  titleOf: (id: string) => string
  onOpen: (id: string) => void
}

export function PaperView({ role, item, paper, titleOf, onOpen }: Props) {
  const empty = !paper || (paper.rules.length === 0 && paper.bundles.length === 0)

  return (
    <section className="page">
      <div className="paper">
        <h2>
          {item.icon} {item.title}
        </h2>

        {empty ? (
          <p className="blank">
            {role === 'chef'
              ? 'まだ白い紙です。シェフのお話から、モモが書きます。'
              : 'まだ書かれていません。'}
          </p>
        ) : (
          <>
            {paper.rules.map((r, i) => (
              <div key={i} className="rule">
                <b>お店の決まり</b>　{r}
              </div>
            ))}

            {paper.bundles.map((b, i) => (
              <details key={`${item.id}-${i}-${b.title}`} className="bundle" open>
                <summary>
                  <span className="ic">{b.icon}</span>
                  {b.title}
                  <span className="count">{b.steps.length}つ</span>
                  <span className="chev">▸</span>
                </summary>
                <div className="body">
                  {b.note && <p className="from">{b.note}</p>}
                  {b.steps.length > 0 && (
                    <ol className="steps">
                      {b.steps.map((s, j) => (
                        <li key={j}>
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
                  {b.tips.map((t, j) => (
                    <div key={j} className="tip">
                      <b>{t.label}</b>　{t.text}
                    </div>
                  ))}
                </div>
              </details>
            ))}

            {paper.history.length > 0 && (
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
    </section>
  )
}
