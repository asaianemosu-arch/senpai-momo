// The relay. It holds the Claude key (Cloudflare secret) so the browser never sees it.

import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { z } from 'zod'
import { MOMO_CORE } from '../src/core/momo-prompt'
import { BAKERY_KNOWLEDGE } from '../src/trades/bakery/prompt'
import { bakery } from '../src/trades/bakery'
import type { MomoRequest, TalkResponse, WriteResponse } from '../src/core/api'
import { WEEKDAYS, type Attachment, type Focus } from '../src/core/types'

interface Env {
  ANTHROPIC_API_KEY?: string
  // Momo's voice (ElevenLabs). Both live only in the secrets, never in the repo.
  ELEVENLABS_API_KEY?: string
  MOMO_VOICE_ID?: string
  // Asks per person per minute (wrangler.jsonc).
  MOMO_LIMIT?: RateLimit
  WRITE_LIMIT?: RateLimit
  VOICE_LIMIT?: RateLimit
}

// One person is one connection; on the dev machine there is only one.
async function allowed(limit: RateLimit | undefined, request: Request): Promise<boolean> {
  if (!limit) return true
  const { success } = await limit.limit({ key: request.headers.get('cf-connecting-ip') ?? 'local' })
  return success
}

const BUSY = () => Response.json({ error: 'busy' }, { status: 429 })

const MODEL = 'claude-opus-5-5'
const SYSTEM = `${MOMO_CORE}\n\n${BAKERY_KNOWLEDGE}`

const MAX_MESSAGES = 80
const MAX_TEXT = 4000
// Words of a memo or file the chef handed over.
const MAX_HANDED = 30_000
// A photo or PDF, as base64 (about 10MB of file).
const MAX_MEDIA = 14_000_000
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
  read: z.string(),
  speaker: z.string(),
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
          photo: z.object({ id: z.string(), caption: z.string() }),
          steps: z.array(
            z.object({
              text: z.string(),
              why: z.string(),
              link: z.string(),
              remind: z.boolean(),
              icon: z.string(),
              photo: z.string(),
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
    b.messages.every(
      (m) =>
        typeof m.text === 'string' &&
        m.text.length <= MAX_TEXT &&
        (m.speaker === undefined || (typeof m.speaker === 'string' && m.speaker.length <= 40)) &&
        (m.attach === undefined || (typeof m.attach?.text === 'string' && m.attach.text.length <= MAX_HANDED)),
    ) &&
    (b.media === undefined || isMedia(b.media)) &&
    Array.isArray(b.asks) &&
    !!b.manual &&
    typeof b.manual === 'object' &&
    Object.values(b.manual).every((p) => Array.isArray(p?.rules) && Array.isArray(p?.bundles)) &&
    JSON.stringify(b.manual).length <= MAX_MANUAL
  )
}

function isMedia(m: MomoRequest['media']): boolean {
  if (!m || typeof m.data !== 'string' || m.data.length > MAX_MEDIA) return false
  return m.type === 'pdf' || (m.type === 'image' && (m.mediaType === 'image/jpeg' || m.mediaType === 'image/png'))
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

const HANDED: Record<Attachment['kind'], string> = {
  memo: '📋 貼ったメモ',
  file: '📄 ファイル',
  photo: '📷 写真',
}

// What the chef handed over, as words: the memo itself, or what Momo read.
function handed(a: Attachment): string {
  const id = a.photo ? `（写真の番号：${a.photo}）` : ''
  const head = `【シェフが渡したもの：${HANDED[a.kind]}${a.name ? `「${a.name}」` : ''}${id}】`
  return a.text ? `${head}\n${a.text}\n【ここまで】` : head
}

function conversation(req: MomoRequest): Anthropic.Beta.BetaMessageParam[] {
  const messages: Anthropic.Beta.BetaMessageParam[] = []
  const last = req.messages.length - 1
  req.messages.forEach((m, i) => {
    // Momo's greeting comes first on screen; the API needs a user turn first.
    if (messages.length === 0 && m.from === 'momo') return
    if (m.from === 'momo') return messages.push({ role: 'assistant', content: m.text })
    // Who spoke, as Momo understood it at the time, so she keeps track of changes.
    const who = req.role === 'chef' && m.speaker ? `【${m.speaker}】` : ''
    const words = who + [m.attach && handed(m.attach), m.text].filter(Boolean).join('\n')
    // A photo or PDF goes with the turn it was handed over in, once.
    if (i === last && req.media) {
      const media: Anthropic.Beta.BetaContentBlockParam =
        req.media.type === 'pdf'
          ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: req.media.data } }
          : { type: 'image', source: { type: 'base64', media_type: req.media.mediaType, data: req.media.data } }
      return messages.push({ role: 'user', content: [media, { type: 'text', text: words }] })
    }
    messages.push({ role: 'user', content: words })
  })
  return messages
}

