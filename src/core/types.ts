// Shared shapes for the core (any trade). A trade only supplies data in these shapes.

export type Role = 'chef' | 'staff'

export interface ShelfItem {
  id: string
  icon: string
  title: string
  note?: string
  // A view built from the other parts (the day's timetable), not a place to file work.
  timetable?: boolean
  // How things are made, not when (recipes): left off the timetable.
  untimed?: boolean
  // Facts shown one a line under a heading (レシピ: 配合 — 材料, 分量).
  list?: { title: string; label: string; text: string }
  // The daily hygiene record: staff record it here with Momo.
  record?: boolean
  // Staff can tick the part's work off for the day; the hygiene round of
  // that time sits among it, and Momo says "done" when all is ticked.
  checklist?: { record: HygieneTime; done: string }
  children?: ShelfItem[]
}

export const WEEKDAYS = ['月', '火', '水', '木', '金', '土', '日'] as const
export type Weekday = (typeof WEEKDAYS)[number]

export interface Tip {
  label: string
  text: string
}

export interface Step {
  text: string
  // Only a reason the chef gave; empty when none.
  why: string
  // Another shelf item this step leads to, or null.
  link: string | null
  // The chef stressed it ("don't forget", "people often get this wrong").
  remind?: boolean
  // One emoji picturing the action, shown big and cute to staff.
  icon?: string
  // The chef's photo of this step, shown in place of the icon.
  photo?: string
}

// A small group of steps inside one part of the day (e.g. "getting ready").
export interface Bundle {
  icon: string
  title: string
  // One line saying what the bundle is about, shown when it is folded.
  summary?: string
  // When it happens, in the chef's words ("4:30", "10時までに", "帰る前"), and
  // minutes from midnight to sort the timetable (-1 when only words are known).
  time?: string
  minutes?: number
  // Weekdays when it happens ("月", "木"); none means every day.
  days?: Weekday[]
  // Short facts newcomers look for, e.g. for an order: なに / どこへ / どうやって.
  facts?: Tip[]
  note: string
  // The chef's photo of the whole bundle (how it should look), on top.
  photo?: Photo
  steps: Step[]
  tips: Tip[]
}

// A photo kept on this device (see photos.ts), with a line saying what it shows.
export interface Photo {
  id: string
  caption: string
}

// What Momo writes for one shelf item.
export interface PaperBody {
  rules: string[]
  bundles: Bundle[]
}

export interface Paper extends PaperBody {
  history: string[]
}

export type Manual = Record<string, Paper>

export interface Message {
  from: 'momo' | Role
  text: string
  // Something the chef handed over: a memo, a file, a photo.
  attach?: Attachment
  // Who was speaking on the teaching side, as Momo understood it
  // ("シェフ", "店長（田中さん）", "マダム").
  speaker?: string
  // Where Momo put what she heard, shown under her reply.
  filed?: string
  // The first part of the shelf she wrote to, opened by "紙を見る".
  filedTo?: string
  // The steps Momo points to when she answers staff ("ここですよ").
  show?: Focus
}

export interface Focus {
  section: string
  bundle: string
  // 1-based step numbers.
  steps: number[]
}

export interface Trade {
  shopName: string
  shelf: ShelfItem[]
  greetings: Record<Role, string>
  hygiene: HygieneForm
  // Parts that start with something on the paper (from an official guide).
  seeds?: Record<string, PaperBody>
}

// The daily hygiene record, in the form a trade's official guide gives
// (for bakeries, the 日報型 記録様式). Questions are the guide's own words.
export type HygieneTime = 'morning' | 'lunch' | 'close'

export interface HygieneItem {
  id: string
  text: string
  // When Momo asks it; none when the shop keeps it elsewhere.
  when: HygieneTime[]
  // Shown in 特記事項 when kept elsewhere ("別のシートで管理").
  elsewhere?: string
  // Numbers to enter, each with its upper limit (℃).
  temps?: { id: string; label: string; max: number }[]
  // Done many times a day (toilet every hour): times are kept as it happens.
  hourly?: boolean
}

export interface HygieneGroup {
  title: string
  // A sub-heading inside the second half (アレルゲン対策 ...).
  part?: string
  items: HygieneItem[]
}

export interface HygieneForm {
  title: string
  groups: HygieneGroup[]
  source: string
  plan: HygienePlan
}

// The 衛生管理計画, as the guide's worked example: shops use it as it is,
// changing only what differs in their shop (marked "ours").
export interface HygienePlan {
  title: string
  source: string
  sections: { title: string; rows: HygienePlanRow[] }[]
}

export interface HygienePlanRow {
  point: string
  freq: string
  when: string
  // 実施事項 and 問題があった場合, side by side.
  pairs: [string, string][]
  // What this shop changed from the example.
  ours?: { freq?: string; when?: string; note?: string }
}

export interface HygieneAnswer {
  // true ◯, false ×, null 当てはまらない
  ok: boolean | null
  at: string
  memo?: string
  temps?: Record<string, number>
}

export interface HygieneDay {
  // Keyed by "itemId@time" (the same item may be asked twice a day).
  answers: Record<string, HygieneAnswer>
  hourly: Record<string, string[]>
  recorder?: string
  checkedBy?: string
}

// What the chef hands Momo with 📋 貼る or ✍️ 手書きを読む. The file itself is
// not kept; only its words are, so the conversation stays light.
export interface Attachment {
  kind: 'memo' | 'file' | 'photo'
  name?: string
  // A small picture of a photo, shown in the conversation.
  thumb?: string
  // The photo itself, kept on this device so it can go on the paper.
  photo?: string
  // The words in it: taken out on the screen, or as Momo read them.
  text: string
}
