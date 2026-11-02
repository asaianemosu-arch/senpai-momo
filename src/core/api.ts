import type { Message, PaperBody, Role } from './types'

// The shape of one turn between the screen and the relay (worker/index.ts).

export interface MomoRequest {
  role: Role
  localTime: string
  openSection: string
  manual: Record<string, PaperBody>
  asks: string[]
  messages: Message[]
}

export interface PaperUpdate extends PaperBody {
  section: string
  note: string
}

export interface MomoResponse {
  reply: string
  updates: PaperUpdate[]
  filed: string
  asks: string[]
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
