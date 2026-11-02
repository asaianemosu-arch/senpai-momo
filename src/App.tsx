import { useRef, useState } from 'react'
import type { Focus, Manual, Message, PaperBody, Role, ShelfItem } from './core/types'
import { usePersistent } from './core/storage'
import { askMomo } from './core/api'
import { Shelf } from './core/Shelf'
import { Chat } from './core/Chat'
import { PaperView } from './core/PaperView'
import { StaffPaper } from './core/StaffPaper'
import { ShowCard } from './core/ShowCard'
import { Review, changesSince } from './core/Review'
import { useNarrow } from './core/useNarrow'
import momoUrl from '../assets/momo/01.png'
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

// The chef keeps talking in one long conversation. Momo only needs the
// recent part: what came before already lives in the paper and her notes.
const RECENT = 40

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

const ROLES: { role: Role; icon: string; label: string }[] = [
  { role: 'chef', icon: '🧑‍🍳', label: 'シェフ（教える）' },
  { role: 'staff', icon: '🙋', label: 'スタッフ（聞く）' },
]

export function App() {
  const [role, setRole] = usePersistent<Role>('role', 'chef')
  const [openId, setOpenId] = usePersistent('open', trade.shelf[0].id)
  const [manual, setManual] = usePersistent<Manual>('manual', {})
  const [asks, setAsks] = usePersistent<string[]>('asks', [])
  // The version last handed out to the staff; they only ever see this.
  const [published, setPublished] = usePersistent<Record<string, PaperBody>>('published', {})
  const [editing, setEditing] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [waiting, setWaiting] = useState(false)
  const [writingCount, setWritingCount] = useState(0)
  // The steps Momo last pointed to for staff; that bundle opens on their paper.
  const [focus, setFocus] = useState<Focus | null>(null)
  const writing = useRef(Promise.resolve())
  const narrow = useNarrow()
  const [shelfOpen, setShelfOpen] = useState(false)
  const [paperOpen, setPaperOpen] = useState(false)
  const [chefLog, setChefLog] = usePersistent<Message[]>('log:chef', [
    { from: 'momo', text: trade.greetings.chef },
  ])
  const [staffLog, setStaffLog] = usePersistent<Message[]>('log:staff', [
    { from: 'momo', text: trade.greetings.staff },
  ])

  // Paper writing runs after the reply; it reads the newest manual from here.
  const latest = useRef({ manual, asks })
  latest.current = { manual, asks }

  const messages = role === 'chef' ? chefLog : staffLog
  const setMessages = role === 'chef' ? setChefLog : setStaffLog
  const item = findItem(trade.shelf, openId) ?? trade.shelf[0]

  const bodies: Record<string, PaperBody> = {}
  for (const [id, paper] of Object.entries(manual)) {
    bodies[id] = { rules: paper.rules, bundles: paper.bundles }
  }
  // The chef works on the draft; the staff read what was handed out.
  const shown = role === 'chef' ? bodies : published

  const contents: Record<string, string> = {}
  for (const [id, body] of Object.entries(shown)) {
    contents[id] = body.bundles.map((b) => b.title).join('・')
  }

  function edit(id: string, body: PaperBody, note: string) {
    setManual((all) => {
      const history = all[id]?.history ?? []
      const line = `${today()}　${note}`
      // Several small fixes in a row to the same bundle are one entry.
      const next = history[history.length - 1] === line ? history : [...history, line]
      return { ...all, [id]: { ...body, history: next } }
    })
  }

  async function send(text: string) {
    const log: Message[] = [...messages, { from: role, text }]
    const ask = { role, localTime: now(), openSection: item.id }
    setMessages(log)
    setWaiting(true)
    let after: Message[]
    try {
      const res = await askMomo({ ...ask, step: 'talk', manual: shown, asks, messages: log.slice(-RECENT) })
      after = [...log, { from: 'momo', text: res.reply, show: res.show }]
      setMessages(after)
      if (role === 'staff') {
        setAsks(res.asks)
        if (res.show) {
          setFocus(res.show)
          if (!narrow) setOpenId(res.show.section)
        }
      }
    } catch {
      setMessages([...log, { from: 'momo', text: SORRY }])
      return
    } finally {
      setWaiting(false)
    }
    // The chef reads Momo's reply right away; the paper is written behind,
    // one at a time, each on top of the latest manual.
    if (role === 'chef') {
      const at = after.length - 1
      writing.current = writing.current.then(() => writePaper(ask, after, at))
    }
  }

  async function writePaper(ask: { role: Role; localTime: string; openSection: string }, log: Message[], at: number) {
    setWritingCount((n) => n + 1)
    try {
      const current: Record<string, PaperBody> = {}
      for (const [id, paper] of Object.entries(latest.current.manual)) {
        current[id] = { rules: paper.rules, bundles: paper.bundles }
      }
      const res = await askMomo({
        ...ask,
        step: 'write',
        manual: current,
        asks: latest.current.asks,
        messages: log.slice(-RECENT),
      })
      setAsks(res.asks)
      if (res.updates.length === 0) return
      setManual((all) => {
        const next = { ...all }
        for (const u of res.updates) {
          const history = [...(all[u.section]?.history ?? []), `${today()}　${u.note}`]
          next[u.section] = { rules: u.rules, bundles: u.bundles, history }
        }
        return next
      })
      if (res.filed) {
        const filed = { filed: res.filed, filedTo: res.updates[0]?.section }
        setChefLog((all) => all.map((m, i) => (i === at && m.from === 'momo' ? { ...m, ...filed } : m)))
      }
    } catch {
      // The reply is already there; a missed paper is written with the next one.
    } finally {
      setWritingCount((n) => n - 1)
    }
  }

  const roles = (
    <div className="roles" role="tablist">
      {ROLES.map((r) => (
        <button
          key={r.role}
          type="button"
          role="tab"
          aria-selected={role === r.role}
          aria-label={r.label}
          className={role === r.role ? 'on' : ''}
          onClick={() => {
            setEditing(false)
            setRole(r.role)
          }}
        >
          {r.icon}
          {!narrow && ` ${r.label}`}
        </button>
      ))}
    </div>
  )

  const shelf = (
    <Shelf
      shopName={trade.shopName}
      items={trade.shelf}
      contents={contents}
      openId={item.id}
      onOpen={(id) => {
        setOpenId(id)
        if (narrow) {
          setShelfOpen(false)
          setPaperOpen(true)
        }
      }}
    />
  )

  const chat = (
    <Chat
      role={role}
      messages={messages}
      waiting={waiting}
      writing={role === 'chef' && writingCount > 0}
      cardFor={(m) => {
        if (role !== 'staff' || !m.show) return null
        const bundle = published[m.show.section]?.bundles.find((b) => b.title === m.show!.bundle)
        if (!bundle || m.show.steps.some((n) => !bundle.steps[n - 1])) return null
        return <ShowCard focus={m.show} where={titleOf(m.show.section)} bundle={bundle} />
      }}
      onSend={send}
      onShowPaper={
        narrow
          ? (id) => {
              if (id) setOpenId(id)
              setPaperOpen(true)
            }
          : undefined
      }
    />
  )

  const paperView = role === 'staff' ? (
    <StaffPaper
      item={item}
      paper={published[item.id]}
      focus={focus}
      titleOf={titleOf}
      onOpen={setOpenId}
      onClose={narrow ? () => setPaperOpen(false) : undefined}
    />
  ) : (
    <PaperView
      role={role}
      item={item}
      paper={role === 'chef' ? manual[item.id] : published[item.id] && { ...published[item.id], history: [] }}
      editing={role === 'chef' && editing}
      onToggleEdit={() => setEditing(!editing)}
      onPublish={() => {
        setEditing(false)
        setReviewing(true)
      }}
      onChange={(body, note) => edit(item.id, body, note)}
      titleOf={titleOf}
      onOpen={setOpenId}
      onClose={narrow ? () => setPaperOpen(false) : undefined}
    />
  )

  return (
    <div className={narrow ? 'frame narrow' : 'frame'}>
      {narrow ? (
        <>
          <div className="mbar">
            <button type="button" className="icon-btn" aria-label="お店のマニュアル" onClick={() => setShelfOpen(true)}>
              📚
            </button>
            <div className="mbar-momo">
              <img src={momoUrl} alt="" />
              <div>
                <b>先輩店員 Momo</b>
                <small>{trade.shopName}</small>
              </div>
            </div>
            {roles}
          </div>
          {chat}
          {shelfOpen && (
            <>
              <div className="dim" onClick={() => setShelfOpen(false)} />
              <div className="drawer">{shelf}</div>
            </>
          )}
          {paperOpen && (
            <>
              <div className="dim" onClick={() => setPaperOpen(false)} />
              <div className="sheet">{paperView}</div>
            </>
          )}
        </>
      ) : (
        <>
          <div className="topbar">
            <div className="title">
              先輩店員 Momo<small>お店のマニュアルを、話すだけで</small>
            </div>
            {roles}
          </div>
          <div className="app">
            {shelf}
            {chat}
            {paperView}
          </div>
        </>
      )}

      {reviewing && (
        <Review
          pages={changesSince(trade.shelf, bodies, published)}
          onFix={(id) => {
            setReviewing(false)
            setOpenId(id)
            setEditing(true)
            if (narrow) setPaperOpen(true)
          }}
          onPublish={() => {
            setPublished(bodies)
            setReviewing(false)
          }}
          onClose={() => setReviewing(false)}
        />
      )}
    </div>
  )
}