const SORRY = 'ごめんなさい、うまくお返事できませんでした。言い方を変えて、もう一度話してもらえますか？'

// Momo's reply only. Kept light so it comes back quickly.
async function talk(client: Anthropic, req: MomoRequest): Promise<TalkResponse> {
  const notes = [
    ...context(req),
    '今回は返事だけをします。紙はこのあと別に書くので、どこに書いたかは言いません。',
  ]
  if (req.media) {
    notes.push(
      'シェフが写真か PDF を渡しました。read に、そこに書いてある文字をそのまま書き起こします（並びも、略語も、そのまま。読めないところは〔?〕）。文字がない写真なら、写っているものを短く書きます。',
    )
  }
  if (req.role === 'chef' && askedLastTime(req)) {
    notes.push('前の返事で問いかけたので、今回は問いかけず、受け止めて返すだけにします。「？」もお願いも入れない。')
  }
  const response = await client.beta.messages.parse({
    model: MODEL,
    // Reading a photo or PDF writes it all down, so it needs more room.
    max_tokens: req.media ? 16000 : 4000,
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
  return {
    reply: turn.reply,
    asks: req.asks,
    read: req.media ? turn.read.slice(0, MAX_HANDED) : undefined,
    speaker: turn.speaker.trim().slice(0, 40) || undefined,
  }
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
  // Only photos the chef really handed over, or already on the paper.
  const photos = new Set<string>()
  for (const m of req.messages) if (m.attach?.photo) photos.add(m.attach.photo)
  for (const p of Object.values(req.manual)) {
    for (const b of p.bundles) {
      if (b.photo) photos.add(b.photo.id)
      for (const st of b.steps) if (st.photo) photos.add(st.photo)
    }
  }
  return {
    updates: turn.updates.map((u) => ({
      ...u,
      bundles: u.bundles.map((b) => ({
        ...b,
        photo: photos.has(b.photo.id) ? b.photo : undefined,
        steps: b.steps.map((st) => ({
          ...st,
          link: SECTIONS.includes(st.link) && st.link !== u.section ? st.link : null,
          photo: photos.has(st.photo) ? st.photo : undefined,
        })),
      }))
        // A bundle with nothing in it is left off the paper.
        .filter((b) => b.steps.length || b.facts.length || b.note || b.photo),
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
      // No reading directions: without them she reads most clearly.
      body: JSON.stringify({ text, model_id: 'eleven_v3', language_code: 'ja' }),
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
    if (url.pathname === '/api/voice' && request.method === 'POST') {
      return (await allowed(env.VOICE_LIMIT, request)) ? voice(request, env) : BUSY()
    }
    if (url.pathname !== '/api/momo' || request.method !== 'POST') {
      return new Response('Not found', { status: 404 })
    }
    if (!env.ANTHROPIC_API_KEY) {
      return Response.json({ error: 'not_configured' }, { status: 503 })
    }
    const body = await request.json().catch(() => null)
    // Replies and papers are counted apart: a paper follows each reply, and
    // its own limit sits above what replies allow, so a reply never loses its paper.
    const write = isValid(body) && body.step === 'write'
    if (!(await allowed(write ? env.WRITE_LIMIT : env.MOMO_LIMIT, request))) return BUSY()
    if (!isValid(body)) {
      return Response.json({ error: 'bad_request' }, { status: 400 })
    }
    try {
      return Response.json(await momo(body, env.ANTHROPIC_API_KEY))
    } catch (error) {
      if (error instanceof Anthropic.RateLimitError) {
        return BUSY()
      }
      if (error instanceof Anthropic.APIError) {
        console.error('Claude API error', error.status, error.message)
        return Response.json({ error: 'upstream' }, { status: 502 })
      }
      throw error
    }
  },
} satisfies ExportedHandler<Env>
