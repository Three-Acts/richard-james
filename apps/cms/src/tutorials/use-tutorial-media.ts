import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../lib/api-client";
import type { TutorialMediaUrls } from "./library";
import { TUTORIAL_MEDIA_REFRESH_MARGIN_MS, tutorialMediaNeedsRefresh, watchTutorialMediaResume } from "./media-lifecycle";

type MediaState = {
  tutorialId: string | null;
  media: TutorialMediaUrls | null;
  checkedAt: number;
  loading: boolean;
  error: string | null;
};

export function useTutorialMedia(tutorialId: string) {
  const [state, setState] = useState<MediaState>({ tutorialId: null, media: null, checkedAt: 0, loading: true, error: null });
  const latestMediaRef = useRef<{ tutorialId: string; media: TutorialMediaUrls } | null>(null);
  const retryRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let expiryTimer: ReturnType<typeof setTimeout> | undefined;
    let inFlight: Promise<void> | null = null;
    let latestMedia = latestMediaRef.current?.tutorialId === tutorialId
      ? latestMediaRef.current.media
      : null;

    function scheduleRefresh(media: TutorialMediaUrls) {
      if (timer) clearTimeout(timer);
      const refreshAfter = Math.max(1_000, media.expiresAt - Date.now() - TUTORIAL_MEDIA_REFRESH_MARGIN_MS);
      timer = setTimeout(() => { void load(); }, refreshAfter);
      if (expiryTimer) clearTimeout(expiryTimer);
      expiryTimer = setTimeout(() => {
        setState((current) => current.tutorialId === tutorialId
          ? { ...current, checkedAt: Date.now() }
          : current);
      }, Math.max(1, media.expiresAt - Date.now()));
    }

    function load(): Promise<void> {
      if (inFlight) return inFlight;

      setState({ tutorialId, media: latestMedia, checkedAt: Date.now(), loading: true, error: null });
      const request = (async () => {
        try {
          const media = await apiFetch<TutorialMediaUrls>(`/cms/tutorials/${encodeURIComponent(tutorialId)}/media`);
          if (stopped) return;
          latestMedia = media;
          latestMediaRef.current = { tutorialId, media };
          setState({ tutorialId, media, checkedAt: Date.now(), loading: false, error: null });
          scheduleRefresh(media);
        } catch {
          if (stopped) return;
          setState({
            tutorialId,
            media: latestMedia,
            checkedAt: Date.now(),
            loading: false,
            error: "Private tutorial files could not be accessed. Check your CMS session and retry."
          });
        }
      })();

      const tracked = request.finally(() => {
        if (inFlight === tracked) inFlight = null;
      });
      inFlight = tracked;
      return tracked;
    }

    const refreshIfNeeded = () => {
      if (latestMedia && tutorialMediaNeedsRefresh(latestMedia.expiresAt)) void load();
    };
    retryRef.current = () => { void load(); };
    const stopWatchingResume = watchTutorialMediaResume({
      getExpiresAt: () => latestMedia?.expiresAt,
      refresh: refreshIfNeeded,
      windowTarget: window,
      documentTarget: document
    });

    void load();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      if (expiryTimer) clearTimeout(expiryTimer);
      stopWatchingResume();
      if (retryRef.current) retryRef.current = null;
    };
  }, [tutorialId]);

  const currentState = state.tutorialId === tutorialId
    ? state
    : { tutorialId, media: null, checkedAt: 0, loading: true, error: null };
  const mediaUsable = Boolean(currentState.media && currentState.media.expiresAt > currentState.checkedAt);

  return {
    media: currentState.media,
    mediaUsable,
    loading: currentState.loading,
    error: currentState.error,
    retry: () => retryRef.current?.()
  };
}
