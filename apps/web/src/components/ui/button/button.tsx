/* eslint-disable react-refresh/only-export-components */
import { Button as BaseButton } from "@base-ui-components/react/button";
import type { AnchorHTMLAttributes, ComponentProps, ReactNode } from "react";
import { cn, cv } from "@three-acts/utils";

type ButtonVariant = "primary" | "secondary" | "light";

const buttonVariants = cv({
  base: "inline-flex min-h-11 items-center justify-center border px-5 py-3 text-sm font-semibold no-underline transition disabled:cursor-not-allowed disabled:opacity-60",
  variants: {
    variant: {
      primary: ["border-black bg-black !text-white hover:bg-white hover:!text-black"],
      secondary: ["border-black bg-white !text-black hover:bg-black hover:!text-white"],
      light: ["border-white bg-white !text-black hover:bg-black hover:!text-white"]
    }
  },
  defaultVariants: { variant: "primary" }
});

type RootProps = ComponentProps<typeof BaseButton> & {
  children: ReactNode;
  className?: string;
  variant?: ButtonVariant;
};

function Root({ children, className, variant = "primary", ...props }: RootProps) {
  return (
    <BaseButton
      className={cn(buttonVariants({ variant }), className)}
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
      className={cn(buttonVariants({ variant }), className)}
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
