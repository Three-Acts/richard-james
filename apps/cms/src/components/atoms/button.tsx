import type { ButtonHTMLAttributes, ReactElement } from "react";
import { Button as BaseButton } from "@base-ui-components/react/button";
import { cn } from "@three-acts/utils";
import { buttonVariants, type ButtonSize, type ButtonVariant } from "./styles";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Compose the button with a Base UI part, e.g. `<Toolbar.Button />`. */
  render?: ReactElement<Record<string, unknown>>;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

export function Button({ className, size = "sm", type = "button", variant = "normal", ...props }: ButtonProps) {
  return <BaseButton className={cn(buttonVariants({ size, variant }), className)} type={type} {...props} />;
}
