import { useLayoutEffect, useRef, useState } from 'react'
import type { ShelfItem } from './types'
import momoUrl from '../../assets/momo/01.png'

interface Props {
  shopName: string
  items: ShelfItem[]
  // What each part already holds (bundle names), shown under its title.
  contents: Record<string, string[]>
  // How many bundles Momo just wrote or fixed in each part; those parts glow.
  fresh?: Record<string, number>
  // Bumped each time Momo writes, so the glow plays again.
  pulse?: number
  openId: string
  onOpen: (id: string) => void
  // Back to the sample shop, or a shop with nothing written yet.
  onRestart?: (to: Restart) => void
}

type Restart = 'sample' | 'blank'

const RESTART: Record<Restart, { label: string; ask: string; go: string }> = {
  sample: { label: '見本に戻す', ask: 'もふもふベーカリーの見本に戻します。いまの会話と紙は消えます。', go: '戻す' },
  blank: { label: 'まっさらのお店で試す', ask: '何も書かれていないお店から、シェフとして始めます。いまの会話と紙は消えます。', go: '始める' },
}

export function Shelf({ shopName, items, contents, fresh, pulse, openId, onOpen, onRestart }: Props) {
  return (
    <section className="side">
      <div className="momo">
        <img src={momoUrl} alt="モモ" className="light-target" />
        <div className="momo-name">先輩店員 Momo</div>
        <div className="momo-shop">{shopName}</div>
      </div>

      <div className="shelf-title">お店のマニュアル</div>
      <ShelfList items={items} contents={contents} fresh={fresh} pulse={pulse} openId={openId} onOpen={onOpen} />
      {onRestart && <Restarts onRestart={onRestart} />}
    </section>
  )
}

// Quiet, at the bottom: asks once before anything is dropped.
function Restarts({ onRestart }: { onRestart: (to: Restart) => void }) {
  const [asking, setAsking] = useState<Restart | null>(null)
  if (asking) {
    return (
      <div className="restart asking">
        <p>{RESTART[asking].ask}</p>
        <div className="restart-go">
          <button type="button" className="go" onClick={() => onRestart(asking)}>
            {RESTART[asking].go}
          </button>
          <button type="button" onClick={() => setAsking(null)}>
            やめる
          </button>
        </div>
      </div>
    )
  }
  return (
    <div className="restart">
      {(Object.keys(RESTART) as Restart[]).map((to) => (
        <button key={to} type="button" onClick={() => setAsking(to)}>
          {RESTART[to].label}
        </button>
      ))}
    </div>
  )
}

function ShelfList({ items, contents, fresh, pulse, openId, onOpen }: Omit<Props, 'shopName'>) {
  return (
    <ul className="shelf">
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            className={item.id === openId ? 'card open' : 'card'}
            onClick={() => onOpen(item.id)}
          >
            {!!fresh?.[item.id] && (
              <>
                <span key={`g${pulse}`} className="glow" aria-hidden="true" />
                <span key={`p${pulse}`} className="plus">
                  ＋{fresh[item.id]}
                </span>
              </>
            )}
            <span className="ic">{item.icon}</span>
            <span className="card-text">
              {item.title}
              {contents[item.id]?.length ? <Glance titles={contents[item.id]} /> : item.note && <small>{item.note}</small>}
            </span>
          </button>
          {item.children && (
            <div className="inner">
              <ShelfList items={item.children} contents={contents} fresh={fresh} pulse={pulse} openId={openId} onOpen={onOpen} />
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

const LINES = 2

// What a part holds, in two lines at most: as many names as fit, then how
// many more, so a long part does not push the shelf off the screen.
function Glance({ titles }: { titles: string[] }) {
  const box = useRef<HTMLElement>(null)
  const [shown, setShown] = useState(titles.length)
  const key = titles.join('\n')

  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const fit = () => {
      // Try on a hidden copy, so React keeps the one it drew.
      const probe = el.cloneNode() as HTMLElement
      probe.style.cssText = 'position:absolute;visibility:hidden;left:0;right:0'
      el.parentElement?.appendChild(probe)
      probe.style.width = `${el.clientWidth}px`
      const most = parseFloat(getComputedStyle(el).lineHeight) * LINES + 1
      let n = titles.length
      probe.textContent = say(titles, n)
      while (n > 1 && probe.scrollHeight > most) probe.textContent = say(titles, --n)
      probe.remove()
      setShown(n)
    }
    fit()
    const watch = new ResizeObserver(fit)
    watch.observe(el.closest('.card') ?? el)
    return () => watch.disconnect()
  }, [key])

  return <small ref={box}>{say(titles, shown)}</small>
}

function say(titles: string[], shown: number): string {
  const rest = titles.length - shown
  return titles.slice(0, shown).join('・') + (rest ? ` … ほか${rest}つ` : '')
}
