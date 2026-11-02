import { useState } from 'react'
import type { Message, Paper, Role, ShelfItem } from './core/types'
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

const EMPTY_PAPER: Paper = { steps: [], tips: [], asks: [], history: [] }

const SORRY = 'ごめんなさい、いまお返事ができませんでした。少しして、もう一度送ってもらえますか？'

function today() {
  const d = new Date()
  return `${d.getMonth() + 1}/${d.getDate()}`
}

const ROLES:{ role: Role; label: string }[] = [
  { role: 'chef', label: '👨‍🍳 シェフ（教える）' },
  { role: 'staff', label: '🧑‍🍳 スタッフ（使う）' },
]

export function App() {
  const [role, setRole] = usePersistent<Role>('role', 'chef')
  const [openId, setOpenId] = usePersistent('open', trade.shelf[0].id)
  const [papers, setPapers] = usePersistent<Record<string, Paper>>('papers', {})
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

  async function send(text: string) {
    const log: Message[] = [...messages, { from: role, text }]
    const paper = papers[item.id] ?? EMPTY_PAPER
    setMessages(log)
    setWaiting(true)
    try {
      const res = await askMomo({
        role,
        sectionTitle: item.title,
        paper: { steps: paper.steps, tips: paper.tips, asks: paper.asks },
        messages: log,
      })
      setMessages([...log, { from: 'momo', text: res.reply }])
      if (res.changeNote) {
        const note = `${today()}　${res.changeNote}`
        setPapers((all) => ({
          ...all,
          [item.id]: { ...res.paper, history: [...(all[item.id]?.history ?? []), note] },
        }))
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
        <Shelf shopName={trade.shopName} items={trade.shelf} openId={item.id} onOpen={setOpenId} />
        <Chat
          role={role}
          messages={messages}
          waiting={waiting}
          onSend={send}
        />
        <PaperView role={role} item={item} paper={papers[item.id]} />
      </div>
    </div>
  )
}
