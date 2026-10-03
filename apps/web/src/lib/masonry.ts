export type MasonryLayout = {
  items: Array<{ column: number; top: number }>
  height: number
}

/** Place images in source order, always choosing the shortest column. */
export function calculateMasonry(heights: number[], columns: number, gap: number): MasonryLayout {
  const bottoms = Array<number>(columns).fill(0)
  const items = heights.map((height) => {
    const column = bottoms.indexOf(Math.min(...bottoms))
    const top = bottoms[column]
    bottoms[column] = top + height + gap
    return { column, top }
  })
  return { items, height: heights.length ? Math.max(...bottoms) - gap : 0 }
}

/** Repack after image loads, caption changes and responsive width changes. */
export function initMasonry(container: HTMLElement): () => void {
  const items = Array.from(container.querySelectorAll<HTMLElement>('[data-masonry-item]'))
  let frame: number | null = null
  let previousWidth = 0

  const layout = () => {
    frame = null
    const styles = getComputedStyle(container)
    const columns = Number(styles.getPropertyValue('--gallery-columns')) || 1
    const gap = parseFloat(styles.getPropertyValue('--gallery-gap')) || 0
    const width = container.clientWidth
    const columnWidth = (width - gap * (columns - 1)) / columns

    container.setAttribute('data-masonry-ready', '')
    const packed = calculateMasonry(items.map((item) => item.offsetHeight), columns, gap)
    packed.items.forEach(({ column, top }, index) => {
      items[index].style.left = `${column * (columnWidth + gap)}px`
      items[index].style.top = `${top}px`
    })
    container.style.height = `${packed.height}px`
    previousWidth = width
  }

  const schedule = () => {
    if (frame === null) frame = requestAnimationFrame(layout)
  }
  const observer = new ResizeObserver((entries) => {
    // Changing the container's height is our own output, not a reason to repack.
    if (entries.some((entry) => entry.target !== container || container.clientWidth !== previousWidth)) schedule()
  })

  layout()
  observer.observe(container)
  items.forEach((item) => observer.observe(item))

  return () => {
    observer.disconnect()
    if (frame !== null) cancelAnimationFrame(frame)
    container.removeAttribute('data-masonry-ready')
    container.style.removeProperty('height')
    for (const item of items) {
      item.style.removeProperty('left')
      item.style.removeProperty('top')
    }
  }
}
