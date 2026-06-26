import type { ReactNode } from "react";

export function EditorSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="border-b border-cms-raised px-3 py-4">
      <h3 className="mb-3.5 text-[12px] font-semibold leading-tight text-cms-text">{title}</h3>
      {children}
    </section>
  );
}
