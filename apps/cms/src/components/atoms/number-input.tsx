import { ChevronDown, ChevronUp } from "lucide-react";
import { NumberField } from "@base-ui-components/react/number-field";
import { cn } from "@three-acts/utils";
import { controlShadow, focusRing, inputVariants } from "./styles";

type NumberInputProps = {
  className?: string;
  onValueChange: (value: number | null) => void;
  required?: boolean;
  value: number | null;
};

const stepper = cn(
  "grid w-5 flex-1 place-items-center rounded-cms-sm bg-cms-surface text-cms-muted transition-colors",
  "hover:bg-cms-raised hover:text-cms-text",
  controlShadow,
  focusRing
);

// Base UI NumberField: keyboard stepping, wheel/scrub guards, and locale-aware
// parsing that a bare `<input type="number">` does not provide.
export function NumberInput({ className, onValueChange, required, value }: NumberInputProps) {
  return (
    <NumberField.Root
      className={className}
      // Base UI formats through Intl, which groups thousands and rounds to 3
      // decimals by default. Collection Fields store raw numbers, so keep the
      // display faithful to the stored value.
      format={{ useGrouping: false, maximumFractionDigits: 20 }}
      onValueChange={(next) => onValueChange(next)}
      required={required}
      value={value}
    >
      <NumberField.Group className="flex items-stretch gap-1">
        <NumberField.Input className={cn(inputVariants(), "flex-1 tabular-nums")} />
        <div className="flex shrink-0 flex-col gap-0.5">
          <NumberField.Increment aria-label="Increase" className={stepper}>
            <ChevronUp size={11} />
          </NumberField.Increment>
          <NumberField.Decrement aria-label="Decrease" className={stepper}>
            <ChevronDown size={11} />
          </NumberField.Decrement>
        </div>
      </NumberField.Group>
    </NumberField.Root>
  );
}
