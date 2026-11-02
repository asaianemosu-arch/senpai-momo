import { useState } from 'react'
import type { Manual, Message, PaperBody, Role, ShelfItem } from './core/types'
import { usePersistent } from './core/storage'
import { askMomo } from './core/api'
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

function titleOf(id: string) {
  const item = findItem(trade.shelf, id)
  return item ? `${item.icon} ${item.title}` : id
}

const SORRY = 'ごめんなさい、いまお返事ができませんでした。少しして、もう一度送ってもらえますか？'

function today() {
  const d = new Date()
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function now() {
  const d = new Date()
  const day = '日月火水木金土'[d.getDay()]
  const time = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${today()}（${day}）${time}`
}

const ROLES: { role: Role; label: string }[] = [
  { role: 'chef', label: '👨‍🍳 シェフ（教える）' },
  { role: 'staff', label: '🧑‍🍳 スタッフ（使う）' },
]

export function App() {
  const [role, setRole] = usePersistent<Role>('role', 'chef')
  const [openId, setOpenId] = usePersistent('open', trade.shelf[0].id)
  const [manual, setManual] = usePersistent<Manual>('manual', {})
  const [asks, setAsks] = usePersistent<string[]>('asks', [])
  const [waiting, setWaiting] = useState(false)
  const [chefLog, setChefLog] = usePersistent<Message[]>('log:chef', [
    { from: 'momo', text: trade.greetings.chef },
  ])
  const [staffLog, setStaffLog] = usePersistent<Message[]>('log:staff', [
    { from: 'momo', text: trade.greetings.staff },
  ])

  const messages = role === 'chef' ? chefLog : staffLog
  const setMessages = role === 'chef' ? setChefLog : setStaffLog
  const item = findItem(trade.shelf, openId) ?? trade.shelf[0]

  const contents: Record<string, string> = {}
  for (const [id, paper] of Object.entries(manual)) {
    contents[id] = paper.bundles.map((b) => b.title).join('・')
  }

  async function send(text: string) {
    const log: Message[] = [...messages, { from: role, text }]
    const bodies: Record<string, PaperBody> = {}
    for (const [id, paper] of Object.entries(manual)) {
      bodies[id] = { rules: paper.rules, bundles: paper.bundles }
    }
    setMessages(log)
    setWaiting(true)
    try {
      const res = await askMomo({
        role,
        localTime: now(),
        openSection: item.id,
        manual: bodies,
        asks,
        messages: log,
      })
      setMessages([...log, { from: 'momo', text: res.reply, filed: res.filed || undefined }])
      setAsks(res.asks)
      if (res.updates.length > 0) {
        setManual((all) => {
          const next = { ...all }
          for (const u of res.updates) {
            const history = [...(all[u.section]?.history ?? []), `${today()}　${u.note}`]
            next[u.section] = { rules: u.rules, bundles: u.bundles, history }
          }
          return next
        })
      }
    } catch {
      setMessages([...log, { from: 'momo', text: SORRY }])
    } finally {
      setWaiting(false)
    }
  }

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
        <Shelf
          shopName={trade.shopName}
          items={trade.shelf}
          contents={contents}
          openId={item.id}
          onOpen={setOpenId}
        />
        <Chat role={role} messages={messages} waiting={waiting} onSend={send} />
        <PaperView
          role={role}
          item={item}
          paper={manual[item.id]}
          titleOf={titleOf}
          onOpen={setOpenId}
        />
      </div>
    </div>
  )
}
