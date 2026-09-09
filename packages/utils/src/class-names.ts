import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge classifies unknown `text-*` values as colors, so a custom font
 * size (`text-field`) and a custom color (`text-cms-text`) look like the same
 * conflict group and one gets dropped. Registering the project's `--text-*`
 * scale keeps size and color independent.
 *
 * Keep in sync with the `--text-*` tokens in @three-acts/config/theme.css.
 */
const merge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["micro", "ui", "ui-lg", "field", "display"]
    }
  }
});

export function cn(...classes: Array<string | false | null | undefined>) {
  return merge(classes.filter(Boolean).join(" "));
}
