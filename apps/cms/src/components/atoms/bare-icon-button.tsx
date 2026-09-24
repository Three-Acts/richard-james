import type { ButtonHTMLAttributes, ReactElement } from "react";
import { Button as BaseButton } from "@base-ui-components/react/button";
import { cn } from "@three-acts/utils";
import { iconButtonVariants } from "./styles";

type BareIconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Compose the button with a Base UI part, e.g. `<Tooltip.Trigger />`. */
  render?: ReactElement<Record<string, unknown>>;
  /** Set false when `render` is not a real <button> (e.g. an anchor) so Base UI adds the button semantics itself. */
  nativeButton?: boolean;
};

/** Flat icon-only action for chrome headers (24px, no fill until hover). */
export function BareIconButton({ className, nativeButton = true, type = "button", ...props }: BareIconButtonProps) {
  return (
    <BaseButton
      className={cn(iconButtonVariants({ tone: "bare" }), className)}
      nativeButton={nativeButton}
      type={nativeButton ? type : undefined}
      {...props}
    />
  );
}
