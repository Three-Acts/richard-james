/* eslint-disable react-refresh/only-export-components */
import { useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import { CheckCircle2, Info, Loader2, X, XCircle } from "lucide-react";
import { Toast } from "@base-ui-components/react/toast";
import { cn } from "@three-acts/utils";
import { focusRing, popupClass } from "./styles";

export type ToastTone = "loading" | "success" | "error" | "info";

export type ToastOptions = {
  tone?: ToastTone;
  title: string;
  description?: string;
  /** Auto-dismiss after this many ms. Omit to keep the toast until updated/dismissed. */
  duration?: number;
};

type ToastApi = {
  push: (options: ToastOptions) => string;
  update: (id: string, options: ToastOptions) => void;
  dismiss: (id: string) => void;
};

const toneStyles: Record<ToastTone, { icon: ReactNode; accent: string }> = {
  loading: { icon: <Loader2 size={14} className="animate-spin" />, accent: "text-cms-pending" },
  success: { icon: <CheckCircle2 size={14} />, accent: "text-cms-success" },
  error: { icon: <XCircle size={14} />, accent: "text-cms-danger" },
  info: { icon: <Info size={14} />, accent: "text-cms-muted" }
};

function toneOf(type: string | undefined): ToastTone {
  return type && type in toneStyles ? (type as ToastTone) : "info";
}

// Tone maps onto Base UI's `type`, which drives the icon and accent below.
// `timeout: 0` keeps a toast up until it is updated or dismissed — the publish
// flow relies on that to move one toast through queued → building → deployed.
function toBaseOptions({ description, duration, title, tone }: ToastOptions) {
  return {
    title,
    description,
    type: tone ?? "info",
    timeout: duration ?? 0,
    priority: tone === "error" ? ("high" as const) : ("low" as const)
  };
}

/**
 * Base UI Toast, styled for the CMS. Toasts render bottom-right and can be
 * swiped away or dismissed with the close button. Base UI puts the newest toast
 * first in the list, so the column is reversed to keep it nearest the corner.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <Toast.Provider timeout={0} limit={4}>
      {children}
      <Toast.Portal>
        <Toast.Viewport className="pointer-events-none fixed bottom-3.5 right-3.5 z-100 flex w-80 max-w-viewport-tight flex-col-reverse gap-2">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}

function ToastList() {
  const { toasts } = Toast.useToastManager();

  return toasts.map((toast) => {
    const tone = toneOf(toast.type);

    return (
      <Toast.Root
        key={toast.id}
        toast={toast}
        className={cn(
          popupClass,
          "pointer-events-auto flex items-start gap-2.5 px-3 py-2.5 text-ui",
          "transition-all duration-200 data-ending-style:opacity-0 data-starting-style:translate-y-2 data-starting-style:opacity-0"
        )}
      >
        <span className={cn("mt-px shrink-0", toneStyles[tone].accent)}>{toneStyles[tone].icon}</span>
        <div className="min-w-0 flex-1">
          <Toast.Title className="m-0 font-semibold" />
          {toast.description ? <Toast.Description className="m-0 mt-0.5 text-cms-muted" /> : null}
        </div>
        <Toast.Close
          aria-label="Dismiss notification"
          className={cn("-mr-1 -mt-0.5 shrink-0 rounded-cms-sm p-0.5 text-cms-subtle transition-colors hover:bg-cms-raised hover:text-cms-text", focusRing)}
        >
          <X size={13} />
        </Toast.Close>
      </Toast.Root>
    );
  });
}

/**
 * Push, update, and dismiss CMS toasts. The returned api is referentially
 * stable, so it is safe to list in effect dependency arrays.
 */
export function useToast(): ToastApi {
  // Base UI keeps add/update/close referentially stable, so the api below is too.
  const { add, close, update } = Toast.useToastManager();
  // Base UI's `update()` only merges fields onto an existing toast — it never
  // (re)schedules an auto-dismiss timer (those are only started in `add()`).
  // Track our own timer per toast id so an updated toast still auto-dismisses.
  const dismissTimersRef = useRef(new Map<string, number>());

  useEffect(() => {
    const dismissTimers = dismissTimersRef.current;

    return () => {
      dismissTimers.forEach((timer) => window.clearTimeout(timer));
      dismissTimers.clear();
    };
  }, []);

  return useMemo(() => {
    const clearScheduledDismiss = (id: string) => {
      const timer = dismissTimersRef.current.get(id);

      if (timer !== undefined) {
        window.clearTimeout(timer);
        dismissTimersRef.current.delete(id);
      }
    };

    return {
      push: (options) => add(toBaseOptions(options)),
      update: (id, options) => {
        clearScheduledDismiss(id);
        update(id, toBaseOptions(options));

        if (options.duration && options.duration > 0) {
          const timer = window.setTimeout(() => {
            dismissTimersRef.current.delete(id);
            close(id);
          }, options.duration);
          dismissTimersRef.current.set(id, timer);
        }
      },
      dismiss: (id) => {
        clearScheduledDismiss(id);
        close(id);
      }
    };
  }, [add, close, update]);
}
