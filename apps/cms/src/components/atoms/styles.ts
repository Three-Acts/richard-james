import { cv } from "@three-acts/template";

// Shared class fragments for the dense, dark CMS control surfaces.
// Solid shades from the Webflow reference (see theme.css cms-* tokens) — no opacity fills.

export const controlShadow =
  "shadow-[inset_0_0.5px_0.5px_rgb(255_255_255_/_0.12),0_0.5px_1px_rgb(0_0_0_/_0.8)]";

// Shared field-control surface (inputs, textareas, selects).
export const inputClass =
  "min-h-7 w-full rounded border border-cms-raised bg-cms-surface px-2 py-1 text-[13px] text-cms-text outline-none shadow-inner shadow-black/50 focus:border-cms-accent focus:ring-1 focus:ring-cms-accent";

export type ButtonVariant = "normal" | "primary";

// The Paper buttons: "normal" is the raised dark surface, "primary" is solid accent (#006ACC).
// Exported so non-<button> elements (e.g. the asset-upload <label>) can share it.
export const buttonVariants = cv({
  base: `inline-flex h-6 items-center justify-center gap-1.5 rounded px-2 text-[11.5px] leading-none text-cms-text transition ${controlShadow} disabled:cursor-not-allowed disabled:opacity-55`,
  variants: {
    variant: {
      normal: ["bg-cms-surface hover:bg-cms-raised"],
      primary: ["bg-cms-accent hover:bg-cms-accent-hover"]
    }
  },
  defaultVariants: { variant: "normal" }
});
