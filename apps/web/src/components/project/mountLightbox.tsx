import { createRoot, type Root } from 'react-dom/client'
import type { ProjectImageContent } from '@/content/types'
import { getLenis } from '@/lib/lenis'
import Lightbox from './Lightbox'

/**
 * On-demand entry point for the fullscreen viewer.
 *
 * The gallery grid is static Astro markup; this module — and with it React,
 * react-dom and the gesture engine — is fetched by a dynamic import the first
 * time a visitor actually clicks an artwork. A project page that is only read
 * therefore ships no React at all, which is why the viewer is not an Astro
 * island: even `client:idle` would download the framework for every visitor.
 */
export interface OpenLightboxOptions {
  images: ProjectImageContent[]
  /** Project title — used for alt text / aria. */
  title: string
  /** Index of the image the viewer opens on. */
  index: number
}

let root: Root | null = null
let container: HTMLElement | null = null

function ensureRoot(): Root {
  if (root && container?.isConnected) return root

  container = document.createElement('div')
  container.setAttribute('data-lightbox-root', '')
  document.body.appendChild(container)
  root = createRoot(container)
  return root
}

export function closeLightbox(): void {
  root?.render(null)
}

export function openLightbox({ images, title, index }: OpenLightboxOptions): void {
  ensureRoot().render(
    <Lightbox images={images} startIndex={index} title={title} onClose={closeLightbox} />,
  )
}

/**
 * ClientRouter replaces the document body without unmounting React, so the
 * viewer's own effect cleanup would never run on a navigation — leaving the body
 * scroll-locked and Lenis stopped for good. Tear down explicitly and drop the
 * detached container so the next open builds a fresh root.
 * (Reachable via browser back while the viewer is open.)
 */
document.addEventListener('astro:before-swap', () => {
  if (!root) return
  root.unmount()
  root = null
  container = null
  document.body.style.overflow = ''
  getLenis()?.start()
})
