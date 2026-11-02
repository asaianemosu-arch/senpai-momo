import type { Message, Paper, Role, ShelfItem } from './core/types'
import { usePersistent } from './core/storage'
import { Shelf } from './core/Shelf'
import { Chat } from './core/Chat'
import { PaperView } from './core/PaperView'
import { bakery as trade } from './trades/bakery'

function findItem(items: ShelfItem[], id: string): ShelfItem | undefined {
  for (const item of items) {
    if (item.id === id) return item
    const inner = item.children && findItem(item.children, id)
    if (inner) return inner
  }
}

const ROLES: { role: Role; label: string }[] = [
  { role: 'chef', label: '👨‍🍳 シェフ（教える）' },
  { role: 'staff', label: '🧑‍🍳 スタッフ（使う）' },
]

export function App() {
  const [role, setRole] = usePersistent<Role>('role', 'chef')
  const [openId, setOpenId] = usePersistent('open', trade.shelf[0].id)
  const [papers] = usePersistent<Record<string, Paper>>('papers', {})
  const [chefLog, setChefLog] = usePersistent<Message[]>('log:chef', [
    { from: 'momo', text: trade.greetings.chef },
  ])
  const [staffLog, setStaffLog] = usePersistent<Message[]>('log:staff', [
    { from: 'momo', text: trade.greetings.staff },
  ])

  const messages = role === 'chef' ? chefLog : staffLog
  const setMessages = role === 'chef' ? setChefLog : setStaffLog
  const item = findItem(trade.shelf, openId) ?? trade.shelf[0]

  return (
    <div className="frame">
      <div className="topbar">
        <div className="title">
          先輩店員 Momo<small>お店のマニュアルを、話すだけで</small>
        </div>
        <div className="roles" role="tablist">
          {ROLES.map((r) => (
            <button
              key={r.role}
              type="button"
              role="tab"
              aria-selected={role === r.role}
              className={role === r.role ? 'on' : ''}
              onClick={() => setRole(r.role)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="app">
        <Shelf shopName={trade.shopName} items={trade.shelf} openId={item.id} onOpen={setOpenId} />
        <Chat
          role={role}
          messages={messages}
          onSend={(text) => setMessages((log) => [...log, { from: role, text }])}
        />
        <PaperView role={role} item={item} paper={papers[item.id]} />
      </div>
    </div>
  )
}
