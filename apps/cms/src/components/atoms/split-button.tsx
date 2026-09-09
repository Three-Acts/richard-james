import { ChevronDown } from "lucide-react";
import { Menu } from "@base-ui-components/react/menu";
import { cn } from "@three-acts/utils";
import { buttonVariants, popupClass } from "./styles";
import { Button } from "./button";

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
      <Button className="rounded-r-none" disabled={disabled} onClick={onClick} variant="primary">
        {label}
      </Button>
      <Menu.Root>
        <Menu.Trigger
          aria-label="More publish options"
          className={cn(buttonVariants({ variant: "primary" }), "rounded-l-none border-l border-cms-accent-press px-1")}
          disabled={disabled}
        >
          <ChevronDown size={14} />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner align="end" className="z-60 outline-none" sideOffset={4}>
            <Menu.Popup className={cn(popupClass, "min-w-[184px] p-1 text-ui")}>
              {options.map((option) => (
                <Menu.Item
                  className="flex cursor-default items-center rounded-cms-sm px-2 py-1.5 outline-none data-[highlighted]:bg-cms-raised"
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
