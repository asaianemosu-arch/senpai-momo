// Shared shapes for the core (any trade). A trade only supplies data in these shapes.

export type Role = 'chef' | 'staff'

export interface ShelfItem {
  id: string
  icon: string
  title: string
  note?: string
  children?: ShelfItem[]
}

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
}

// A small group of steps inside one part of the day (e.g. "getting ready").
export interface Bundle {
  icon: string
  title: string
  // One line saying what the bundle is about, shown when it is folded.
  summary?: string
  note: string
  steps: Step[]
  tips: Tip[]
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
