import { useEffect, useRef, useState } from 'react'
import type { Bundle, Focus, HygieneDay, HygieneTime, Manual, Message, Paper, PaperBody, Role, ShelfItem } from './core/types'
import { usePersistent } from './core/storage'
import { loadSample, startBlank } from './core/sample'
import { RelayError, askMomo } from './core/api'
import type { Handed } from './core/files'
import { Shelf } from './core/Shelf'
import { Chat } from './core/Chat'
import { PaperView } from './core/PaperView'
import { StaffPaper } from './core/StaffPaper'
import { ShowCard } from './core/ShowCard'
import { Timetable } from './core/Timetable'
import { Splash } from './core/Splash'
import { Review, changesSince } from './core/Review'
import { useNarrow } from './core/useNarrow'
import { EMPTY_DAY, HygieneRecorder, HygieneSheet, dayKey, roundDone } from './core/Hygiene'
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

const TIMETABLE = trade.shelf.find((s) => s.timetable)?.id ?? ''
// Where work filed in the old "1日の流れ" part goes: the part for the working day.
const DAYTIME = 'service'

// The chef keeps talking in one long conversation. Momo only needs the
// recent part: what came before already lives in the paper and her notes.
const RECENT = 40

const SORRY = 'ごめんなさい、いまお返事ができませんでした。少しして、もう一度送ってもらえますか？'
const BREATHE = 'たくさんお話ししてくれて、ありがとうございます！ 少しだけ息つぎさせてください。1分ほどしたら、もう一度送ってもらえますか？'

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

