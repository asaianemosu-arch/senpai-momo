import type { Sample } from './types'
import { putPhoto } from './photos'
import { startOver } from './storage'

// The sample shop is fetched only when it is needed (the first visit, or
// 見本に戻す); the server side never loads it.
const SAMPLE = () => import('../trades/bakery/sample').then((m) => m.sample as Sample)

// Puts the sample shop in this browser: the paper and conversations, and the
// photos into the photo store.
export async function loadSample(): Promise<void> {
  const sample = await SAMPLE()
  await Promise.all(
    Object.entries(sample.photos).map(async ([id, url]) => {
      try {
        await putPhoto(id, await fetch(url).then((r) => r.blob()))
      } catch {
        // a missing photo leaves its place empty; the paper still reads
      }
    }),
  )
  startOver(sample.store)
}

// Nothing on the paper: the visitor becomes the chef. Only the guide's
// seeds (清掃) come back, as for any new shop.
export function startBlank() {
  startOver({ role: 'chef' })
}
