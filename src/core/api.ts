import type { Focus, Message, PaperBody, Role } from './types'

// The shape of one turn between the screen and the relay (worker/index.ts).

// Momo answers first ("talk"), then writes the paper behind ("write", chef only),
// so the chef does not wait for the paper to read her reply.
export type MomoStep = 'talk' | 'write'

export interface MomoRequest {
  step: MomoStep
  role: Role
  localTime: string
  openSection: string
  manual: Record<string, PaperBody>
  asks: string[]
  messages: Message[]
  // A photo or PDF handed over with the last message, for Momo to read once.
  media?: Media
}

export type Media =
  | { type: 'image'; mediaType: 'image/jpeg' | 'image/png'; data: string }
  | { type: 'pdf'; data: string }

export interface PaperUpdate extends PaperBody {
  section: string
  note: string
}

export interface TalkResponse {
  reply: string
  asks: string[]
  // Staff only: where in the manual Momo points while answering.
  show?: Focus
  // What Momo read in a photo or PDF handed over this turn.
  read?: string
  // Who Momo understands is speaking now, on the teaching side.
  speaker?: string
}

export interface WriteResponse {
  updates: PaperUpdate[]
  filed: string
  asks: string[]
}

// 429: asked too often in a short while (or Claude is crowded); worth waiting a minute.
export class RelayError extends Error {
  constructor(readonly status: number) {
    super(`relay ${status}`)
  }
}

export async function askMomo(req: MomoRequest & { step: 'talk' }): Promise<TalkResponse>
export async function askMomo(req: MomoRequest & { step: 'write' }): Promise<WriteResponse>
export async function askMomo(req: MomoRequest): Promise<TalkResponse | WriteResponse> {
  const res = await fetch('/api/momo', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) throw new RelayError(res.status)
  return res.json()
}
