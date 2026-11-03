// The relay. It holds the Claude key (Cloudflare secret) so the browser never sees it.

import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { z } from 'zod'
import { MOMO_CORE } from '../src/core/momo-prompt'
import { BAKERY_KNOWLEDGE } from '../src/trades/bakery/prompt'
import { bakery } from '../src/trades/bakery'
import type { MomoRequest, TalkResponse, WriteResponse } from '../src/core/api'
import { WEEKDAYS, type Focus } from '../src/core/types'

interface Env {
  ANTHROPIC_API_KEY?: string
  // Momo's voice (ElevenLabs). Both live only in the secrets, never in the repo.
  ELEVENLABS_API_KEY?: string
  MOMO_VOICE_ID?: string
}

const MODEL = 'claude-opus-5-5'
const SYSTEM = `${MOMO_CORE}\n\n${BAKERY_KNOWLEDGE}`

const MAX_MESSAGES = 80
const MAX_TEXT = 4000
const MAX_MANUAL = 100_000
const MAX_ASKS = 8
const FROM_STAFF = '【スタッフから】'

const SECTIONS = bakery.shelf.map((s) => s.id) as [string, ...string[]]
// Parts where work is filed; the timetable is built from them.
const FILED = bakery.shelf.filter((s) => !s.timetable).map((s) => s.id) as [string, ...string[]]
const SECTION_LIST = bakery.shelf
  .filter((s) => !s.timetable)
  .map((s) => `${s.id}：${s.icon} ${s.title}`)
  .join('\n')

const Talk = z.object({
  reply: z.string(),
  asks: z.array(z.string()),
  show: z.object({
    section: z.enum([...FILED, 'none']),
    bundle: z.string(),
    steps: z.array(z.number().int()),
  }),
})

