import { ChevronDown } from "lucide-react";
import { Menu } from "@base-ui-components/react/menu";
import { cn } from "@three-acts/utils";
import { buttonVariants } from "./styles";

export type SplitButtonOption = {
  label: string;
  onSelect: () => void;
};

type SplitButtonProps = {
  disabled?: boolean;
  label: string;
  onClick: () => void;
  options: SplitButtonOption[];
};

export function SplitButton({ disabled, label, onClick, options }: SplitButtonProps) {
  return (
    <div className="inline-flex">
      <button className={cn(buttonVariants({ variant: "primary" }), "rounded-r-none")} disabled={disabled} onClick={onClick} type="button">
        {label}
      </button>
      <Menu.Root>
        <Menu.Trigger
          aria-label="More publish options"
          className={cn(buttonVariants({ variant: "primary" }), "rounded-l-none border-l border-black/25 px-1")}
          disabled={disabled}
        >
          <ChevronDown size={16} />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner align="end" className="z-[60] outline-none" sideOffset={4}>
            <Menu.Popup className="min-w-[180px] overflow-hidden rounded border border-cms-raised bg-cms-surface py-1 text-[11.5px] text-cms-text shadow-2xl shadow-black/50 outline-none">
              {options.map((option) => (
                <Menu.Item
                  className="flex cursor-default items-center px-3 py-1.5 outline-none data-[highlighted]:bg-cms-raised"
                  key={option.label}
                  onClick={option.onSelect}
                >
                  {option.label}
                </Menu.Item>
              ))}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  );
}
