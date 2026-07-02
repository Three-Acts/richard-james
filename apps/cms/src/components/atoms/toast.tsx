/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { CheckCircle2, Info, Loader2, X, XCircle } from "lucide-react";
import { cn } from "@three-acts/utils";

export type ToastTone = "loading" | "success" | "error" | "info";

export type ToastOptions = {
  tone?: ToastTone;
  title: string;
  description?: string;
  /** Auto-dismiss after this many ms. Omit to keep the toast until updated/dismissed. */
  duration?: number;
};

type ToastRecord = ToastOptions & { id: number; tone: ToastTone };

type ToastApi = {
  push: (options: ToastOptions) => number;
  update: (id: number, options: ToastOptions) => void;
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const toneStyles: Record<ToastTone, { icon: ReactNode; accent: string }> = {
  loading: { icon: <Loader2 size={14} className="animate-spin" />, accent: "text-cms-info" },
  success: { icon: <CheckCircle2 size={14} />, accent: "text-cms-success" },
  error: { icon: <XCircle size={14} />, accent: "text-red-400" },
  info: { icon: <Info size={14} />, accent: "text-cms-muted" }
};

/**
 * Self-contained toast system for the CMS (Base UI has no toast primitive in
 * the installed version). Toasts render bottom-right and can be updated in
 * place — used by the publish flow to move a single toast through
 * queued → building → deployed.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const clearTimer = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const dismiss = useCallback(
    (id: number) => {
      clearTimer(id);
      setToasts((current) => current.filter((toast) => toast.id !== id));
    },
    [clearTimer]
  );

  const scheduleDismiss = useCallback(
    (id: number, duration?: number) => {
      clearTimer(id);
      if (duration && duration > 0) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), duration)
        );
      }
    },
    [clearTimer, dismiss]
  );

  const push = useCallback(
    (options: ToastOptions) => {
      const id = nextId.current++;
      const record: ToastRecord = { id, tone: options.tone ?? "info", ...options };
      setToasts((current) => [...current, record]);
      scheduleDismiss(id, options.duration);
      return id;
    },
    [scheduleDismiss]
  );

  const update = useCallback(
    (id: number, options: ToastOptions) => {
      setToasts((current) => current.map((toast) => (toast.id === id ? { ...toast, tone: options.tone ?? "info", ...options } : toast)));
      scheduleDismiss(id, options.duration);
    },
    [scheduleDismiss]
  );

  const api = useMemo<ToastApi>(() => ({ push, update, dismiss }), [push, update, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-3.5 right-3.5 z-[100] flex w-80 max-w-[calc(100vw-1.75rem)] flex-col gap-2" role="region" aria-label="Notifications">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.tone === "error" ? "alert" : "status"}
            className="pointer-events-auto flex items-start gap-2.5 rounded-md border border-cms-raised bg-cms-surface px-3 py-2.5 text-[11.5px] text-cms-text shadow-2xl shadow-black/50"
          >
            <span className={cn("mt-px shrink-0", toneStyles[toast.tone].accent)}>{toneStyles[toast.tone].icon}</span>
            <div className="min-w-0 flex-1">
              <p className="m-0 font-semibold">{toast.title}</p>
              {toast.description ? <p className="m-0 mt-0.5 text-cms-muted">{toast.description}</p> : null}
            </div>
            <button
              aria-label="Dismiss notification"
              className="-mr-1 -mt-0.5 shrink-0 rounded p-0.5 text-cms-muted transition hover:bg-cms-raised hover:text-cms-text"
              onClick={() => dismiss(toast.id)}
              type="button"
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider.");
  }
  return context;
}
