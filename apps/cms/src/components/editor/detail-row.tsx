import type { ReactNode } from "react";

export function DetailRow({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="grid min-w-0 gap-2">
      <span className="text-[11px] text-cms-text">{label}</span>
      <span className="truncate text-cms-muted">{children}</span>
    </div>
  );
}