const Write = z.object({
  updates: z.array(
    z.object({
      section: z.enum(FILED),
      note: z.string(),
      rules: z.array(z.string()),
      bundles: z.array(
        z.object({
          icon: z.string(),
          title: z.string(),
          summary: z.string(),
          time: z.string(),
          minutes: z.number().int(),
          days: z.array(z.enum(WEEKDAYS)),
          facts: z.array(z.object({ label: z.string(), text: z.string() })),
          note: z.string(),
          steps: z.array(
            z.object({
              text: z.string(),
              why: z.string(),
              link: z.string(),
              remind: z.boolean(),
              icon: z.string(),
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
    (b.step === 'talk' || (b.step === 'write' && b.role === 'chef')) &&
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

// Momo's last reply, if she has replied to anyone yet (the greeting on screen
// comes before any user turn and does not count).
function askedLastTime(req: MomoRequest): boolean {
  const firstUser = req.messages.findIndex((m) => m.from !== 'momo')
  const replies = req.messages.slice(firstUser + 1).filter((m) => m.from === 'momo')
  const last = replies[replies.length - 1]
  return !!last && /[？?]/.test(last.text)
}

function context(req: MomoRequest): string[] {
  const who = req.role === 'chef' ? 'シェフ' : 'スタッフ'
  return [
    'モモは画面のはじめに、もうあいさつと名乗りを済ませています。',
    `いまの日時（相手の端末）：${req.localTime}`,
    `いま話している相手：${who}`,
    `棚の場所（id：名前）：\n${SECTION_LIST}`,
    `いま画面で開いている場所：${req.openSection}`,
    `いまのマニュアル（場所ごと）：${JSON.stringify(req.manual)}`,
    `モモの心覚え：${JSON.stringify(req.asks)}`,
    '会話は最近のぶんだけです。それより前に聞いたことは、マニュアルに書いてあります。',
  ]
}

function conversation(req: MomoRequest): Anthropic.Beta.BetaMessageParam[] {
  const messages: Anthropic.Beta.BetaMessageParam[] = []
  for (const m of req.messages) {
    // Momo's greeting comes first on screen; the API needs a user turn first.
    if (messages.length === 0 && m.from === 'momo') continue
    messages.push({ role: m.from === 'momo' ? 'assistant' : 'user', content: m.text })
  }
  return messages
}

const SORRY = 'ごめんなさい、うまくお返事できませんでした。言い方を変えて、もう一度話してもらえますか？'

// Momo's reply only. Kept light so it comes back quickly.
async function talk(client: Anthropic, req: MomoRequest): Promise<TalkResponse> {
  const notes = [
    ...context(req),
    '今回は返事だけをします。紙はこのあと別に書くので、どこに書いたかは言いません。',
  ]
  if (req.role === 'chef' && askedLastTime(req)) {
    notes.push('前の返事で問いかけたので、今回は問いかけず、受け止めて返すだけにします。「？」もお願いも入れない。')
  }
  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 4000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low', format: betaZodOutputFormat(Talk) },
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [...conversation(req), { role: 'system', content: notes.join('\n') }],
  })
  const turn = response.parsed_output
  if (response.stop_reason === 'refusal' || !turn) return { reply: SORRY, asks: req.asks }
  // What staff asked and Momo could not answer is kept, quietly, for her
  // next talk with the chef. With the chef, the notes are kept by "write".
  if (req.role !== 'chef') {
    const fromStaff = turn.asks.filter((a) => a.startsWith(FROM_STAFF) && !req.asks.includes(a))
    return {
      reply: turn.reply,
      asks: [...req.asks, ...fromStaff].slice(-MAX_ASKS),
      show: pointTo(req, turn.show),
    }
  }
  return { reply: turn.reply, asks: req.asks }
}

// Keep only a pointer to steps that really exist in the manual the staff see.
function pointTo(req: MomoRequest, show: z.infer<typeof Talk>['show']): Focus | undefined {
  if (show.section === 'none') return undefined
  const bundle = req.manual[show.section]?.bundles.find((b) => b.title === show.bundle)
  if (!bundle) return undefined
  const steps = [...new Set(show.steps)].filter((n) => n >= 1 && n <= bundle.steps.length).sort((a, b) => a - b)
  return steps.length ? { section: show.section, bundle: bundle.title, steps } : undefined
}

// The paper, written after Momo has replied. Only the chef changes the manual.
async function write(client: Anthropic, req: MomoRequest): Promise<WriteResponse> {
  const notes = [
    ...context(req),
    '（ここからは、モモが紙を書く時間です。シェフへの返事はもう済んでいます。ここまでの会話をもとに、マニュアルと心覚えを書きます。）',
  ]
  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium', format: betaZodOutputFormat(Write) },
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
    // A system message cannot follow Momo's own reply, so the notes come as a user turn.
    messages: [...conversation(req), { role: 'user', content: notes.join('\n') }],
  })
  const turn = response.parsed_output
  if (response.stop_reason === 'refusal' || !turn) return { updates: [], filed: '', asks: req.asks }
  return {
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
    asks: turn.asks.slice(0, MAX_ASKS),
  }
}

async function momo(req: MomoRequest, apiKey: string) {
  const client = new Anthropic({ apiKey })
  return req.step === 'talk' ? talk(client, req) : write(client, req)
}

const MAX_SPOKEN = 1000
const KANA_COUNT = ['', 'ひとつ', 'ふたつ', 'みっつ', 'よっつ', 'いつつ', 'むっつ', 'ななつ', 'やっつ', 'ここのつ', 'とお']

// What Momo's voice reads: the bubble without kaomoji and emoji, and
// counts like 5つ in kana, which the voice reads without stumbling.
function spoken(text: string): string {
  return text
    .replace(/[(（]([^()（）]*)[)）]/g, (all, inner: string) =>
      /[\p{Script=Hiragana}\p{Script=Han}]/u.test(inner) ? all : '',
    )
    .replace(/\p{Extended_Pictographic}\uFE0F?/gu, '')
    .replace(/(?<![0-9０-９])(10|[1-9]|[１-９])つ/g, (_, n: string) => KANA_COUNT[Number(n.normalize('NFKC'))])
    .replace(/[ \t]+/g, ' ')
    .trim()
}

async function voice(request: Request, env: Env): Promise<Response> {
  if (!env.ELEVENLABS_API_KEY || !env.MOMO_VOICE_ID) {
    return Response.json({ error: 'not_configured' }, { status: 503 })
  }
  const body = (await request.json().catch(() => null)) as { text?: unknown } | null
  const text = typeof body?.text === 'string' ? spoken(body.text) : ''
  if (!text || text.length > MAX_SPOKEN) {
    return Response.json({ error: 'bad_request' }, { status: 400 })
  }
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(env.MOMO_VOICE_ID)}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'content-type': 'application/json' },
      // Reading directions in English: Japanese ones made the voice stumble.
      body: JSON.stringify({ text: `[warmly] ${text}`, model_id: 'eleven_v3', language_code: 'ja' }),
    },
  )
  if (!res.ok) {
    console.error('ElevenLabs error', res.status, await res.text().catch(() => ''))
    return Response.json({ error: res.status === 429 ? 'busy' : 'upstream' }, { status: res.status === 429 ? 429 : 502 })
  }
  return new Response(res.body, { headers: { 'content-type': 'audio/mpeg' } })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === '/api/voice' && request.method === 'POST') return voice(request, env)
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
