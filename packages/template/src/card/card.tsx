import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../class-names";

type MarketingProps = HTMLAttributes<HTMLElement> & {
  body: ReactNode;
  className?: string;
  title: ReactNode;
};

function Marketing({ body, className, title, ...props }: MarketingProps) {
  return (
    <article className={cn("rounded-lg border border-ink/10 bg-paper p-6", className)} {...props}>
      <h3 className="font-serif text-3xl font-semibold">{title}</h3>
      <p className="mt-4 leading-7 text-charcoal">{body}</p>
    </article>
  );
}

export const Card = {
  Marketing
};

export type { MarketingProps };
