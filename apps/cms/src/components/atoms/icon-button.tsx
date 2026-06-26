import type { ButtonHTMLAttributes } from "react";
import { cn } from "@three-acts/template";
import { controlShadow } from "./styles";

export function IconButton({ className, type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn("grid size-7 place-items-center rounded bg-cms-surface text-cms-text transition hover:bg-cms-raised", controlShadow, className)}
      type={type}
      {...props}
    />
  );
}