// What a bundle says, leaving out what Momo may restate without changing
// anything (icons, the folded one-liner, empty fields).
function gist(b: Bundle): string {
  return JSON.stringify([
    b.time || '',
    b.days ?? [],
    (b.facts ?? []).map((f) => [f.label, f.text]),
    b.note || '',
    b.photo?.id ?? '',
    b.steps.map((s) => [s.text, s.why || '', !!s.remind, s.photo ?? '']),
    b.tips.map((t) => [t.label, t.text]),
  ])
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
  const [reviewing, setReviewing] = useState(false)
  // What Momo just wrote and the chef has not looked at yet: per part of the
  // shelf, each bundle new or fixed. The part glows and the bundles are tagged.
  const [fresh, setFresh] = usePersistent<Record<string, Record<string, 'new' | 'fix'>>>('fresh', {})
  // Bumped each time Momo writes, so the glow plays again.
  const [pulse, setPulse] = useState(0)
  const [waiting, setWaiting] = useState(false)
  const [writingCount, setWritingCount] = useState(0)
  // The steps Momo last pointed to for staff; that bundle opens on their paper.
  const [focus, setFocus] = useState<Focus | null>(null)
  // Momo is drawn in light in the middle of the screen when the app opens.
  const [splash, setSplash] = useState(true)
  const writing = useRef(Promise.resolve())
  const narrow = useNarrow()
  const [shelfOpen, setShelfOpen] = useState(false)
  const [paperOpen, setPaperOpen] = useState(false)
  const [chefLog, setChefLog] = usePersistent<Message[]>('log:chef', [
    { from: 'momo', text: trade.greetings.chef },
  ])
  // The daily hygiene record, day by day ("2026-11-04").
  const [hygiene, setHygiene] = usePersistent<Record<string, HygieneDay>>('hygiene', {})
  // ☑️ What staff ticked off today, by part. Only today is kept.
  // Who the chef side says is speaking now (お話し中 ▾), until they speak.
  const [picked, setPicked] = useState<string | null>(null)
  // The hygiene round a checklist sent staff to record.
  const [round, setRound] = useState<HygieneTime | undefined>(undefined)
  const [checks, setChecks] = usePersistent<{ date: string; done: Record<string, string[]> }>('checks', { date: '', done: {} })
  const [staffLog, setStaffLog] = usePersistent<Message[]>('log:staff', [
    { from: 'momo', text: trade.greetings.staff },
  ])

  // The timetable used to be a part of its own; work filed there moves to
  // the part where it happens during the day.
  useEffect(() => {
    function move<T extends PaperBody>(all: Record<string, T>, empty: T): Record<string, T> {
      const moved = all[TIMETABLE]?.bundles ?? []
      if (moved.length === 0) return all
      const into = all[DAYTIME] ?? empty
      const next: Record<string, T> = { ...all, [DAYTIME]: { ...into, bundles: [...into.bundles, ...moved] } }
      delete next[TIMETABLE]
      return next
    }
    setManual((all) => move<Paper>(all, { rules: [], bundles: [], history: [] }))
    setPublished((all) => move<PaperBody>(all, { rules: [], bundles: [] }))
    // Parts that start from an official guide get their first paper once.
    setManual((all) => {
      const next = { ...all }
      for (const [id, body] of Object.entries(trade.seeds ?? {})) {
        if (!next[id]) next[id] = { ...body, history: [`${today()}　手引書の手順書例を入れました`] }
      }
      return next
    })
  }, [])

  // Paper writing runs after the reply; it reads the newest manual from here.
  const latest = useRef({ manual, asks })
  latest.current = { manual, asks }

  // Marks go once the chef has looked: when leaving the part that was open.
  const wasOpen = useRef(openId)
  useEffect(() => {
    const left = wasOpen.current
    wasOpen.current = openId
    if (left !== openId && fresh[left]) {
      setFresh((all) => {
        const next = { ...all }
        delete next[left]
        return next
      })
    }
  }, [openId])

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

  async function send(text: string, handed?: Handed) {
    // Until Momo replies, the words are taken as said by whoever spoke last.
    // A speaker chosen on screen wins; otherwise, whoever spoke last.
    const before = role === 'chef' ? (picked ?? [...messages].reverse().find((m) => m.from === 'chef' && m.speaker)?.speaker) : undefined
    const said: Message = {
      from: role,
      text,
      ...(handed && { attach: handed.attach }),
      ...(before && { speaker: before }),
      ...(role === 'chef' && picked && { picked: true }),
    }
    setPicked(null)
    let log: Message[] = [...messages, said]
    const ask = { role, localTime: now(), openSection: item.id }
    setMessages(log)
    setWaiting(true)
    let after: Message[]
    try {
      const res = await askMomo({
        ...ask,
        step: 'talk',
        manual: shown,
        asks,
        messages: log.slice(-RECENT),
        media: handed?.media,
      })
      // A photo or PDF is kept as the words Momo read in it, and the words
      // as said by whoever Momo understood was speaking.
      const last = log.length - 1
      if (handed?.media && res.read) {
        const attach = { ...handed.attach, text: res.read }
        log = log.map((m, i) => (i === last ? { ...m, attach } : m))
      }
      if (role === 'chef' && res.speaker && !said.picked) {
        log = log.map((m, i) => (i === last ? { ...m, speaker: res.speaker } : m))
      }
      after = [...log, { from: 'momo', text: res.reply, show: res.show }]
      setMessages(after)
      if (role === 'staff') {
        setAsks(res.asks)
        if (res.show) {
          setFocus(res.show)
          if (!narrow) setOpenId(res.show.section)
        }
      }
    } catch (e) {
      setMessages([...log, { from: 'momo', text: e instanceof RelayError && e.status === 429 ? BREATHE : SORRY }])
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
      const before = latest.current.manual
      setFresh((all) => {
        const next = { ...all }
        for (const u of res.updates) {
          const marks = { ...(next[u.section] ?? {}) }
          const old = before[u.section]?.bundles ?? []
          for (const b of u.bundles) {
            const was = old.find((o) => o.title === b.title)
            if (!was) marks[b.title] = 'new'
            else if (gist(was) !== gist(b) && marks[b.title] !== 'new') marks[b.title] = 'fix'
          }
          if (Object.keys(marks).length) next[u.section] = marks
        }
        return next
      })
      setPulse((n) => n + 1)
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
          onClick={() => setRole(r.role)}
        >
          {r.icon}
          {!narrow && ` ${r.label}`}
        </button>
      ))}
    </div>
  )

  // How many bundles in each part are new or fixed, for the chef.
  const freshCount: Record<string, number> = {}
  if (role === 'chef') for (const [id, marks] of Object.entries(fresh)) freshCount[id] = Object.keys(marks).length
  const freshTotal = Object.values(freshCount).reduce((a, b) => a + b, 0)

  const shelf = (
    <Shelf
      shopName={trade.shopName}
      items={trade.shelf}
      contents={contents}
      fresh={freshCount}
      pulse={pulse}
      openId={item.id}
      onRestart={async (to) => {
        if (to === 'sample') await loadSample()
        else startBlank()
        location.reload()
      }}
      onOpen={(id) => {
        setOpenId(id)
        setRound(undefined)
        if (narrow) {
          setShelfOpen(false)
          // Staff record hygiene in the middle; the sheet opens from there.
          if (!(role === 'staff' && findItem(trade.shelf, id)?.record)) setPaperOpen(true)
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
      picked={picked}
      onPick={setPicked}
      cardFor={(m) => {
        if (role !== 'staff' || !m.show) return null
        const bundle = published[m.show.section]?.bundles.find((b) => b.title === m.show!.bundle)
        if (!bundle || m.show.steps.some((n) => !bundle.steps[n - 1])) return null
        return <ShowCard focus={m.show} where={titleOf(m.show.section)} bundle={bundle} />
      }}
      onSend={send}
      places={trade.shelf.map((s) => ({ id: s.id, title: s.title }))}
      onOpenPlace={(id) => {
        setOpenId(id)
        if (narrow) setPaperOpen(true)
      }}
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

  const dateKey = dayKey()
  const day = hygiene[dateKey] ?? EMPTY_DAY
  const ticked = checks.date === dateKey ? checks.done : {}
  const recording = role === 'staff' && !!item.record
  const center = recording ? (
    <HygieneRecorder
      key={round}
      start={round}
      form={trade.hygiene}
      day={day}
      onChange={(next) => setHygiene((all) => ({ ...all, [dateKey]: next }))}
      onShowSheet={narrow ? () => setPaperOpen(true) : undefined}
    />
  ) : (
    chat
  )

  const paper = item.timetable ? (
    <Timetable
      item={item}
      shelf={trade.shelf}
      manual={shown}
      onPick={(section, bundle) => {
        setOpenId(section)
        if (role === 'staff') setFocus({ section, bundle, steps: [] })
      }}
      onClose={narrow ? () => setPaperOpen(false) : undefined}
    />
  ) : role === 'staff' ? (
    <StaffPaper
      key={item.id}
      item={item}
      paper={published[item.id]}
      focus={focus}
      titleOf={titleOf}
      onOpen={setOpenId}
      onClose={narrow ? () => setPaperOpen(false) : undefined}
      checks={
        item.checklist && {
          done: ticked[item.id] ?? [],
          onToggle: (title) =>
            setChecks((all) => {
              const done = all.date === dateKey ? all.done : {}
              const mine = done[item.id] ?? []
              return {
                date: dateKey,
                done: { ...done, [item.id]: mine.includes(title) ? mine.filter((t) => t !== title) : [...mine, title] },
              }
            }),
          recordDone: roundDone(trade.hygiene, day, item.checklist.record),
          onRecord: () => {
            const record = trade.shelf.find((s) => s.record)
            setRound(item.checklist!.record)
            if (record) setOpenId(record.id)
            if (narrow) setPaperOpen(false)
          },
        }
      }
    />
  ) : (
    <PaperView
      role={role}
      item={item}
      paper={role === 'chef' ? manual[item.id] : published[item.id] && { ...published[item.id], history: [] }}
      onPublish={() => setReviewing(true)}
      onChange={(body, note) => edit(item.id, body, note)}
      titleOf={titleOf}
      onOpen={setOpenId}
      onClose={narrow ? () => setPaperOpen(false) : undefined}
      fresh={role === 'chef' ? fresh[item.id] : undefined}
      busy={role === 'chef' && writingCount > 0}
    />
  )

  // The hygiene record sits on top of what Momo wrote there (what to do when
  // a temperature is off, and so on).
  const lastSpeaker = [...chefLog].reverse().find((m) => m.from === 'chef' && m.speaker)?.speaker
  const paperView = item.record ? (
    <div className={narrow ? 'page-stack sheet-page' : 'page-stack'}>
      <HygieneSheet
        form={trade.hygiene}
        date={dateKey}
        day={day}
        onCheck={
          role === 'chef' ? () => setHygiene((all) => ({ ...all, [dateKey]: { ...day, checkedBy: lastSpeaker ?? 'シェフ' } })) : undefined
        }
        onClose={narrow ? () => setPaperOpen(false) : undefined}
      />
      {paper}
    </div>
  ) : (
    paper
  )

  return (
    <div className={['frame', narrow && 'narrow', splash && 'splashing'].filter(Boolean).join(' ')}>
      {narrow ? (
        <>
          <div className="mbar">
            <button type="button" className="icon-btn" aria-label="お店のマニュアル" onClick={() => setShelfOpen(true)}>
              📚
              {freshTotal > 0 && (
                <span key={pulse} className="badge">
                  ＋{freshTotal}
                </span>
              )}
            </button>
            <div className="mbar-momo">
              <img src={momoUrl} alt="" className="light-target" />
              <div>
                <b>先輩店員 Momo</b>
                <small>{trade.shopName}</small>
              </div>
            </div>
            {roles}
          </div>
          {center}
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
            {center}
            {paperView}
          </div>
        </>
      )}

      {splash && <Splash src={momoUrl} onEnd={() => setSplash(false)} />}

      {reviewing && (
        <Review
          pages={changesSince(trade.shelf, bodies, published)}
          onFix={(id) => {
            setReviewing(false)
            setOpenId(id)
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
