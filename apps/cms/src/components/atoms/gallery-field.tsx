import { useRef, useState } from "react";
import type { DragEvent, KeyboardEvent } from "react";
import { GripVertical, ImagePlus, Trash2, Upload } from "lucide-react";
import { cn } from "@three-acts/utils";
import { MAX_ASSET_UPLOAD_BYTES } from "../../cms/types";
import type { GalleryItem } from "../../cms/types";
import { fileNameFromUrl, formatAssetSize, formatFileSize, getAssetMeta, isPendingUpload, matchesAccept } from "./asset-utils";
import { BareIconButton } from "./bare-icon-button";
import { Input } from "./input";
import { buttonVariants, fileLabelFocusRing } from "./styles";

const MIME_LABELS: Record<string, string> = {
  "image/jpeg": "JPEG",
  "image/jpg": "JPEG",
  "image/png": "PNG",
  "image/webp": "WebP",
  "image/avif": "AVIF",
  "image/gif": "GIF",
  "image/svg+xml": "SVG"
};

const WILDCARD_LABELS: Record<string, string[]> = {
  "image/*": ["JPEG", "PNG", "WebP", "AVIF"],
  "video/*": ["MP4", "WebM", "MOV"]
};

/** "image/*" -> "JPEG, PNG, WebP, AVIF" — best-effort, falls back to the raw subtype. */
function describeAcceptedTypes(accept?: string): string | null {
  if (!accept) {
    return null;
  }

  const labels = new Set<string>();

  for (const pattern of accept.split(",").map((item) => item.trim()).filter(Boolean)) {
    const wildcard = WILDCARD_LABELS[pattern];

    if (wildcard) {
      wildcard.forEach((label) => labels.add(label));
      continue;
    }

    const known = MIME_LABELS[pattern];

    if (known) {
      labels.add(known);
      continue;
    }

    if (pattern.startsWith(".")) {
      labels.add(pattern.slice(1).toUpperCase());
      continue;
    }

    const subtype = pattern.split("/")[1];

    if (subtype && subtype !== "*") {
      labels.add(subtype.toUpperCase());
    }
  }

  return labels.size > 0 ? Array.from(labels).join(", ") : null;
}

const acceptedTypesLine = (() => {
  const sizeLabel = formatFileSize(MAX_ASSET_UPLOAD_BYTES);
  return (accept?: string) => {
    const types = describeAcceptedTypes(accept);
    return types ? `${types} up to ${sizeLabel} each` : `Up to ${sizeLabel} each`;
  };
})();

/** Splits "photo.jpg" into ["photo", ".jpg"] so the extension can be muted. */
function splitExtension(fileName: string): [string, string] {
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex > 0 ? [fileName.slice(0, dotIndex), fileName.slice(dotIndex)] : [fileName, ""];
}

type GalleryControlProps = {
  accept?: string;
  /** Disables the drop zone (new files can't be added) — items already there can still be reordered, captioned, or removed. Used while this field's pending files are uploading, so a fresh drop can't race that upload. */
  disabled?: boolean;
  /** Id of the hidden multi-file input, so `FormField`'s label stays wired to it. */
  inputId: string;
  items: GalleryItem[];
  /** Shown as "N / maxItems" next to the count when provided. */
  maxItems?: number;
  /** Files still being decoded/resized/re-encoded client-side for this field — rendered as skeleton rows. Nothing has been uploaded yet. */
  optimizingCount: number;
  onFiles: (files: File[]) => void;
  onChange: (items: GalleryItem[]) => void;
};

/**
 * Multi-image field: a drop zone that's always visible at the top (never
 * swapped out once there are items — the empty state IS the drop zone), and
 * a vertical list of rows below it, one per image, with a drag handle for
 * reordering (native HTML5 drag-and-drop, with an ArrowUp/ArrowDown keyboard
 * fallback on the handle itself). Uploads are the caller's job — this
 * component only ever hands back the files the editor picked or dropped
 * (`onFiles`) and the reordered/captioned/trimmed item list (`onChange`).
 */
