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
    <div className={cn("border-l border-black pl-4", className)} {...props}>
      <dt className="text-3xl font-semibold tracking-tight">{value}</dt>
      <dd className="mt-1 text-sm leading-5 text-neutral-700">{label}</dd>
    </div>
  );
}

export const Stat = {
  Root
};

export type { RootProps };
