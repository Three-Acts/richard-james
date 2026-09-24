import type { ReactElement, ReactNode } from "react";
import { Tooltip as BaseTooltip } from "@base-ui-components/react/tooltip";
import { cn } from "@three-acts/utils";
import { popupClass } from "./styles";

type TooltipProps = {
  /** The trigger. Must accept a `render` prop or forward props to a DOM element. */
  children: ReactElement<Record<string, unknown>>;
  content: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
};

/** Shares the open/close delay across every CMS tooltip. Mount once, at the app root. */
export function TooltipProvider({ children }: { children: ReactNode }) {
  return <BaseTooltip.Provider delay={400}>{children}</BaseTooltip.Provider>;
}

/**
 * Base UI Tooltip in place of the `title` attribute: it is keyboard accessible,
 * announced by screen readers, and readable on touch.
 */
export function Tooltip({ children, content, side = "bottom" }: TooltipProps) {
  return (
    <BaseTooltip.Root>
      <BaseTooltip.Trigger render={children} />
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner className="z-70" side={side} sideOffset={6}>
          <BaseTooltip.Popup className={cn(popupClass, "max-w-60 rounded-cms px-2 py-1 text-ui text-cms-muted")}>{content}</BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
}
