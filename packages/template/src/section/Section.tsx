import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../classNames";

type SectionTone = "paper" | "panel" | "charcoal" | "rust";

const tones: Record<SectionTone, string> = {
  paper: "bg-paper text-ink",
  panel: "bg-panel text-ink",
  charcoal: "bg-charcoal text-panel",
  rust: "bg-rust text-paper"
};

type RootProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  className?: string;
  tone?: SectionTone;
};

function Root({ children, className, tone = "paper", ...props }: RootProps) {
  return (
    <section className={cn("py-16", tones[tone], className)} {...props}>
      {children}
    </section>
  );
}

type ContainerProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  className?: string;
};

function Container({ children, className, ...props }: ContainerProps) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl px-6", className)} {...props}>
      {children}
    </div>
  );
}

export const Section = {
  Container,
  Root
};

export type { ContainerProps, RootProps, SectionTone };
