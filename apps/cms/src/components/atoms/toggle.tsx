import { Switch } from "@base-ui-components/react/switch";

type ToggleProps = {
  checked: boolean;
  id?: string;
  onChange: (checked: boolean) => void;
};

export function Toggle({ checked, id, onChange }: ToggleProps) {
  return (
    <label className="inline-flex w-fit cursor-pointer items-center gap-2 text-[11px] text-cms-text">
      <Switch.Root
        checked={checked}
        className="relative h-[18px] w-8 shrink-0 rounded-full bg-cms-track p-[3px] outline-none transition-colors focus-visible:ring-1 focus-visible:ring-cms-accent data-[checked]:bg-cms-accent"
        id={id}
        onCheckedChange={(value) => onChange(value)}
      >
        <Switch.Thumb className="block size-3 rounded-full bg-white shadow-sm transition-transform data-[checked]:translate-x-[14px]" />
      </Switch.Root>
      <span>{checked ? "On" : "Off"}</span>
    </label>
  );
}
