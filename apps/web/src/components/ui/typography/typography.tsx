/* eslint-disable react-refresh/only-export-components */
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@three-acts/utils";

type EyebrowProps = HTMLAttributes<HTMLParagraphElement> & {
  children: ReactNode;
  className?: string;
};

function Eyebrow({ children, className, ...props }: EyebrowProps) {
  return (
    <p className={cn("text-sm font-semibold uppercase tracking-eyebrow text-black", className)} {...props}>
      {children}
    </p>
  );
}

export const Typography = {
  Eyebrow
};

export type { EyebrowProps };
