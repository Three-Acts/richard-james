/* eslint-disable react-refresh/only-export-components */
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@three-acts/utils";

type MarketingProps = HTMLAttributes<HTMLElement> & {
  body: ReactNode;
  className?: string;
  title: ReactNode;
};

function Marketing({ body, className, title, ...props }: MarketingProps) {
  return (
    <article className={cn("border border-black bg-white p-6", className)} {...props}>
      <h3 className="text-3xl font-semibold tracking-tight">{title}</h3>
      <p className="mt-4 leading-7 text-neutral-700">{body}</p>
    </article>
  );
}

export const Card = {
  Marketing
};

export type { MarketingProps };
