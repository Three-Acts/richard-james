import { Check, ChevronsUpDown } from "lucide-react";
import { Select as BaseSelect } from "@base-ui-components/react/select";
import { cn } from "@three-acts/utils";
import { inputVariants, popupClass } from "./styles";

export type SelectOption = { label: string; value: string };

type SelectProps = {
  className?: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  value: string;
};

// Base UI Select associates itself with a surrounding Field label automatically.
export function Select({ className, onValueChange, options, value }: SelectProps) {
  return (
    <BaseSelect.Root items={options} onValueChange={(next) => onValueChange((next as string) ?? "")} value={value}>
      <BaseSelect.Trigger className={cn(inputVariants(), "flex items-center justify-between gap-2 text-left", className)}>
        <BaseSelect.Value className="truncate">
          {(selected: string) => options.find((option) => option.value === selected)?.label ?? ""}
        </BaseSelect.Value>
        <BaseSelect.Icon className="shrink-0 text-cms-subtle">
          <ChevronsUpDown size={13} />
        </BaseSelect.Icon>
      </BaseSelect.Trigger>
      <BaseSelect.Portal>
        <BaseSelect.Positioner className="z-60 outline-none" sideOffset={4}>
          <BaseSelect.Popup className={cn(popupClass, "max-h-[var(--available-height)] min-w-[var(--anchor-width)] overflow-auto p-1 text-field")}>
            {options.map((option) => (
              <BaseSelect.Item
                className="flex cursor-default items-center justify-between gap-2 rounded-cms-sm px-2 py-1.5 outline-none data-[highlighted]:bg-cms-raised"
                key={option.value}
                value={option.value}
              >
                <BaseSelect.ItemText className="truncate">{option.label}</BaseSelect.ItemText>
                <BaseSelect.ItemIndicator className="shrink-0 text-cms-accent">
                  <Check size={13} />
                </BaseSelect.ItemIndicator>
              </BaseSelect.Item>
            ))}
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );
}
