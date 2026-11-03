// Shared shapes for the core (any trade). A trade only supplies data in these shapes.

export type Role = 'chef' | 'staff'

export interface ShelfItem {
  id: string
  icon: string
  title: string
  note?: string
  // A view built from the other parts (the day's timetable), not a place to file work.
  timetable?: boolean
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
