import type { ReactNode } from "react";
import { cn } from "@three-acts/template";

// Single source of truth for chrome header height (40px) and padding,
// shared by the records toolbar, record list pane, editor, and sidebar.
export function PanelHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <header className={cn("flex h-10 shrink-0 items-center gap-2.5 border-b border-cms-raised px-3", className)}>{children}</header>
  );
}
