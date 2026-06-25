import { Button as BaseButton } from "@base-ui-components/react/button";
import type { AnchorHTMLAttributes, ComponentProps, ReactNode } from "react";
import { cn } from "../classNames";

type ButtonVariant = "primary" | "secondary" | "light";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-ink text-paper shadow-soft hover:bg-charcoal",
  secondary: "border border-ink/15 text-ink hover:bg-panel",
  light: "bg-paper text-rust hover:bg-panel"
};

type RootProps = ComponentProps<typeof BaseButton> & {
  children: ReactNode;
  className?: string;
  variant?: ButtonVariant;
};

function Root({ children, className, variant = "primary", ...props }: RootProps) {
  return (
    <BaseButton
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </BaseButton>
  );
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
  className?: string;
  variant?: ButtonVariant;
};

function Link({ children, className, variant = "primary", ...props }: LinkProps) {
  return (
    <a
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </a>
  );
}

export const Button = {
  Root,
  Link
};

export type { LinkProps, RootProps };
