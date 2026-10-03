import { GripVertical } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { focusRing, Tooltip } from "../atoms";
import { cn } from "@three-acts/utils";

export function RecordDragHandle({ title, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { title: string }) {
  return (
    <Tooltip content={props.disabled ? "Clear search and exit selection mode to reorder" : "Drag to reorder, or use the up and down arrow keys"}>
      <button {...props} aria-label={`Reorder ${title}`} type="button" className={cn("flex h-8 w-8 shrink-0 items-center justify-center text-cms-subtle hover:text-cms-text disabled:cursor-default disabled:opacity-40 enabled:cursor-grab enabled:active:cursor-grabbing", focusRing)}>
        <GripVertical aria-hidden="true" size={14} />
      </button>
    </Tooltip>
  );
}
