import type { ReactNode } from "react";

export function DetailRow({ children, description, label }: { children: ReactNode; description: string; label: string }) {
  return (
    <div className="grid min-w-0 gap-1">
      <span className="text-ui font-medium text-cms-muted">{label}</span>
      <span className="mb-1 text-ui text-cms-subtle">{description}</span>
      <span className="truncate text-ui text-cms-muted">{children}</span>
    </div>
  );
}
