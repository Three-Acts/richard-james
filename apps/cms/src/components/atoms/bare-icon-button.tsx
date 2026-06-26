import type { ButtonHTMLAttributes } from "react";
import { cn } from "@three-acts/utils";

export function BareIconButton({ className, type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "grid size-[22px] place-items-center rounded text-cms-muted transition hover:bg-cms-raised hover:text-cms-text",
        className
      )}
      type={type}
      {...props}
    />
  );
}
