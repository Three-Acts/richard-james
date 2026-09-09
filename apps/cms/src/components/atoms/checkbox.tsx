import { Check, Minus } from "lucide-react";
import { Checkbox as BaseCheckbox } from "@base-ui-components/react/checkbox";
import { cn } from "@three-acts/utils";
import { focusRing } from "./styles";

type CheckboxProps = {
  ariaLabel?: string;
  checked: boolean;
  className?: string;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
};

export function Checkbox({ ariaLabel, checked, className, indeterminate, onChange }: CheckboxProps) {
  return (
    <BaseCheckbox.Root
      aria-label={ariaLabel}
      checked={checked}
      className={cn(
        "grid size-4 place-items-center rounded-cms-sm border border-cms-track bg-cms-surface text-cms-accent-ink transition-colors",
        "data-[checked]:border-cms-accent data-[checked]:bg-cms-accent",
        "data-[indeterminate]:border-cms-accent data-[indeterminate]:bg-cms-accent",
        focusRing,
        className
      )}
      indeterminate={indeterminate}
      onCheckedChange={(value) => onChange(value === true)}
    >
      <BaseCheckbox.Indicator className="flex">
        {indeterminate ? <Minus size={11} strokeWidth={3} /> : <Check size={11} strokeWidth={3} />}
      </BaseCheckbox.Indicator>
    </BaseCheckbox.Root>
  );
}
