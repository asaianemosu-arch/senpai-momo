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
  '.txt', '.csv', '.tsv', '.md',
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
