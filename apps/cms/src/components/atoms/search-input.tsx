import { Search } from "lucide-react";
import { cn } from "@three-acts/template";

type SearchInputProps = {
  className?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
};

export function SearchInput({ className, onChange, placeholder, value }: SearchInputProps) {
  return (
    <label
      className={cn(
        "flex min-w-0 items-center gap-1.5 rounded border border-cms-raised bg-cms-surface px-2 text-cms-muted shadow-inner shadow-black/50",
        className
      )}
    >
      <Search size={16} aria-hidden="true" />
      <input
        className="h-6 min-w-0 flex-1 bg-transparent text-[13px] text-cms-text outline-none"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}
