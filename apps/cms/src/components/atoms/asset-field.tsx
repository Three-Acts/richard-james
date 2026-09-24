import { useState } from "react";
import type { DragEvent } from "react";
import { ArrowUpRight, FileText, Film, Image as ImageIcon, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { cn } from "@three-acts/utils";
import { fileNameFromUrl, formatAssetSize, getAssetMeta, isPendingUpload, matchesAccept } from "./asset-utils";
import { BareIconButton } from "./bare-icon-button";
import { Button } from "./button";
import { Tooltip } from "./tooltip";
import { buttonVariants, fileLabelFocusRing } from "./styles";

type AssetKind = "image" | "video" | "file";

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "avif", "svg"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "mov", "m4v"]);

function kindFromAccept(accept?: string): AssetKind {
  if (accept?.startsWith("image/")) {
    return "image";
  }

  if (accept?.startsWith("video/")) {
    return "video";
  }

  return "file";
}

/** Extension first (the value the field actually holds); `accept` only fills in when the extension is inconclusive. */
function kindFromUrl(url: string, accept?: string): AssetKind {
  const path = url.split(/[?#]/)[0];
  const extension = path.slice(path.lastIndexOf(".") + 1).toLowerCase();

  if (IMAGE_EXTENSIONS.has(extension)) {
    return "image";
  }

  if (VIDEO_EXTENSIONS.has(extension)) {
    return "video";
  }

  return kindFromAccept(accept);
}

/**
 * Returns an icon element rather than a component reference: assigning the
 * component itself to a variable and rendering it as `<Icon />` recreates a
 * "component" on every render, which `react-hooks/static-components` flags.
 */
function renderKindIcon(kind: AssetKind, size: number) {
  if (kind === "image") {
    return <ImageIcon aria-hidden="true" className="text-cms-muted" size={size} />;
  }

  if (kind === "video") {
    return <Film aria-hidden="true" className="text-cms-muted" size={size} />;
  }

  return <FileText aria-hidden="true" className="text-cms-muted" size={size} />;
}

function kindNoun(kind: AssetKind): string {
  if (kind === "image") {
    return "image";
  }

  if (kind === "video") {
    return "video";
  }

  return "file";
}

type AssetControlProps = {
  accept?: string;
  /** Id of whichever file input is currently mounted, so `FormField`'s label stays wired to it. */
  inputId: string;
  /** True while a just-picked file is being decoded/resized/re-encoded client-side — nothing has been uploaded yet. */
  isOptimizing: boolean;
  onClear: () => void;
  onFile: (file: File) => void;
  value: string;
};

/** Webflow-style asset picker: a drop zone when empty, a preview card with actions once a file is set. */
export function AssetControl({ accept, inputId, isOptimizing, onClear, onFile, value }: AssetControlProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [hasRejectedFile, setHasRejectedFile] = useState(false);
  const [mediaFailed, setMediaFailed] = useState(false);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);

  // Reset the per-file UI state whenever the stored value itself changes
  // (a fresh upload, a replace, a record switch) — set during render, the
  // same "adjust state when a prop changes" shape `useCmsWorkspace` already
  // uses for `prevFilteredRecords`, not inside an effect.
  const [trackedValue, setTrackedValue] = useState(value);
  if (value !== trackedValue) {
    setTrackedValue(value);
    setHasRejectedFile(false);
    setMediaFailed(false);
    setNaturalSize(null);
  }

  function acceptFiles(files: FileList | null) {
    const file = files?.[0];

    if (!file) {
      return;
    }

    if (!matchesAccept(file, accept)) {
      setHasRejectedFile(true);
      return;
    }

    setHasRejectedFile(false);
    onFile(file);
  }

  function handleDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    if (!isOptimizing) {
      setIsDragging(true);
    }
  }

  function handleDragLeave(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);

    if (!isOptimizing) {
      acceptFiles(event.dataTransfer.files);
    }
  }

  const errorMessage = hasRejectedFile ? <p className="m-0 text-ui text-cms-danger">That file type isn&apos;t accepted here.</p> : null;

  if (!value) {
    const kind = kindFromAccept(accept);

    return (
      <div className="grid gap-1.5">
        <label
          className={cn(
            "relative flex min-h-24 flex-col items-center justify-center gap-1 rounded-cms border border-dashed border-cms-track bg-cms-surface px-4 py-4 text-center transition-colors",
            isOptimizing ? "cursor-not-allowed opacity-60" : "cursor-pointer",
            isDragging && "border-cms-accent bg-cms-raised",
            fileLabelFocusRing
          )}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {isOptimizing ? (
            <>
              <Loader2 aria-hidden="true" className="animate-spin text-cms-muted" size={20} />
              <span className="text-ui font-medium text-cms-text">Optimising…</span>
            </>
          ) : (
            <>
              {renderKindIcon(kind, 20)}
              <span className="text-ui font-medium text-cms-text">Drag your {kindNoun(kind)} here</span>
              <span className="text-ui text-cms-subtle">or click to browse for a file</span>
            </>
          )}
          {/* Covers the label's own footprint instead of `sr-only`: a `sr-only`
              input keeps its normal-flow ("static") position, which can sit far
              down a long scrollable form. Focusing it (the label→input click
              forwarding does this, and so does the OS file picker returning
              focus) then triggers the browser's default scroll-into-view,
              jumping the whole pane. Matching the visible control's own
              position means that scroll is always a no-op. */}
          <input
            accept={accept}
            className="absolute inset-0 cursor-[inherit] opacity-0"
            disabled={isOptimizing}
            id={inputId}
            onChange={(event) => {
              acceptFiles(event.target.files);
              event.target.value = "";
            }}
            type="file"
          />
        </label>
        {errorMessage}
      </div>
    );
  }

  const kind = kindFromUrl(value, accept);
  const meta = getAssetMeta(value);
  const fileName = meta?.fileName ?? fileNameFromUrl(value);
  const dimensionLabel = kind === "image" && naturalSize ? `${naturalSize.width} × ${naturalSize.height}` : null;
  const sizeLabel = formatAssetSize(meta);
  const detailLabel = [dimensionLabel, sizeLabel].filter(Boolean).join(" • ");
  const isPending = isPendingUpload(value);

  return (
    <div className="grid gap-1.5">
      <div className="relative flex items-center gap-3 rounded-cms border border-cms-line-strong bg-cms-surface p-2 pr-9">
        <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-cms bg-cms-bg">
          {kind === "image" && !mediaFailed ? (
            <img
              alt=""
              className="size-full object-contain"
              onError={() => setMediaFailed(true)}
              onLoad={(event) => {
                const target = event.currentTarget;
                setNaturalSize({ width: target.naturalWidth, height: target.naturalHeight });
              }}
              src={value}
            />
          ) : kind === "video" && !mediaFailed ? (
            <video
              className="size-full object-contain"
              muted
              onError={() => setMediaFailed(true)}
              playsInline
              preload="metadata"
              src={value}
            />
          ) : (
            renderKindIcon(kind, 22)
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="m-0 flex items-center gap-1.5 truncate text-ui font-medium text-cms-text">
            <span className="truncate">{fileName}</span>
            {isPending ? (
              <span className="shrink-0 rounded-cms-sm bg-cms-pending/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cms-pending">
                Pending upload
              </span>
            ) : null}
          </p>
          {detailLabel ? <p className="m-0 truncate text-ui text-cms-subtle">{detailLabel}</p> : null}
        </div>
        <Tooltip content="Open">
          <BareIconButton
            aria-label="Open file in new tab"
            className="absolute right-2 top-2"
            nativeButton={false}
            render={<a href={value} rel="noreferrer" target="_blank" />}
          >
            <ArrowUpRight aria-hidden="true" size={13} />
          </BareIconButton>
        </Tooltip>
      </div>

      <div className="flex gap-1.5">
        <label
          className={cn(
            "relative",
            buttonVariants({ variant: "normal" }),
            isOptimizing ? "cursor-not-allowed opacity-50" : "cursor-pointer",
            fileLabelFocusRing
          )}
        >
          <RefreshCw aria-hidden="true" size={13} />
          Replace
          {/* See the empty-state input above for why this isn't `sr-only`. */}
          <input
            accept={accept}
            className="absolute inset-0 cursor-[inherit] opacity-0"
            disabled={isOptimizing}
            id={inputId}
            onChange={(event) => {
              acceptFiles(event.target.files);
              event.target.value = "";
            }}
            type="file"
          />
        </label>
        <Button className="text-cms-muted hover:text-cms-danger" onClick={onClear}>
          <Trash2 aria-hidden="true" size={13} />
          Delete
        </Button>
      </div>
      {errorMessage}
    </div>
  );
}
