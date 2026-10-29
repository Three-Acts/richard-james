import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { Download, ExternalLink, RotateCcw } from "lucide-react";
import { cn } from "@three-acts/utils";
import { Button, buttonVariants, focusRing, inputVariants, ScrollArea } from "../components/atoms";
import { formatVideoTime, type Tutorial, type TutorialMediaUrls } from "./library";

type TutorialDetailProps = {
  tutorial: Tutorial;
  playbackRate: string;
  onPlaybackRateChange: (rate: string) => void;
  files: TutorialMediaUrls | null;
  mediaUsable: boolean;
  mediaLoading: boolean;
  mediaError: string | null;
  onRetryMedia: () => void;
};

export function TutorialDetail({ tutorial, playbackRate, onPlaybackRateChange, files, mediaUsable, mediaLoading, mediaError, onRetryMedia }: TutorialDetailProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const pendingPlaybackRestore = useRef<{ time: number; wasPlaying: boolean } | null>(null);
  const playbackSnapshot = useRef({ time: 0, wasPlaying: false });
  const attachVideo = useCallback((video: HTMLVideoElement | null) => {
    if (!video) videoRef.current?.pause();
    videoRef.current = video;
  }, []);

  useLayoutEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = Number(playbackRate);
  }, [playbackRate]);

  useLayoutEffect(() => {
    const video = videoRef.current;
    if (!video || !files?.video) return;

    const previousUrl = video.dataset.mediaUrl;
    video.dataset.mediaUrl = files.video;
    if (!previousUrl || previousUrl === files.video) return;

    setVideoFailed(false);
    // React has already updated the src attribute by this layout effect. The
    // last media events provide a stable snapshot even if source selection
    // has already reset currentTime to zero.
    pendingPlaybackRestore.current = { ...playbackSnapshot.current };
    video.load();
  }, [files?.video]);

  function rememberPlayback() {
    const video = videoRef.current;
    if (!video || pendingPlaybackRestore.current) return;
    playbackSnapshot.current = {
      time: video.currentTime,
      wasPlaying: !video.paused && !video.ended
    };
  }

  function restorePlaybackAfterRefresh() {
    const pending = pendingPlaybackRestore.current;
    const video = videoRef.current;
    if (!pending || !video) return;
    pendingPlaybackRestore.current = null;
    if (Number.isFinite(pending.time) && pending.time > 0) video.currentTime = pending.time;
    playbackSnapshot.current = pending;
    if (pending.wasPlaying) void video.play().catch(() => {});
  }

  function seekTo(start: number) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = start;
    // If the browser requires Play to be pressed directly, keep the requested
    // position and focus its native controls instead of treating it as a failed asset.
    void video.play().catch(() => video.focus());
  }

  return (
    <ScrollArea className="min-h-0 flex-1" viewportClassName="p-4 lg:p-6">
      <article className="mx-auto max-w-5xl pb-4 text-[13px] leading-5" aria-labelledby="tutorial-title">
        <div className="mb-4">
          <p className="mb-1 mt-0 text-ui tabular-nums text-cms-subtle">Tutorial {tutorial.id} of 21 · {formatVideoTime(tutorial.duration)}</p>
          <h2 className="m-0 text-lg font-semibold leading-6 text-cms-text" id="tutorial-title">{tutorial.title}</h2>
          <p className="mb-0 mt-2 text-cms-muted">{tutorial.goal}</p>
        </div>

        <div className="overflow-hidden rounded-cms border border-cms-line-strong bg-black">
          {files ? <video
            aria-label={`${tutorial.title} walkthrough`}
            className="block aspect-video w-full"
            controls
            crossOrigin="anonymous"
            onError={() => setVideoFailed(true)}
            onLoadedMetadata={() => {
              if (videoRef.current) videoRef.current.playbackRate = Number(playbackRate);
              if (pendingPlaybackRestore.current) restorePlaybackAfterRefresh();
              else rememberPlayback();
            }}
            onPause={rememberPlayback}
            onPlay={rememberPlayback}
            playsInline
            poster={files.screenshot}
            preload="metadata"
            onSeeked={rememberPlayback}
            onSeeking={rememberPlayback}
            onTimeUpdate={rememberPlayback}
            ref={attachVideo}
            src={files.video}
          >
            <track default kind="captions" label="English" src={files.captions} srcLang="en" />
            Your browser does not support embedded video. Open the video using the link below.
          </video> : <div className="flex aspect-video w-full items-center justify-center bg-cms-surface text-ui text-cms-muted" role="status">Loading private tutorial video…</div>}
        </div>
        {mediaError ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-ui text-cms-danger" role="alert">
            <p className="m-0">{mediaError}</p>
            <Button onClick={onRetryMedia}><RotateCcw aria-hidden="true" size={13} /> Retry access</Button>
          </div>
        ) : mediaLoading && !files ? <p className="mt-2 text-ui text-cms-muted" role="status">Requesting secure access to this tutorial’s files…</p>
          : mediaLoading && files && !mediaUsable ? <p className="mt-2 text-ui text-cms-muted" role="status">Refreshing secure access before using this tutorial’s files…</p>
            : null}
        {videoFailed ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-ui text-cms-danger" role="alert">
            <p className="m-0">The video could not be loaded. You can still follow the written steps below.</p>
            <Button onClick={() => { setVideoFailed(false); onRetryMedia(); }}><RotateCcw aria-hidden="true" size={13} /> Retry video</Button>
            {files && mediaUsable ? <a className="underline underline-offset-2" href={files.video} rel="noreferrer" target="_blank">Open video in a new tab</a> : null}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cms-line py-3">
          <div className="flex flex-wrap gap-1.5">
            {files && mediaUsable ? <>
              <a className={buttonVariants({ variant: "normal" })} download href={files.videoDownload}><Download aria-hidden="true" size={13} /> Video</a>
              <a className={buttonVariants({ variant: "normal" })} href={files.screenshot} rel="noreferrer" target="_blank"><ExternalLink aria-hidden="true" size={13} /> 4K screenshot</a>
              <a className={buttonVariants({ variant: "normal" })} download href={files.transcript}><Download aria-hidden="true" size={13} /> Transcript</a>
            </> : null}
          </div>
          <label className="flex items-center gap-2 text-ui text-cms-muted">
            Playback speed
            <select className={cn(inputVariants(), "w-20")} onChange={(event) => onPlaybackRateChange(event.target.value)} value={playbackRate}>
              <option value="0.75">0.75×</option>
              <option value="1">1×</option>
              <option value="1.25">1.25×</option>
              <option value="1.5">1.5×</option>
            </select>
          </label>
        </div>

        <div className="grid gap-6 py-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <section aria-labelledby="tutorial-steps">
            <h3 className="mb-3 mt-0 text-ui-lg font-semibold" id="tutorial-steps">Steps</h3>
            <ol className="m-0 list-decimal space-y-3 pl-4 text-cms-muted">
              {tutorial.steps.map((step) => <li className="pl-1" key={step}>{step}</li>)}
            </ol>
            <h3 className="mb-2 mt-5 text-ui-lg font-semibold">Check the result</h3>
            <p className="m-0 text-cms-muted">{tutorial.check}</p>
          </section>
          <section aria-labelledby="tutorial-notes">
            <h3 className="mb-3 mt-0 text-ui-lg font-semibold" id="tutorial-notes">Things to know</h3>
            <div className="space-y-3 text-cms-muted">
              {tutorial.notes.map((note) => <p className="m-0" key={note}>{note}</p>)}
            </div>
          </section>
        </div>

        <details className="border-y border-cms-line py-3">
          <summary className={cn("cursor-pointer rounded-cms text-ui-lg font-semibold", focusRing)}>Narration transcript</summary>
          <div className="grid gap-3 pt-4">
            {tutorial.chapters.map((chapter) => (
              <p className="m-0 text-cms-muted" key={chapter.start}>
                <button
                  aria-label={`Play from ${formatVideoTime(chapter.start)}`}
                  className={cn("mr-2 inline-flex rounded-cms bg-cms-surface px-1.5 py-0.5 text-ui tabular-nums text-cms-text hover:bg-cms-raised", focusRing)}
                  onClick={() => seekTo(chapter.start)}
                  type="button"
                >{formatVideoTime(chapter.start)}</button>
                {chapter.text}
              </p>
            ))}
          </div>
        </details>

        <footer className="pt-4">
          <div className="mb-3 flex flex-wrap gap-x-4 gap-y-2 text-ui">
            {files && mediaUsable ? <>
              <a className={cn("rounded-cms text-cms-muted underline underline-offset-2 hover:text-cms-text", focusRing)} href={`${files.pdf}#page=${Number(tutorial.id) + 2}`} rel="noreferrer" target="_blank">Open this procedure in the PDF guide</a>
              <a className={cn("rounded-cms text-cms-muted underline underline-offset-2 hover:text-cms-text", focusRing)} download href={files.word}>Download the Word guide</a>
            </> : null}
          </div>
          <p className="m-0 text-micro leading-4 text-cms-subtle">Recorded on 29 October 2026 in a training copy of the CMS. Publishing is simulated. Narration is AI generated.</p>
        </footer>
      </article>
    </ScrollArea>
  );
}
