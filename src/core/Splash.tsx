import { useRef, useState } from 'react'
import { LightMomo } from './LightMomo'

const SIZE = 240

// When the app opens: Momo is drawn in light in the middle of the screen,
// then she settles into her usual place (the element marked .light-target).
export function Splash({ src, onEnd }: { src: string; onEnd: () => void }) {
  const art = useRef<HTMLDivElement>(null)
  const [leaving, setLeaving] = useState(false)

  function settle() {
    const from = art.current?.querySelector('img')?.getBoundingClientRect()
    const to = [...document.querySelectorAll('.light-target')]
      .map((el) => el.getBoundingClientRect())
      .find((r) => r.width > 0 && r.height > 0)
    setTimeout(() => {
      if (art.current && from && to) {
        const dx = to.left + to.width / 2 - (from.left + from.width / 2)
        const dy = to.top + to.height / 2 - (from.top + from.height / 2)
        art.current.style.transform = `translate(${dx}px, ${dy}px) scale(${to.width / from.width})`
      }
      setLeaving(true)
      setTimeout(onEnd, 800)
    }, 500)
  }

  return (
    <div className={leaving ? 'splash leaving' : 'splash'} aria-hidden="true">
      <div className="splash-art" ref={art}>
        <LightMomo src={src} size={SIZE} duration={2200} stagger={1000} onDone={settle} />
      </div>
    </div>
  )
}
