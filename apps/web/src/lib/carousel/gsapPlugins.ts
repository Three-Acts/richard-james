/**
 * The carousel's input plugins, split out from lib/gsap.ts so they load only
 * where the gesture engine actually runs — the home stage and the fullscreen
 * lightbox. Pages that just scroll (project detail) never pull in Draggable or
 * InertiaPlugin.
 *
 * InertiaPlugin is registered but not re-exported: Draggable reaches it through
 * the plugin registry when a drag is configured with `inertia: true`.
 */
import { gsap } from '@/lib/gsap'
import { Observer } from 'gsap/Observer'
import { Draggable } from 'gsap/Draggable'
import { InertiaPlugin } from 'gsap/InertiaPlugin'

let registered = false

export function registerCarouselPlugins(): void {
  if (typeof window === 'undefined' || registered) return
  gsap.registerPlugin(Observer, Draggable, InertiaPlugin)
  registered = true
}

// Register eagerly on the client at import time.
registerCarouselPlugins()

export { gsap, Observer, Draggable }
