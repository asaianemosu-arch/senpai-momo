import { useEffect, useRef, useState } from 'react'

interface Props {
  src: string
  // Changing this plays the light again.
  playKey: number
}

const IMG = 170
const DURATION = 1600
const STAGGER = 700

const ease = (t: number) => 1 - Math.pow(1 - t, 3)

interface Dot {
  x: number
  y: number
  sx: number
  sy: number
  r: number
  g: number
  b: number
  delay: number
  twinkle: number
}

// Momo drawn by light: dots of light gather from around into her shape,
// taking her colours as they arrive, then the picture itself appears.
export function LightMomo({ src, playKey }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = canvas.current
    const holder = box.current
    if (!el || !holder) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(true)
      return
    }
    setShown(false)
    let frame = 0
    let stopped = false
    const img = new Image()
    img.src = src
    img.onload = () => {
      if (stopped) return
      const W = holder.clientWidth
      const H = holder.clientHeight
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      el.width = W * dpr
      el.height = H * dpr
      const g = el.getContext('2d')
      if (!g) return setShown(true)
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      el.style.transition = 'none'
      el.style.opacity = '1'

      const ox = (W - IMG) / 2
      const oy = (H - IMG) / 2
      const dots = shapeOf(img, ox, oy, W, H)
      const start = performance.now()

      const draw = (now: number) => {
        const t = now - start
        g.clearRect(0, 0, W, H)
        let arrived = 0
        for (const d of dots) {
          const k = Math.min(1, Math.max(0, (t - d.delay) / DURATION))
          if (k >= 1) arrived++
          const e = ease(k)
          const x = d.sx + (d.x - d.sx) * e
          const y = d.sy + (d.y - d.sy) * e
          const glow = 0.55 + 0.45 * Math.sin(d.twinkle + t / 180)
          // Far away a soft warm light; close by, Momo's own colours.
          const r = Math.round(236 + (d.r - 236) * e)
          const gg = Math.round(150 + (d.g - 150) * e)
          const b = Math.round(120 + (d.b - 120) * e)
          g.fillStyle = `rgba(${r},${gg},${b},${(0.25 + 0.6 * k) * glow})`
          g.beginPath()
          g.arc(x, y, 1.5 + (1 - e) * 1.8, 0, Math.PI * 2)
          g.fill()
        }
        if (arrived === dots.length) {
          setShown(true)
          el.style.transition = 'opacity .9s ease'
          el.style.opacity = '0'
          return
        }
        frame = requestAnimationFrame(draw)
      }
      frame = requestAnimationFrame(draw)
    }
    img.onerror = () => setShown(true)
    return () => {
      stopped = true
      cancelAnimationFrame(frame)
    }
  }, [src, playKey])

  return (
    <div className="light-momo" ref={box}>
      <img src={src} alt="モモ" className={shown ? 'shown' : ''} />
      <canvas ref={canvas} aria-hidden="true" />
    </div>
  )
}

// Points on Momo's shape, with her colours, read from the picture itself.
function shapeOf(img: HTMLImageElement, ox: number, oy: number, W: number, H: number): Dot[] {
  const c = document.createElement('canvas')
  c.width = c.height = IMG
  const g = c.getContext('2d')
  if (!g) return []
  g.drawImage(img, 0, 0, IMG, IMG)
  const data = g.getImageData(0, 0, IMG, IMG).data
  const dots: Dot[] = []
  for (let y = 0; y < IMG; y += 4) {
    for (let x = 0; x < IMG; x += 4) {
      const i = (y * IMG + x) * 4
      if (data[i + 3] <= 140) continue
      const a = Math.random() * Math.PI * 2
      const reach = 0.5 + Math.random() * 0.5
      dots.push({
        x: ox + x,
        y: oy + y,
        sx: W / 2 + Math.cos(a) * (W / 2) * reach,
        sy: H / 2 + Math.sin(a) * (H / 2) * reach,
        r: data[i],
        g: data[i + 1],
        b: data[i + 2],
        delay: Math.random() * STAGGER,
        twinkle: Math.random() * Math.PI * 2,
      })
    }
  }
  return dots
}
