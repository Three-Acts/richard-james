import { Switch } from "@base-ui-components/react/switch";
import { focusRing } from "./styles";

type ToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
};

// Base UI Switch associates itself with a surrounding Field label automatically.
export function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <label className="inline-flex w-fit cursor-pointer items-center gap-2 text-ui text-cms-text">
      <Switch.Root
        checked={checked}
        className={`relative h-[18px] w-8 shrink-0 rounded-full bg-cms-track p-[3px] transition-colors data-[checked]:bg-cms-accent ${focusRing}`}
        onCheckedChange={(value) => onChange(value)}
      >
        {/* Ink thumb on the gold track, matching the ink-on-gold action language. */}
        <Switch.Thumb className="block size-3 rounded-full bg-cms-text transition-transform data-[checked]:translate-x-[14px] data-[checked]:bg-cms-accent-ink" />
      </Switch.Root>
      <span className="text-cms-muted">{checked ? "On" : "Off"}</span>
    </label>
  );
}
