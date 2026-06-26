import { Check } from "lucide-react";
import { Checkbox as BaseCheckbox } from "@base-ui-components/react/checkbox";
import { cn } from "@three-acts/utils";

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
        "grid size-4 place-items-center rounded-[3px] border border-cms-track bg-cms-surface text-white outline-none transition focus-visible:ring-1 focus-visible:ring-cms-accent data-[checked]:border-cms-accent data-[checked]:bg-cms-accent data-[indeterminate]:border-cms-accent data-[indeterminate]:bg-cms-accent",
        className
      )}
      indeterminate={indeterminate}
      onCheckedChange={(value) => onChange(value === true)}
    >
      <BaseCheckbox.Indicator className="flex">
        <Check size={12} strokeWidth={3} />
      </BaseCheckbox.Indicator>
    </BaseCheckbox.Root>
  );
}
