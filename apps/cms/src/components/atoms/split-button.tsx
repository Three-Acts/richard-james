import type { ReactElement } from "react";
import { ChevronDown } from "lucide-react";
import { Menu } from "@base-ui-components/react/menu";
import { cn } from "@three-acts/utils";
import { buttonVariants, popupClass, type ButtonVariant } from "./styles";
import { Button } from "./button";

export type SplitButtonOption = {
  disabled?: boolean;
  label: string;
  onSelect: () => void;
};

/** Same shape as `SplitButtonOption` — kept as its own name for `MenuButton` call sites. */
export type MenuButtonOption = SplitButtonOption;

type SplitButtonProps = {
  /** Disables the whole control (both the primary action and the dropdown), e.g. while a request is in flight. */
  disabled?: boolean;
  label: string;
  onClick: () => void;
  options: SplitButtonOption[];
  /** Disables just the primary action (e.g. the record is already in that state) — the dropdown stays usable. */
  primaryDisabled?: boolean;
};

export function SplitButton({ disabled, label, onClick, options, primaryDisabled }: SplitButtonProps) {
  return (
    <div className="inline-flex">
      <Button className="rounded-r-none" disabled={disabled || primaryDisabled} onClick={onClick} variant="primary">
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
            <Menu.Popup className={cn(popupClass, "min-w-46 p-1 text-ui")}>
              {options.map((option) => (
                <Menu.Item
                  className="flex cursor-default items-center rounded-cms-sm px-2 py-1.5 outline-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-cms-raised"
                  disabled={option.disabled}
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

type MenuButtonProps = {
  align?: "end" | "start";
  /** Compose the trigger with a Base UI part, e.g. `<Toolbar.Button />` for a toolbar-hosted menu. */
  render?: ReactElement<Record<string, unknown>>;
  disabled?: boolean;
  label: string;
  options: MenuButtonOption[];
  variant?: ButtonVariant;
};

/** A single trigger that opens a menu of actions — `SplitButton`'s non-split sibling. */
export function MenuButton({ align = "end", disabled, label, options, render, variant = "normal" }: MenuButtonProps) {
  return (
    <Menu.Root>
      <Menu.Trigger className={cn(buttonVariants({ variant }), "gap-1.5")} disabled={disabled} render={render}>
        {label}
        <ChevronDown size={13} />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align={align} className="z-60 outline-none" sideOffset={4}>
          <Menu.Popup className={cn(popupClass, "min-w-46 p-1 text-ui")}>
            {options.map((option) => (
              <Menu.Item
                className="flex cursor-default items-center rounded-cms-sm px-2 py-1.5 outline-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-cms-raised"
                disabled={option.disabled}
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
  );
}
