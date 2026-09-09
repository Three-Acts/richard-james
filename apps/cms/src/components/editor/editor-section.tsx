import type { ReactNode } from "react";
import { eyebrowClass } from "../atoms";

export function EditorSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="border-b border-cms-line px-3 py-4 last:border-b-0">
      <h3 className={`mb-3 ${eyebrowClass}`}>{title}</h3>
      {children}
    </section>
  );
}
