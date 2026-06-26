import type { TextareaHTMLAttributes } from "react";
import { cn } from "@three-acts/template";
import { inputClass } from "./styles";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputClass, className)} {...props} />;
}
