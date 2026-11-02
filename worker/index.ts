// The relay. It holds the Claude key (Cloudflare secret) so the browser never sees it.

import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { z } from 'zod'
import { MOMO_CORE } from '../src/core/momo-prompt'
import { BAKERY_KNOWLEDGE } from '../src/trades/bakery/prompt'
import { bakery } from '../src/trades/bakery'
import type { MomoRequest, MomoResponse } from '../src/core/api'

interface Env {
  ANTHROPIC_API_KEY?: string
}

const MODEL = 'claude-opus-5-5'
const SYSTEM = `${MOMO_CORE}\n\n${BAKERY_KNOWLEDGE}`

const MAX_MESSAGES = 80
const MAX_TEXT = 4000
const MAX_MANUAL = 100_000

const SECTIONS = bakery.shelf.map((s) => s.id) as [string, ...string[]]
const SECTION_LIST = bakery.shelf.map((s) => `${s.id}：${s.icon} ${s.title}`).join('\n')

const Turn = z.object({
  reply: z.string(),
  updates: z.array(
    z.object({
      section: z.enum(SECTIONS),
      note: z.string(),
      rules: z.array(z.string()),
      bundles: z.array(
        z.object({
          icon: z.string(),
          title: z.string(),
          note: z.string(),
          steps: z.array(
            z.object({
              text: z.string(),
              why: z.string(),
              link: z.string(),
              remind: z.boolean(),
            }),
          ),
          tips: z.array(z.object({ label: z.string(), text: z.string() })),
        }),
      ),
    }),
  ),
  filed: z.string(),
  asks: z.array(z.string()),
})

function isValid(body: unknown): body is MomoRequest {
  const b = body as MomoRequest
  return (
    !!b &&
    (b.role === 'chef' || b.role === 'staff') &&
    typeof b.localTime === 'string' &&
    b.localTime.length <= 40 &&
    SECTIONS.includes(b.openSection) &&
    Array.isArray(b.messages) &&
    b.messages.length > 0 &&
    b.messages.length <= MAX_MESSAGES &&
    b.messages.every((m) => typeof m.text === 'string' && m.text.length <= MAX_TEXT) &&
    Array.isArray(b.asks) &&
    !!b.manual &&
    typeof b.manual === 'object' &&
    Object.values(b.manual).every((p) => Array.isArray(p?.rules) && Array.isArray(p?.bundles)) &&
    JSON.stringify(b.manual).length <= MAX_MANUAL
  )
}

// The greeting on screen is not counted: it is not a reply to the chef.
function askedLastTime(req: MomoRequest): boolean {
  const replies = req.messages.slice(1).filter((m) => m.from === 'momo')
  const last = replies[replies.length - 1]
  return !!last && /[？?]/.test(last.text)
}

function toApiMessages(req: MomoRequest): Anthropic.Beta.BetaMessageParam[] {
  const messages: Anthropic.Beta.BetaMessageParam[] = []
  for (const m of req.messages) {
    // Momo's greeting comes first on screen; the API needs a user turn first.
    if (messages.length === 0 && m.from === 'momo') continue
    messages.push({ role: m.from === 'momo' ? 'assistant' : 'user', content: m.text })
  }
  const who = req.role === 'chef' ? 'シェフ' : '新人さん'
  const notes = [
    'モモは画面のはじめに、もうあいさつと名乗りを済ませています。',
    `いまの日時（相手の端末）：${req.localTime}`,
    `いま話している相手：${who}`,
    `棚の場所（id：名前）：\n${SECTION_LIST}`,
    `いま画面で開いている場所：${req.openSection}`,
    `いまのマニュアル（場所ごと）：${JSON.stringify(req.manual)}`,
    `モモの心覚え：${JSON.stringify(req.asks)}`,
  ]
  if (req.role === 'chef' && askedLastTime(req)) {
    notes.push('前の返事で問いかけたので、今回は問いかけず、受け止めて返すだけにします。「？」もお願いも入れない。')
  }
  messages.push({ role: 'system', content: notes.join('\n') })
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
      updates: [],
      filed: '',
      asks: req.asks,
    }
  }
  // Only the chef changes the manual; staff only read it.
  if (req.role !== 'chef') {
    return { reply: turn.reply, updates: [], filed: '', asks: req.asks }
  }
  return {
    reply: turn.reply,
    updates: turn.updates.map((u) => ({
      ...u,
      bundles: u.bundles.map((b) => ({
        ...b,
        steps: b.steps.map((st) => ({
          ...st,
          link: SECTIONS.includes(st.link) && st.link !== u.section ? st.link : null,
        })),
      })),
    })),
    filed: turn.filed,
    asks: turn.asks.slice(0, 3),
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
