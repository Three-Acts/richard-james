import type { ComponentPropsWithoutRef } from "react";
import { Input as BaseInput } from "@base-ui-components/react/input";
import { cn } from "@three-acts/utils";
import { inputVariants } from "./styles";

type InputProps = Omit<ComponentPropsWithoutRef<typeof BaseInput>, "className"> & {
  className?: string;
  /** Identifiers and slugs are scanned character by character, so set them in mono. */
  mono?: boolean;
};

export function Input({ className, mono, ...props }: InputProps) {
  return <BaseInput className={cn(inputVariants(), mono && "font-mono tabular-nums", className)} {...props} />;
}
