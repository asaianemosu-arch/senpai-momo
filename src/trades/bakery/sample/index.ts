import store from './store.json'
import brioche from './p-mw0a35jszla4.jpg'
import proofed from './p-mw0a3xiayvcp.jpg'
import oven from './p-mw0a53xbdc48.jpg'
import memo from './p-mw0ssby3nblz.jpg'
import crumb from './p-mwdanmen01.jpg'
import type { Sample } from '../../../core/types'

// もふもふベーカリー as it stood after Asai talked with Momo as the chef and
// the manager: the paper, what was handed out, both conversations and the
// photos she took. Visitors start here; nothing in it is a real shop.
export const sample: Sample = {
  store,
  photos: {
    'p-mw0a35jszla4': brioche,
    'p-mw0a3xiayvcp': proofed,
    'p-mw0a53xbdc48': oven,
    'p-mw0ssby3nblz': memo,
    'p-mwdanmen01': crumb,
  },
}
