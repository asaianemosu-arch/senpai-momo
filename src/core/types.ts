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

export interface Paper {
  steps: string[]
  tips: Tip[]
  asks: string[]
  history: string[]
}

export interface Message {
  from: 'momo' | Role
  text: string
}

export interface Trade {
  shopName: string
  shelf: ShelfItem[]
  greetings: Record<Role, string>
}
