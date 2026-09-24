import type { ReactElement } from "react";
import { Search } from "lucide-react";
import { Input as BaseInput } from "@base-ui-components/react/input";
import { cn } from "@three-acts/utils";
import { wellShadow } from "./styles";

type SearchInputProps = {
  /** Accessible name for the input; the placeholder alone isn't exposed to AT. */
  ariaLabel?: string;
  className?: string;
  /** Compose the inner input with a Base UI part, e.g. `<Toolbar.Input />`. */
  inputRender?: ReactElement<Record<string, unknown>>;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
};

export function SearchInput({ ariaLabel = "Search records", className, inputRender, onChange, placeholder, value }: SearchInputProps) {
  return (
    <label
      className={cn(
        "flex h-7 min-w-0 items-center gap-1.5 rounded-cms border border-cms-line-strong bg-cms-surface px-2 text-cms-subtle transition-colors",
        wellShadow,
        // Matches the focus treatment of every other field control.
        "outline-hidden focus-within:border-cms-accent focus-within:text-cms-muted focus-within:outline-1 focus-within:outline-solid focus-within:outline-offset-0 focus-within:outline-cms-accent",
        className
      )}
    >
      <Search size={14} aria-hidden="true" />
      <BaseInput
        aria-label={ariaLabel}
        className="min-w-0 flex-1 bg-transparent text-ui text-cms-text outline-none placeholder:text-cms-subtle"
        onValueChange={(next) => onChange(next)}
        placeholder={placeholder}
        render={inputRender}
        type="search"
        value={value}
      />
    </label>
  );
}
