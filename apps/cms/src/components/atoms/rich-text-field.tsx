import { lazy, Suspense, useEffect, useRef } from "react";
import { cn } from "@three-acts/utils";
import { normalizeMarkdown } from "../../lib/normalize-markdown";
import { inputVariants } from "./styles";

// TipTap + tiptap-markdown are a meaningfully sized dependency, so the actual
// implementation only loads once a `richtext` field is on screen, rather than
// being part of the CMS's main bundle.
const RichTextEditor = lazy(() => import("./rich-text-editor"));

export type RichTextControlProps = {
  value: string;
  onChange: (markdown: string) => void;
  /** Renders the markdown as formatted HTML instead of an editable surface. */
  readOnly?: boolean;
};

export function RichTextControl({ value, onChange, readOnly }: RichTextControlProps) {
  // The editor round-trips markdown through its document model, so it can
  // call onChange with whitespace/line-ending-only differences from what it
  // was just given (on initial load, or after any edit) — never a real
  // change. Track the last normalized value this control has seen, from
  // either an incoming `value` or an emission of its own, and only forward a
  // change when it's genuinely different, so a mere re-serialisation never
  // marks the record dirty.
  const lastNormalizedRef = useRef(normalizeMarkdown(value));

  useEffect(() => {
    lastNormalizedRef.current = normalizeMarkdown(value);
  }, [value]);

  function handleChange(markdown: string) {
    const normalized = normalizeMarkdown(markdown);

    if (normalized === lastNormalizedRef.current) {
      return;
    }

    lastNormalizedRef.current = normalized;
    onChange(markdown);
  }

  return (
    <Suspense fallback={<div className={cn(inputVariants({ tone: "display" }), "min-h-22")}>Loading editor…</div>}>
      <RichTextEditor onChange={handleChange} readOnly={readOnly} value={value} />
    </Suspense>
  );
}
