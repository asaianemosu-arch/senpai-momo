// The relay. It holds the Claude key (Cloudflare secret) so the browser never sees it.

import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { z } from 'zod'
import { MOMO_CORE } from '../src/core/momo-prompt'
import { BAKERY_KNOWLEDGE } from '../src/trades/bakery/prompt'
import type { MomoRequest, MomoResponse } from '../src/core/api'

interface Env {
  ANTHROPIC_API_KEY?: string
}

const MODEL = 'claude-opus-5-5'
const SYSTEM = `${MOMO_CORE}\n\n${BAKERY_KNOWLEDGE}`

const MAX_MESSAGES = 80
const MAX_TEXT = 4000

const Turn = z.object({
  reply: z.string(),
  paper: z.object({
    steps: z.array(z.string()),
    tips: z.array(z.object({ label: z.string(), text: z.string() })),
    asks: z.array(z.string()),
  }),
  paper_changed: z.boolean(),
  change_note: z.string(),
})

function isValid(body: unknown): body is MomoRequest {
  const b = body as MomoRequest
  return (
    !!b &&
    (b.role === 'chef' || b.role === 'staff') &&
    typeof b.sectionTitle === 'string' &&
    Array.isArray(b.messages) &&
    b.messages.length > 0 &&
    b.messages.length <= MAX_MESSAGES &&
    b.messages.every((m) => typeof m.text === 'string' && m.text.length <= MAX_TEXT) &&
    !!b.paper &&
    Array.isArray(b.paper.steps) &&
    Array.isArray(b.paper.tips) &&
    Array.isArray(b.paper.asks)
  )
}

function toApiMessages(req: MomoRequest): Anthropic.Beta.BetaMessageParam[] {
  const messages: Anthropic.Beta.BetaMessageParam[] = []
  for (const m of req.messages) {
    // Momo's greeting comes first on screen; the API needs a user turn first.
    if (messages.length === 0 && m.from === 'momo') continue
    messages.push({ role: m.from === 'momo' ? 'assistant' : 'user', content: m.text })
  }
  const who = req.role === 'chef' ? 'シェフ' : '新人さん'
  messages.push({
    role: 'system',
    content: `モモは画面のはじめに、もうあいさつと名乗りを済ませています。\nいま話している相手：${who}\nいま開いている紙：「${req.sectionTitle}」\nいまの紙の中身：${JSON.stringify(req.paper)}`,
  })
  return messages
}

async function momo(req: MomoRequest, apiKey: string): Promise<MomoResponse> {
  const client = new Anthropic({ apiKey })
  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium', format: betaZodOutputFormat(Turn) },
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: toApiMessages(req),
  })

  const turn = response.parsed_output
  if (response.stop_reason === 'refusal' || !turn) {
    return {
      reply: 'ごめんなさい、うまくお返事できませんでした。言い方を変えて、もう一度話してもらえますか？',
      paper: req.paper,
      changeNote: null,
    }
  }
  const changed = req.role === 'chef' && turn.paper_changed
  return {
    reply: turn.reply,
    paper: changed ? turn.paper : req.paper,
    changeNote: changed ? turn.change_note : null,
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname !== '/api/momo' || request.method !== 'POST') {
      return new Response('Not found', { status: 404 })
    }
    if (!env.ANTHROPIC_API_KEY) {
      return Response.json({ error: 'not_configured' }, { status: 503 })
    }
    const body = await request.json().catch(() => null)
    if (!isValid(body)) {
      return Response.json({ error: 'bad_request' }, { status: 400 })
    }
    try {
      return Response.json(await momo(body, env.ANTHROPIC_API_KEY))
    } catch (error) {
      if (error instanceof Anthropic.RateLimitError) {
        return Response.json({ error: 'busy' }, { status: 429 })
      }
      if (error instanceof Anthropic.APIError) {
        console.error('Claude API error', error.status, error.message)
        return Response.json({ error: 'upstream' }, { status: 502 })
      }
      throw error
    }
  },
} satisfies ExportedHandler<Env>
