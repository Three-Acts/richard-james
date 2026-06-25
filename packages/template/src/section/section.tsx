import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../class-names";

type RootProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  className?: string;
};

function Root({ children, className, ...props }: RootProps) {
  return (
    <section className={cn("py-16", className)} {...props}>
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

export type { ContainerProps, RootProps };
