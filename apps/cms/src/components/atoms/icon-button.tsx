import type { ButtonHTMLAttributes, ReactElement } from "react";
import { Button as BaseButton } from "@base-ui-components/react/button";
import { cn } from "@three-acts/utils";
import { iconButtonVariants } from "./styles";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Compose the button with a Base UI part, e.g. `<Toolbar.Button />`. */
  render?: ReactElement<Record<string, unknown>>;
};

/** Icon-only action that matches input height (28px) and sits raised off the panel. */
export function IconButton({ className, type = "button", ...props }: IconButtonProps) {
  return <BaseButton className={cn(iconButtonVariants({ tone: "raised" }), className)} type={type} {...props} />;
}
