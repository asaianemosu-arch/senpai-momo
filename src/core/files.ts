import type { Media } from './api'
import type { Attachment } from './types'

// Turning what the chef hands over into something Momo can read.
// Words come out here on the screen (text, Word, Excel); photos and PDFs go
// to Momo as they are, and she writes down what she read.

export interface Handed {
  attach: Attachment
  media?: Media
}

// Shown to the chef when a file cannot be read; the message says what to do.
export class CannotRead extends Error {}

const MAX_WORDS = 30_000
const MAX_PDF = 10 * 1024 * 1024
const PHOTO_EDGE = 1568
const THUMB_EDGE = 360

export const ACCEPT = [
  '.txt', '.csv', '.tsv', '.md', '.rtf',
  '.docx', '.xlsx', '.xls', '.xlsm', '.ods',
  '.pdf', '.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.heif',
].join(',')

export const PHOTO_ACCEPT = 'image/*,.heic,.heif,.pdf'

function extOf(name: string): string {
  return name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? ''
}

export function memo(text: string): Handed {
  return { attach: { kind: 'memo', text: clip(text) } }
}

export async function readFile(file: File): Promise<Handed> {
  const ext = extOf(file.name)
  const name = file.name
  if (['txt', 'csv', 'tsv', 'md'].includes(ext) || file.type.startsWith('text/')) {
    return { attach: { kind: 'file', name, text: clip(decode(await file.arrayBuffer())) } }
  }
  if (ext === 'rtf') {
    return { attach: { kind: 'file', name, text: clip(rtfText(await file.arrayBuffer())) } }
  }
  if (ext === 'docx') {
    const mammoth = await import('mammoth')
    const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
    // Word puts a blank line between paragraphs; a memo reads better without.
    return { attach: { kind: 'file', name, text: clip(value.replace(/\n\n/g, '\n')) } }
  }
  if (['xlsx', 'xls', 'xlsm', 'ods'].includes(ext)) {
    return { attach: { kind: 'file', name, text: clip(await sheets(file)) } }
  }
  if (ext === 'pdf' || file.type === 'application/pdf') {
    if (file.size > MAX_PDF) throw new CannotRead('PDF が大きすぎました。10MB までにして、もう一度渡してください。')
    return { attach: { kind: 'file', name, text: '' }, media: { type: 'pdf', data: await base64(file) } }
  }
  if (['heic', 'heif'].includes(ext) || file.type.startsWith('image/')) {
    const bitmap = await picture(file, ext)
    const data = toJpeg(bitmap, PHOTO_EDGE, 0.85)
    const thumb = `data:image/jpeg;base64,${toJpeg(bitmap, THUMB_EDGE, 0.7)}`
    bitmap.close()
    return { attach: { kind: 'photo', name, thumb, text: '' }, media: { type: 'image', mediaType: 'image/jpeg', data } }
  }
  if (ext === 'doc') throw new CannotRead('古い Word の形（.doc）は読めません。Word で「.docx」か PDF に書き出して、渡してください。')
  if (['pages', 'numbers', 'key'].includes(ext)) {
    throw new CannotRead('Pages・Numbers の形は読めません。PDF か Word・Excel に書き出して、渡してください。')
  }
  throw new CannotRead('このファイルの形は読めません。PDF・写真・Word・Excel・文字のファイルで渡してください。')
}

function clip(text: string): string {
  const t = text.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  if (!t) throw new CannotRead('文字が見つかりませんでした。写真や PDF なら ✍️ 手書きを読む から渡してください。')
  return t.length > MAX_WORDS ? t.slice(0, MAX_WORDS) : t
}

// Japanese files from older Excel or Windows are often Shift_JIS, not UTF-8.
function decode(buf: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf).replace(/^﻿/, '')
  } catch {
    return new TextDecoder('shift_jis').decode(buf)
  }
}

