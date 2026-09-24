/**
 * Per-history-entry memory for the visitor's place in the home experience.
 *
 * Going BACK to home (the browser's back arrow — or forward again onto the
 * same entry) returns the visitor to the exact work / scroll offset they
 * left. A NEW navigation to home (the logo, a menu link, a fresh landing) is
 * a new visit and starts clean, no matter what was clicked earlier in the
 * session. History-stack semantics, exactly like the browser's own scroll
 * memory — so the memory is bound to the history entry itself:
 *
 * Astro's ClientRouter keeps one state object per history entry. A push
 * navigation builds a brand-new object; a traversal (and a reload) brings the
 * entry's own object back. We stamp a random visit id into home's state
 * object (the router's own replaceState calls spread the existing state, so
 * the stamp survives its scroll bookkeeping) and keep the position in
 * sessionStorage under that id. Fresh push → no stamp → a new id with an
 * empty record → clean start; traversal → the stamped id → its record.
 *
 * The island re-hydrates from scratch on every visit either way — these
 * records are what carry the position across. The router's native scroll
 * restore can't: it runs against the one-viewport SSR slideshow before the
 * island exists, so it always clamps to the top.
 */

interface HomeRecord {
  /** Active work index of the slideshow (stage). */
  stage?: number
  /** Document scroll offset of the grid, px. */
  grid?: number
}

const VISIT_FIELD = 'rjHomeVisit'
const RECORD_PREFIX = 'home-pos-'

/** This home entry's visit id, minted and stamped on first touch. */
function visitId(): string | null {
  try {
    const state = window.history.state
    if (!state) return null
    const existing = state[VISIT_FIELD]
    if (typeof existing === 'string') return existing
    const minted = Math.random().toString(36).slice(2)
    window.history.replaceState({ ...state, [VISIT_FIELD]: minted }, '')
    return minted
  } catch {
    return null
  }
}

function readRecord(): HomeRecord {
  try {
    const id = visitId()
    if (!id) return {}
    const raw = window.sessionStorage.getItem(RECORD_PREFIX + id)
    return raw ? (JSON.parse(raw) as HomeRecord) : {}
  } catch {
    return {}
  }
}

function writeRecord(patch: HomeRecord): void {
  try {
    const id = visitId()
    if (!id) return
    window.sessionStorage.setItem(
      RECORD_PREFIX + id,
      JSON.stringify({ ...readRecord(), ...patch }),
    )
  } catch {
    /* storage unavailable — this visit just won't be restorable */
  }
}

export function rememberStageIndex(index: number): void {
  writeRecord({ stage: index })
}

export function recallStageIndex(): number {
  const { stage } = readRecord()
  return typeof stage === 'number' && Number.isInteger(stage) && stage > 0 ? stage : 0
}

export function rememberGridScroll(y: number): void {
  writeRecord({ grid: Math.round(y) })
}

export function recallGridScroll(): number {
  const { grid } = readRecord()
  return typeof grid === 'number' && Number.isFinite(grid) && grid > 0 ? grid : 0
}
