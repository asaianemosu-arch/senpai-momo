import type { Message, Paper, Role } from './types'

// The shape of one turn between the screen and the relay (worker/index.ts).

export interface MomoRequest {
  role: Role
  sectionTitle: string
  paper: Omit<Paper, 'history'>
  messages: Message[]
}

export interface MomoResponse {
  reply: string
  paper: Omit<Paper, 'history'>
  changeNote: string | null
}

export async function askMomo(req: MomoRequest): Promise<MomoResponse> {
  const res = await fetch('/api/momo', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) throw new Error(`relay ${res.status}`)
  return res.json()
}