export function GalleryControl({ accept, disabled, inputId, items, maxItems, optimizingCount, onFiles, onChange }: GalleryControlProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [hasRejectedFile, setHasRejectedFile] = useState(false);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{ index: number; position: "before" | "after" } | null>(null);
  const [announcement, setAnnouncement] = useState("");
  // Drag state lives in a ref too: dragover fires continuously, and reading
  // draggingIndex from a stale closure inside that handler would break the
  // very first drag of a session (before a re-render lands).
  const draggingIndexRef = useRef<number | null>(null);

  function acceptFiles(fileList: FileList | null) {
    const files = fileList ? Array.from(fileList) : [];

    if (files.length === 0) {
      return;
    }

    const accepted = files.filter((file) => matchesAccept(file, accept));
    setHasRejectedFile(accepted.length < files.length);

    if (accepted.length > 0) {
      onFiles(accepted);
    }
  }

  function handleDropZoneDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  }

  function handleDropZoneDragLeave(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
  }

  function handleDropZoneDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);

    if (!disabled) {
      acceptFiles(event.dataTransfer.files);
    }
  }

  function removeItem(index: number) {
    onChange(items.filter((_, itemIndex) => itemIndex !== index));
  }

  function updateCaption(index: number, caption: string) {
    onChange(items.map((item, itemIndex) => (itemIndex === index ? { ...item, caption } : item)));
  }

  function moveItem(from: number, to: number) {
    if (to < 0 || to >= items.length || to === from) {
      return;
    }

    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
    setAnnouncement(`Moved image to position ${to + 1} of ${items.length}.`);
  }

  function handleHandleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveItem(index, index - 1);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      moveItem(index, index + 1);
    }
  }

  function handleRowDragStart(event: DragEvent<HTMLButtonElement>, index: number) {
    draggingIndexRef.current = index;
    setDraggingIndex(index);
    event.dataTransfer.effectAllowed = "move";
    // Firefox requires data to be set for the drag to start at all.
    event.dataTransfer.setData("text/plain", String(index));
  }

  function handleRowDragOver(event: DragEvent<HTMLDivElement>, index: number) {
    if (draggingIndexRef.current === null) {
      return;
    }

    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const position = event.clientY - rect.top < rect.height / 2 ? "before" : "after";
    setDropIndicator((current) => (current?.index === index && current.position === position ? current : { index, position }));
  }

  function handleRowDrop(event: DragEvent<HTMLDivElement>, index: number) {
    event.preventDefault();
    const from = draggingIndexRef.current;
    const indicator = dropIndicator;
    setDraggingIndex(null);
    setDropIndicator(null);
    draggingIndexRef.current = null;

    if (from === null || !indicator || indicator.index !== index) {
      return;
    }

    let to = indicator.position === "before" ? index : index + 1;
    if (from < to) {
      // Removing the dragged item first shifts everything after it left by one.
      to -= 1;
    }

    moveItem(from, to);
  }

  function handleRowDragEnd() {
    setDraggingIndex(null);
    setDropIndicator(null);
    draggingIndexRef.current = null;
  }

  const errorMessage = hasRejectedFile ? <p className="m-0 text-ui text-cms-danger">That file type isn&apos;t accepted here.</p> : null;
  const typesLine = acceptedTypesLine(accept);
  // Keys by `src` alone (not index) so reordering/deleting doesn't remount a
  // row a caption input is focused in. Duplicate URLs (same image added
  // twice) get an occurrence suffix rather than colliding.
  const srcOccurrences = new Map<string, number>();

  return (
    <div className="grid gap-2">
      {/* Always visible — the empty state IS this drop zone, never a
          different layout, so adding the first image never feels like a
          different control than adding the fifth. */}
      <label
        className={cn(
          "relative flex min-h-20 flex-col items-center justify-center gap-1 rounded-cms border border-dashed border-cms-track bg-cms-surface px-4 py-3 text-center transition-colors",
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
          isDragging && "border-cms-accent bg-cms-raised",
          fileLabelFocusRing
        )}
        onDragLeave={handleDropZoneDragLeave}
        onDragOver={handleDropZoneDragOver}
        onDrop={handleDropZoneDrop}
      >
        <ImagePlus aria-hidden="true" className="text-cms-muted" size={18} />
        <span className="text-ui font-medium text-cms-text">Choose files or drag &amp; drop them here.</span>
        <span className="text-ui text-cms-subtle">{typesLine}</span>
        <span className={cn(buttonVariants({ variant: "normal", size: "sm" }), "pointer-events-none mt-1")}>
          <Upload aria-hidden="true" size={12} />
          Browse files
        </span>
        {/* Covers the whole label instead of `sr-only`: see asset-field.tsx's
            matching comment — this keeps the input's own rect identical to
            the always-visible drop zone, so focusing it (label click
            forwarding, or the OS picker returning focus) never has anywhere
            new to scroll to. */}
        <input
          accept={accept}
          className="absolute inset-0 cursor-[inherit] opacity-0"
          disabled={disabled}
          id={inputId}
          multiple
          onChange={(event) => {
            acceptFiles(event.target.files);
            event.target.value = "";
          }}
          type="file"
        />
      </label>
      {errorMessage}

      {items.length > 0 || optimizingCount > 0 ? (
        <div className="grid gap-1.5">
          {items.map((item, index) => {
            const meta = getAssetMeta(item.src);
            const fileName = meta?.fileName ?? fileNameFromUrl(item.src);
            const [baseName, extension] = splitExtension(fileName);
            const sizeLabel = formatAssetSize(meta);
            const isPending = isPendingUpload(item.src);
            const occurrence = (srcOccurrences.get(item.src) ?? 0) + 1;
            srcOccurrences.set(item.src, occurrence);
            const rowKey = occurrence > 1 ? `${item.src}#${occurrence}` : item.src;

            return (
              <div
                className={cn(
                  "relative flex items-center gap-2.5 rounded-cms border border-cms-line-strong bg-cms-surface p-2 transition-opacity",
                  draggingIndex === index && "opacity-40"
                )}
                key={rowKey}
                onDragOver={(event) => handleRowDragOver(event, index)}
                onDrop={(event) => handleRowDrop(event, index)}
              >
                {dropIndicator?.index === index ? (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute inset-x-2 h-0.5 rounded-full bg-cms-accent",
                      dropIndicator.position === "before" ? "-top-0.75" : "-bottom-0.75"
                    )}
                  />
                ) : null}
                <BareIconButton
                  aria-label={`Reorder ${fileName}. Position ${index + 1} of ${items.length}. Use the arrow keys to move it.`}
                  className="shrink-0 cursor-grab touch-none active:cursor-grabbing"
                  draggable
                  onDragEnd={handleRowDragEnd}
                  onDragStart={(event) => handleRowDragStart(event, index)}
                  onKeyDown={(event) => handleHandleKeyDown(event, index)}
                >
                  <GripVertical aria-hidden="true" size={14} />
                </BareIconButton>
                <div className="size-16 shrink-0 overflow-hidden rounded-cms bg-cms-bg">
                  <img alt="" className="size-full object-cover" src={item.src} />
                </div>
                <div className="flex-1">
                  <div className="min-w-24 shrink-0">
                    <p className="m-0 flex items-center gap-1.5 truncate text-ui font-medium text-cms-text">
                      <span className="truncate">
                        {baseName}
                        <span className="text-cms-subtle">{extension}</span>
                      </span>
                      {isPending ? (
                        <span className="shrink-0 rounded-cms-sm bg-cms-pending/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cms-pending">
                          Pending upload
                        </span>
                      ) : null}
                    </p>
                    {sizeLabel ? <p className="m-0 text-ui text-cms-subtle">{sizeLabel}</p> : null}
                  </div>
                  <Input
                    className="min-w-0 flex-1 mt-1"
                    onChange={(event) => updateCaption(index, event.target.value)}
                    placeholder="Caption (optional)"
                    value={item.caption ?? ""}
                  />
                </div>
                <BareIconButton
                  aria-label={`Remove ${fileName}`}
                  className="shrink-0 text-cms-muted hover:text-cms-danger"
                  onClick={() => removeItem(index)}
                >
                  <Trash2 aria-hidden="true" size={14} />
                </BareIconButton>
              </div>
            );
          })}
          {Array.from({ length: optimizingCount }, (_, index) => (
            <div
              aria-hidden="true"
              className="flex items-center gap-2.5 rounded-cms border border-cms-line-strong bg-cms-surface p-2"
              key={`optimizing-${index}`}
            >
              <div className="size-16 shrink-0 animate-pulse rounded-cms bg-cms-raised" />
              <div className="grid flex-1 gap-1.5">
                <div className="h-3 w-1/3 animate-pulse rounded-cms-sm bg-cms-raised" />
                <div className="h-3 w-1/5 animate-pulse rounded-cms-sm bg-cms-raised" />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex items-center gap-2 text-ui text-cms-subtle">
        <span>
          {items.length}
          {maxItems ? ` / ${maxItems}` : ""} image{items.length === 1 ? "" : "s"}
        </span>
        {optimizingCount > 0 ? (
          <span>
            · Optimising {optimizingCount} image{optimizingCount === 1 ? "" : "s"}…
          </span>
        ) : null}
      </div>
      <span aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </div>
  );
}
