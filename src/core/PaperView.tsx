import type { Paper, Role, ShelfItem } from './types'

interface Props {
  role: Role
  item: ShelfItem
  paper: Paper | undefined
}

export function PaperView({ role, item, paper }: Props) {
  const empty = !paper || (paper.steps.length === 0 && paper.tips.length === 0)

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
            {paper.steps.length > 0 && (
              <>
                <h3>手順</h3>
                <ol className="steps">
                  {paper.steps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              </>
            )}
            {paper.tips.length > 0 && (
              <>
                <h3>シェフのコツ</h3>
                {paper.tips.map((t, i) => (
                  <div key={i} className="tip">
                    <b>{t.label}</b> {t.text}
                  </div>
                ))}
              </>
            )}
            {role === 'chef' && paper.asks.length > 0 && (
              <>
                <h3>まだ聞けていないこと</h3>
                <ul className="ask">
                  {paper.asks.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </>
            )}
            {paper.history.length > 0 && (
              <div className="changed">
                {paper.history.map((h, i) => (
                  <div key={i}>{h}</div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
