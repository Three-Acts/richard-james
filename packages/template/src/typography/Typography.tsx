import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../classNames";

type EyebrowProps = HTMLAttributes<HTMLParagraphElement> & {
  children: ReactNode;
  className?: string;
};

function Eyebrow({ children, className, ...props }: EyebrowProps) {
  return (
    <p className={cn("text-sm font-semibold uppercase tracking-[0.18em] text-rust", className)} {...props}>
      {children}
    </p>
  );
}

export const Typography = {
  Eyebrow
};

export type { EyebrowProps };
