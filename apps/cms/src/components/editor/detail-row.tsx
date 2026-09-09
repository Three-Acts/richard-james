import type { ReactNode } from "react";

export function DetailRow({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="grid min-w-0 gap-1">
      <span className="text-ui text-cms-subtle">{label}</span>
      <span className="truncate text-ui text-cms-muted">{children}</span>
    </div>
  );
}
