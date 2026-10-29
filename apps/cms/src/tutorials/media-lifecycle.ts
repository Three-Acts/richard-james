export const TUTORIAL_MEDIA_REFRESH_MARGIN_MS = 60_000;

export function tutorialMediaNeedsRefresh(expiresAt: number, now = Date.now()): boolean {
  return expiresAt - now <= TUTORIAL_MEDIA_REFRESH_MARGIN_MS;
}

type EventTargetLike = Pick<EventTarget, "addEventListener" | "removeEventListener">;
type VisibilityTargetLike = EventTargetLike & { visibilityState: string };

/** Revalidate after browser suspension, when timer callbacks may have been delayed. */
export function watchTutorialMediaResume(options: {
  getExpiresAt: () => number | undefined;
  refresh: () => void;
  now?: () => number;
  windowTarget: EventTargetLike;
  documentTarget: VisibilityTargetLike;
}): () => void {
  const revalidate = () => {
    const expiresAt = options.getExpiresAt();
    if (expiresAt !== undefined && tutorialMediaNeedsRefresh(expiresAt, options.now?.() ?? Date.now())) {
      options.refresh();
    }
  };
  const onVisibilityChange = () => {
    if (options.documentTarget.visibilityState === "visible") revalidate();
  };

  options.windowTarget.addEventListener("pageshow", revalidate);
  options.windowTarget.addEventListener("focus", revalidate);
  options.documentTarget.addEventListener("visibilitychange", onVisibilityChange);

  return () => {
    options.windowTarget.removeEventListener("pageshow", revalidate);
    options.windowTarget.removeEventListener("focus", revalidate);
    options.documentTarget.removeEventListener("visibilitychange", onVisibilityChange);
  };
}
