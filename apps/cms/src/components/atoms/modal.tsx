import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Dialog } from "@base-ui-components/react/dialog";
import { cn } from "@three-acts/template";
import { BareIconButton } from "./bare-icon-button";
import { ScrollArea } from "./scroll-area";

type ModalProps = {
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
  onClose: () => void;
  open: boolean;
  title: string;
};

export function Modal({ children, className, footer, onClose, open, title }: ModalProps) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onClose();
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/60" />
        <Dialog.Popup
          className={cn(
            "fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-[560px] max-w-[calc(100vw-3rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border border-cms-raised bg-cms-bg text-cms-text shadow-2xl shadow-black/50 outline-none",
            className
          )}
        >
          <header className="flex h-11 shrink-0 items-center justify-between border-b border-cms-raised px-3">
            <Dialog.Title className="text-[12px] font-bold">{title}</Dialog.Title>
            <BareIconButton aria-label="Close" onClick={onClose}>
              <X size={16} />
            </BareIconButton>
          </header>
          <ScrollArea className="flex-1" viewportClassName="p-3 text-[11px]">
            {children}
          </ScrollArea>
          {footer ? <footer className="flex shrink-0 justify-end gap-1.5 border-t border-cms-raised px-3 py-2.5">{footer}</footer> : null}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
