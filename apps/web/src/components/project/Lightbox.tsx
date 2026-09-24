import { useEffect, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { ProjectImageContent } from '@/content/types'
import { getLenis } from '@/lib/lenis'
import { useCarousel } from '@/lib/carousel/useCarousel'

interface LightboxProps {
  images: ProjectImageContent[]
  /** Index of the image the viewer opens on. */
  startIndex: number
  /** Project title — used for alt text / aria. */
  title: string
  onClose: () => void
}

/**
 * Fullscreen artwork viewer opened by clicking a gallery image.
 *
 * A dark overlay with a cinematic HORIZONTAL carousel: the active image sits
 * centred, the next peeks smaller to the right. Scrolling / dragging glides the
 * big one left (and smaller) while the right one settles into the centre — the
 * same shared gesture-step engine as the home stage, laid out
 * horizontally. A single-image gallery just shows the one image (no carousel).
 *
 * Captions are intentionally NOT shown here — the viewer shows only the artwork
 * (the write-up lives under the image in the grid). Closes on the ✕ button,
 * Escape, or a (non-drag) click on the backdrop.
 *
 * Portalled into #root so it stacks above the fixed nav, and only mounted while
 * open (client-only), so it never touches SSR output.
 */
export default function Lightbox({ images, startIndex, title, onClose }: LightboxProps) {
  const closeRef = useRef<HTMLButtonElement>(null)

  // Freeze background scroll (pause Lenis + hide overflow) while open, and move
  // focus to the close button for keyboard users.
  useEffect(() => {
    const lenis = getLenis()
    lenis?.stop()
    const { body } = document
    const prevOverflow = body.style.overflow
    body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      lenis?.start()
      body.style.overflow = prevOverflow
    }
  }, [])

  // Escape closes from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const host =
    typeof document !== 'undefined' ? document.getElementById('root') ?? document.body : null
  if (!host) return null

  const single = images.length <= 1

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${title} — image viewer`}
      className="fixed inset-0 z-[200] bg-ink/95 backdrop-blur-sm"
    >
      {single ? (
        <div className="absolute inset-0 flex items-center justify-center p-[clamp(1.5rem,5vw,4rem)]">
          <img
            src={images[0]?.src}
            alt={title}
            draggable={false}
            className="max-h-[86vh] w-auto max-w-[92vw] object-contain drop-shadow-[0_40px_120px_rgba(0,0,0,0.85)]"
          />
        </div>
      ) : (
        <Coverflow images={images} startIndex={startIndex} title={title} onClose={onClose} />
      )}

      <button
        ref={closeRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        aria-label="Close viewer"
        className="absolute right-[clamp(1rem,3vw,2.5rem)] top-[clamp(1rem,3vw,2.5rem)] z-[210] flex h-11 w-11 items-center justify-center rounded-full border border-line-soft bg-ink/40 text-bone backdrop-blur-sm transition hover:border-gold/60 hover:text-gold-bright focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path
            d="M4 4l10 10M14 4L4 14"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>,
    host,
  )
}

/* --------------------------------------------------------------------- */

// Feel of the horizontal carousel. The neighbours sit far enough out (SPREAD)
// and small enough (SIDE_SHRINK) that they only peek in at the edges and never
// overlap the centred image.
const SPREAD = 52 // vw between neighbouring images
const SIDE_SHRINK = 0.58 // neighbours render at (1 - this) scale ≈ 0.42

// One deliberate image per gesture. The gesture axis matches the layout —
// horizontal drags/swipes move the images (a mouse's vertical-only wheel still
// works; the wheel adopts whichever axis carries the gesture).
//
// These numbers are absolute: dragSpan/wheelSpan are pixels per image, so the
// mapping from finger travel to movement is pure delta and does not change with
// the number of images in the gallery. A 21-image work swipes exactly like a
// 3-image one.
//
// The viewer used to run looser than the home stage — a 72px step, a 0.22
// commit threshold (22% of a step and it advanced) and up to 3 images per
// flick — which read as hair-trigger on the long galleries. Now a swipe has to
// cover half an image to move at all, and can only ever move one.
const VIEWER_FEEL = {
  axis: 'x',
  /** Pixels of wheel/trackpad travel per image. */
  wheelSpan: 180,
  /** Pixels of finger/pointer travel per image. */
  dragSpan: 150,
  /** Half an image of travel before it commits to the next one. */
  commitThreshold: 0.5,
  damping: 7.5,
  snapDuration: 0.62,
  /** A flick advances by one, however hard it is thrown. */
  maxDragSteps: 1,
} as const

/** The multi-image horizontal coverflow (only used when there are ≥ 2 images). */
function Coverflow({
  images,
  startIndex,
  title,
  onClose,
}: {
  images: ProjectImageContent[]
  startIndex: number
  title: string
  onClose: () => void
}) {
  const api = useCarousel(images.length, startIndex, VIEWER_FEEL)
  const { stageRef, registerFrame, activeIndex } = api

  const slideRefs = useRef<HTMLDivElement[]>([])
  const innerRefs = useRef<HTMLDivElement[]>([])
  const setSlide = (i: number) => (el: HTMLDivElement | null) => {
    if (el) slideRefs.current[i] = el
  }
  const setInner = (i: number) => (el: HTMLDivElement | null) => {
    if (el) innerRefs.current[i] = el
  }

  const N = images.length
  const lastN = Math.max(N - 1, 1)

  // Drive each slide's transform / opacity from the continuous scroll position.
  // Styles are owned imperatively (no inline style props), so React re-renders
  // — e.g. the counter updating — never clobber the animated values. A layout
  // effect primes the first frame before paint, so the viewer opens already
  // centred on the clicked image with no flash.
  useLayoutEffect(() => {
    const unsub = registerFrame((progress) => {
      const pos = progress * lastN
      for (let i = 0; i < N; i++) {
        const slide = slideRefs.current[i]
        const inner = innerRefs.current[i]
        if (!slide) continue
        const s = i - pos // signed distance from centre, in image-steps
        const a = Math.abs(s)
        const scale = 1 - Math.min(a, 1) * SIDE_SHRINK
        const opacity = a <= 1 ? 1 - a * 0.55 : Math.max(0, 1 - (a - 1) / 0.7) * 0.45
        slide.style.opacity = opacity.toFixed(3)
        slide.style.zIndex = String(Math.round(100 - a * 10))
        if (inner) {
          inner.style.transform = `translateX(${(s * SPREAD).toFixed(2)}vw) scale(${scale.toFixed(3)})`
        }
      }
    })
    return unsub
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      ref={stageRef}
      data-lenis-prevent
      data-gesture-carousel
      onClick={onClose}
      className="absolute inset-0 cursor-grab touch-none select-none overflow-hidden active:cursor-grabbing"
    >
      {images.map((img, i) => (
        <div
          key={img.src}
          ref={setSlide(i)}
          className="pointer-events-none absolute inset-0 flex items-center justify-center p-[clamp(1.5rem,5vw,4rem)] opacity-0"
        >
          <div ref={setInner(i)} className="will-change-transform">
            <img
              src={img.src}
              alt={`${title} — view ${i + 1} of ${N}`}
              draggable={false}
              loading={Math.abs(i - startIndex) <= 1 ? 'eager' : 'lazy'}
              className="max-h-[80vh] w-auto max-w-[56vw] object-contain drop-shadow-[0_40px_120px_rgba(0,0,0,0.85)]"
            />
          </div>
        </div>
      ))}

      {/* Position counter — decoration, never intercepts the gesture. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[clamp(1.25rem,4vh,2.5rem)] z-[130] flex justify-center">
        <span className="u-eyebrow text-[0.65rem] text-faint">
          {String(activeIndex + 1).padStart(2, '0')}
          <span className="mx-2 text-line">·</span>
          {String(N).padStart(2, '0')}
        </span>
      </div>
    </div>
  )
}
