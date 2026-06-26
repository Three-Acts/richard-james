import type { ButtonHTMLAttributes } from "react";
import { cn } from "@three-acts/utils";
import { buttonVariants, type ButtonVariant } from "./styles";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({ className, type = "button", variant = "normal", ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant }), className)} type={type} {...props} />;
}
