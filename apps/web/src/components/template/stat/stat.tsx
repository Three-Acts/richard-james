/* eslint-disable react-refresh/only-export-components */
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@three-acts/utils";

type RootProps = HTMLAttributes<HTMLDivElement> & {
  className?: string;
  label: ReactNode;
  value: ReactNode;
};

function Root({ className, label, value, ...props }: RootProps) {
  return (
    <div className={cn("border-l border-ink/15 pl-4", className)} {...props}>
      <dt className="font-serif text-3xl font-semibold">{value}</dt>
      <dd className="mt-1 text-sm leading-5 text-charcoal">{label}</dd>
    </div>
  );
}

export const Stat = {
  Root
};

export type { RootProps };
