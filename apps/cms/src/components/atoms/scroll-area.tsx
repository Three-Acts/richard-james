import type { ReactNode } from "react";
import { ScrollArea as BaseScrollArea } from "@base-ui-components/react/scroll-area";
import { cn } from "@three-acts/utils";

type ScrollAreaProps = {
  children: ReactNode;
  className?: string;
  viewportClassName?: string;
};

const scrollbar =
  "m-0.5 flex touch-none select-none rounded bg-transparent opacity-0 transition-opacity delay-300 data-[hovering]:opacity-100 data-[hovering]:delay-0 data-[scrolling]:opacity-100 data-[scrolling]:delay-0";

// Base UI ScrollArea wrapper. Place inside a bounded flex/grid cell
// (e.g. `flex-1 min-h-0`) so the viewport can scroll its overflow.
export function ScrollArea({ children, className, viewportClassName }: ScrollAreaProps) {
  return (
    <BaseScrollArea.Root className={cn("min-h-0", className)}>
      <BaseScrollArea.Viewport className={cn("size-full overscroll-contain", viewportClassName)}>{children}</BaseScrollArea.Viewport>
      <BaseScrollArea.Scrollbar className={cn(scrollbar, "w-2 justify-center")} orientation="vertical">
        <BaseScrollArea.Thumb className="w-full rounded-full bg-cms-track" />
      </BaseScrollArea.Scrollbar>
      <BaseScrollArea.Scrollbar className={cn(scrollbar, "h-2 flex-col justify-center")} orientation="horizontal">
        <BaseScrollArea.Thumb className="h-full rounded-full bg-cms-track" />
      </BaseScrollArea.Scrollbar>
      <BaseScrollArea.Corner />
    </BaseScrollArea.Root>
  );
}
