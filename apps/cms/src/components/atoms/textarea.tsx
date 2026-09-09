import type { ComponentPropsWithoutRef, TextareaHTMLAttributes } from "react";
import { Field } from "@base-ui-components/react/field";
import { cn } from "@three-acts/utils";
import { inputVariants } from "./styles";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  // Field.Control is typed for `<input>`; rendering it as a `<textarea>` keeps the
  // Field label/description/validation wiring that Base UI has no textarea part for.
  const controlProps = props as ComponentPropsWithoutRef<typeof Field.Control>;

  return <Field.Control className={cn(inputVariants(), className)} render={<textarea />} {...controlProps} />;
}
