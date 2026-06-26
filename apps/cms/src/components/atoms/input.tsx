import type { ComponentPropsWithoutRef } from "react";
import { Input as BaseInput } from "@base-ui-components/react/input";
import { cn } from "@three-acts/utils";
import { inputClass } from "./styles";

type InputProps = Omit<ComponentPropsWithoutRef<typeof BaseInput>, "className"> & { className?: string };

export function Input({ className, ...props }: InputProps) {
  return <BaseInput className={cn(inputClass, className)} {...props} />;
}
