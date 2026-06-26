import { Check, ChevronsUpDown } from "lucide-react";
import { Select as BaseSelect } from "@base-ui-components/react/select";
import { cn } from "@three-acts/template";
import { inputClass } from "./styles";

export type SelectOption = { label: string; value: string };

type SelectProps = {
  className?: string;
  id?: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  value: string;
};

export function Select({ className, id, onValueChange, options, value }: SelectProps) {
  return (
    <BaseSelect.Root items={options} onValueChange={(next) => onValueChange((next as string) ?? "")} value={value}>
      <BaseSelect.Trigger className={cn(inputClass, "flex items-center justify-between gap-2 text-left", className)} id={id}>
        <BaseSelect.Value className="truncate">
          {(selected: string) => options.find((option) => option.value === selected)?.label ?? ""}
        </BaseSelect.Value>
        <BaseSelect.Icon className="shrink-0 text-cms-muted">
          <ChevronsUpDown size={14} />
        </BaseSelect.Icon>
      </BaseSelect.Trigger>
      <BaseSelect.Portal>
        <BaseSelect.Positioner className="z-[60] outline-none" sideOffset={4}>
          <BaseSelect.Popup className="max-h-[var(--available-height)] min-w-[var(--anchor-width)] overflow-auto rounded-md border border-cms-raised bg-cms-surface py-1 text-[13px] text-cms-text shadow-2xl shadow-black/50 outline-none">
            {options.map((option) => (
              <BaseSelect.Item
                className="flex cursor-default items-center justify-between gap-2 px-2.5 py-1.5 outline-none data-[highlighted]:bg-cms-raised"
                key={option.value}
                value={option.value}
              >
                <BaseSelect.ItemText>{option.label}</BaseSelect.ItemText>
                <BaseSelect.ItemIndicator className="shrink-0 text-cms-accent">
                  <Check size={14} />
                </BaseSelect.ItemIndicator>
              </BaseSelect.Item>
            ))}
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );
}
