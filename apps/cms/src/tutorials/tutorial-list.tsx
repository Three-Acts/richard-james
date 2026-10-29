import { ChevronRight, PlayCircle } from "lucide-react";
import { cn } from "@three-acts/utils";
import { Button, eyebrowClass, focusRing, SearchInput } from "../components/atoms";
import { findTutorials, formatVideoTime, tutorials } from "./library";

type TutorialListProps = {
  activeId: string;
  onSelect: (id: string) => void;
  query: string;
  onQueryChange: (query: string) => void;
};

export function TutorialList({ activeId, onSelect, query, onQueryChange }: TutorialListProps) {
  const matches = findTutorials(query);
  const categories = [...new Set(matches.map((tutorial) => tutorial.category))];

  return (
    <div className="p-2">
      <SearchInput ariaLabel="Search tutorials" onChange={onQueryChange} placeholder="Search tutorials…" value={query} />
      <p className="mb-3 mt-2 px-2 text-micro text-cms-subtle" role="status">
        {matches.length === tutorials.length ? `${tutorials.length} tutorials` : `${matches.length} of ${tutorials.length} tutorials`}
      </p>
      {matches.length === 0 ? (
        <div className="grid justify-items-start gap-2 px-2 py-4">
          <p className="m-0 text-ui text-cms-muted">No tutorials match your search.</p>
          <Button onClick={() => onQueryChange("")}>Clear search</Button>
        </div>
      ) : (
        <nav aria-label="Tutorial procedures">
          {categories.map((category) => (
            <section className="mb-4 last:mb-0" key={category}>
              <h2 className={cn(eyebrowClass, "m-0 px-2 pb-1.5")}>{category}</h2>
              {matches.filter((tutorial) => tutorial.category === category).map((tutorial) => {
                const active = tutorial.id === activeId;
                return (
                  <button
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group grid w-full grid-cols-[16px_minmax(0,1fr)_13px] items-start gap-2 rounded-cms px-2 py-2 text-left text-ui transition-colors",
                      active ? "bg-cms-raised text-cms-text" : "text-cms-muted hover:bg-cms-surface hover:text-cms-text",
                      focusRing
                    )}
                    key={tutorial.id}
                    onClick={() => onSelect(tutorial.id)}
                    type="button"
                  >
                    <PlayCircle aria-hidden="true" className="mt-0.5 text-cms-subtle" size={14} />
                    <span className="min-w-0">
                      <span className={cn("block", active && "font-medium")}>{tutorial.title}</span>
                      <span className="mt-1 block text-micro tabular-nums text-cms-subtle">{tutorial.id} · {formatVideoTime(tutorial.duration)}</span>
                    </span>
                    <ChevronRight aria-hidden="true" className={cn("mt-0.5 text-cms-subtle", active ? "opacity-100" : "opacity-0 group-hover:opacity-100")} size={13} />
                  </button>
                );
              })}
            </section>
          ))}
        </nav>
      )}
    </div>
  );
}
