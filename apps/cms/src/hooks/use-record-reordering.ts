import { useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import type { CmsRecord } from "../cms/types";

type DropTarget = { id: string; after: boolean };

/** Pointer capture keeps dragging reliable for both a mouse and a touch screen. */
export function useRecordReordering(records: CmsRecord[], onReorder?: (recordId: string, position: number) => void, isBusy = false) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [target, setTarget] = useState<DropTarget | null>(null);
  const gesture = useRef<{ id: string; x: number; y: number; dragging: boolean; target: DropTarget | null } | null>(null);

  function clear() {
    gesture.current = null;
    setDraggedId(null);
    setTarget(null);
  }

  function rowProps(recordId: string) {
    return {
      "data-order-record": recordId,
      "data-order-drop": draggedId && target?.id === recordId ? (target.after ? "after" : "before") : undefined
    };
  }

  function handleProps(recordId: string) {
    return {
      disabled: !onReorder,
      "aria-disabled": !onReorder || isBusy,
      style: { touchAction: "none" },
      onClick(event: MouseEvent) { event.stopPropagation(); },
      onPointerDown(event: PointerEvent<HTMLButtonElement>) {
        if (!onReorder || isBusy || event.button !== 0 || !event.isPrimary) return;
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        gesture.current = { id: recordId, x: event.clientX, y: event.clientY, dragging: false, target: null };
      },
      onPointerMove(event: PointerEvent<HTMLButtonElement>) {
        const current = gesture.current;
        if (!current) return;
        if (!current.dragging && Math.hypot(event.clientX - current.x, event.clientY - current.y) < 4) return;
        if (!current.dragging) { current.dragging = true; setDraggedId(current.id); }
        const row = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-order-record]");
        if (!row || !records.some(record => record.id === row.dataset.orderRecord)) {
          current.target = null;
          setTarget(null);
          return;
        }
        const bounds = row.getBoundingClientRect();
        const next = { id: row.dataset.orderRecord!, after: event.clientY >= bounds.top + bounds.height / 2 };
        current.target = next;
        setTarget(previous => previous?.id === next.id && previous.after === next.after ? previous : next);
        // Continue through longer lists when the pointer approaches a scroll edge.
        for (let parent = row.parentElement; parent; parent = parent.parentElement) {
          if (!/(auto|scroll)/.test(getComputedStyle(parent).overflowY) || parent.scrollHeight <= parent.clientHeight) continue;
          const edge = parent.getBoundingClientRect();
          if (event.clientY < edge.top + 28) parent.scrollBy(0, -16);
          else if (event.clientY > edge.bottom - 28) parent.scrollBy(0, 16);
          break;
        }
      },
      onPointerUp(event: PointerEvent<HTMLButtonElement>) {
        const current = gesture.current;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        if (onReorder && !isBusy && current?.dragging && current.target) {
          const from = records.findIndex(record => record.id === current.id);
          const to = records.findIndex(record => record.id === current.target!.id);
          const insertion = to + (current.target.after ? 1 : 0);
          const position = insertion - (from < insertion ? 1 : 0) + 1;
          if (from >= 0 && to >= 0 && position !== from + 1) onReorder(current.id, position);
        }
        clear();
      },
      onPointerCancel: clear,
      onLostPointerCapture: clear,
      onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
        event.stopPropagation();
        if (!onReorder || isBusy || !["ArrowUp", "ArrowDown"].includes(event.key)) return;
        event.preventDefault();
        const index = records.findIndex(record => record.id === recordId);
        const nextIndex = index + (event.key === "ArrowUp" ? -1 : 1);
        if (index >= 0 && nextIndex >= 0 && nextIndex < records.length) onReorder(recordId, nextIndex + 1);
      }
    };
  }

  return { draggedId, rowProps, handleProps };
}
