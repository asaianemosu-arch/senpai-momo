import type { ShelfItem } from './types'
import momoUrl from '../../assets/momo/01.png'

interface Props {
  shopName: string
  items: ShelfItem[]
  // What each part already holds (bundle names), shown under its title.
  contents: Record<string, string>
  // How many bundles Momo just wrote or fixed in each part; those parts glow.
  fresh?: Record<string, number>
  // Bumped each time Momo writes, so the glow plays again.
  pulse?: number
  openId: string
  onOpen: (id: string) => void
}

export function Shelf({ shopName, items, contents, fresh, pulse, openId, onOpen }: Props) {
  return (
    <section className="side">
      <div className="momo">
        <img src={momoUrl} alt="モモ" className="light-target" />
        <div className="momo-name">先輩店員 Momo</div>
        <div className="momo-shop">{shopName}</div>
        <div className="momo-things">
          <button type="button" className="thing">📒 メモ帳</button>
          <button type="button" className="thing">🔐 金庫</button>
        </div>
      </div>

      <div className="shelf-title">お店のマニュアル</div>
      <ShelfList items={items} contents={contents} fresh={fresh} pulse={pulse} openId={openId} onOpen={onOpen} />
    </section>
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
            <span>
              {item.title}
              {(contents[item.id] || item.note) && <small>{contents[item.id] || item.note}</small>}
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