// The words of an RTF file (TextEdit, older Word). Japanese comes either as
// \uNNNN or as bytes \'hh in the file's code page (932 is Shift_JIS).
function rtfText(buf: ArrayBuffer): string {
  const src = new TextDecoder('latin1').decode(buf)
  const page = src.match(/\\ansicpg(\d+)/)?.[1]
  const decoder = new TextDecoder(page === '932' ? 'shift_jis' : page ? `windows-${page}` : 'windows-1252')
  // Groups that hold no words: fonts, colours, styles, pictures, document info.
  const SKIP = /^(fonttbl|colortbl|stylesheet|info|pict|header|footer|listtable|listoverridetable|expandedcolortbl|generator)$/
  let out = ''
  let bytes: number[] = []
  const flush = () => {
    if (bytes.length) out += decoder.decode(new Uint8Array(bytes))
    bytes = []
  }
  const stack: { skip: boolean; uc: number }[] = []
  let skip = false
  let uc = 1
  let pendingSkip = 0
  let i = 0
  while (i < src.length) {
    const c = src[i]
    if (c === '{') {
      stack.push({ skip, uc })
      i++
      continue
    }
    if (c === '}') {
      flush()
      const top = stack.pop()
      if (top) ({ skip, uc } = top)
      i++
      continue
    }
    if (c === '\\') {
      const next = src[i + 1]
      if (next === "'") {
        const b = parseInt(src.slice(i + 2, i + 4), 16)
        i += 4
        if (pendingSkip > 0) pendingSkip--
        else if (!skip) bytes.push(b)
        continue
      }
      if (next === '*') {
        skip = true
        i += 2
        continue
      }
      // TextEdit ends a line with a backslash before the line break.
      if (next === '\n' || next === '\r') {
        if (!skip) {
          flush()
          out += '\n'
        }
        i += 2
        continue
      }
      if (next === '\\' || next === '{' || next === '}') {
        if (!skip) {
          flush()
          out += next
        }
        i += 2
        continue
      }
      const m = /^([a-zA-Z]+)(-?\d+)? ?/.exec(src.slice(i + 1, i + 40))
      if (!m) {
        i += 2
        continue
      }
      i += 1 + m[0].length
      const word = m[1]
      const arg = m[2] === undefined ? undefined : Number(m[2])
      if (SKIP.test(word)) skip = true
      else if (word === 'uc' && arg !== undefined) uc = arg
      else if (word === 'u' && arg !== undefined) {
        if (!skip) {
          flush()
          out += String.fromCharCode(arg < 0 ? arg + 65536 : arg)
        }
        pendingSkip = uc
      } else if (!skip && (word === 'par' || word === 'line')) {
        flush()
        out += '\n'
      } else if (!skip && word === 'tab') {
        flush()
        out += '\t'
      }
      continue
    }
    if (c === '\r' || c === '\n') {
      i++
      continue
    }
    if (pendingSkip > 0) {
      pendingSkip--
    } else if (!skip) {
      flush()
      out += c
    }
    i++
  }
  flush()
  return out
}

// Each sheet as a table of lines, named, so Momo sees what belongs where.
async function sheets(file: File): Promise<string> {
  const XLSX = await import('xlsx')
  const book = XLSX.read(await file.arrayBuffer(), { type: 'array' })
  return book.SheetNames.map((n) => {
    const csv = XLSX.utils.sheet_to_csv(book.Sheets[n], { blankrows: false }).trim()
    return csv ? `【${n}】\n${csv}` : ''
  })
    .filter(Boolean)
    .join('\n\n')
}

async function base64(blob: Blob): Promise<string> {
  const url = await new Promise<string>((ok, fail) => {
    const r = new FileReader()
    r.onload = () => ok(r.result as string)
    r.onerror = () => fail(r.error)
    r.readAsDataURL(blob)
  })
  return url.slice(url.indexOf(',') + 1)
}

// Safari opens iPhone photos (HEIC) itself; Chrome needs them converted.
async function picture(file: File, ext: string): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file)
  } catch {
    if (!['heic', 'heif'].includes(ext) && !/hei[cf]/.test(file.type)) {
      throw new CannotRead('この写真は開けませんでした。JPG か PNG にして、もう一度渡してください。')
    }
    const { heicTo } = await import('heic-to')
    return heicTo({ blob: file, type: 'bitmap' })
  }
}

function toJpeg(bitmap: ImageBitmap, edge: number, quality: number): string {
  const k = Math.min(1, edge / Math.max(bitmap.width, bitmap.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bitmap.width * k)
  c.height = Math.round(bitmap.height * k)
  const g = c.getContext('2d')!
  // Transparent PNGs would turn black as JPEG.
  g.fillStyle = '#fff'
  g.fillRect(0, 0, c.width, c.height)
  g.drawImage(bitmap, 0, 0, c.width, c.height)
  const url = c.toDataURL('image/jpeg', quality)
  return url.slice(url.indexOf(',') + 1)
}
