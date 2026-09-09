import type { ReactElement, ReactNode } from "react";
import { useRender } from "@base-ui-components/react/use-render";
import { cn } from "@three-acts/utils";
import { panelHeaderClass } from "./styles";

type PanelHeaderProps = {
  children: ReactNode;
  className?: string;
  /** Compose the header with a Base UI part, e.g. `<Toolbar.Root />`. */
  render?: ReactElement<Record<string, unknown>>;
};

// Single source of truth for chrome header height (40px) and padding,
// shared by the records toolbar, record list pane, editor, and sidebar.
export function PanelHeader({ children, className, render }: PanelHeaderProps) {
  return useRender({
    defaultTagName: "header",
    render,
    props: { children, className: cn(panelHeaderClass, className) }
  });
}
