import { cn } from "@three-acts/utils";
import { BookOpen } from "lucide-react";
import type { CmsCollectionSummary } from "../../cms/types";
import { eyebrowClass, focusRing, PanelHeader, ScrollArea } from "../atoms";

export type CollectionGroup = {
  group: string;
  collections: CmsCollectionSummary[];
};

type CollectionSidebarProps = {
  activeCollectionId: string | null;
  groups: CollectionGroup[];
  isLoading: boolean;
  onSelectCollection: (collectionId: string) => void;
  onOpenTutorials: () => void;
  tutorialsActive: boolean;
};

export function CollectionSidebar({ activeCollectionId, groups, isLoading, onSelectCollection, onOpenTutorials, tutorialsActive }: CollectionSidebarProps) {
  return (
    <aside className={cn("flex w-pane shrink-0 flex-col border-r border-cms-line-strong bg-cms-bg", tutorialsActive && "hidden md:flex")} aria-label="CMS navigation">
      <PanelHeader>
        <span className="text-ui-lg font-semibold text-cms-text">Collections</span>
      </PanelHeader>
      <ScrollArea className="min-h-0 flex-1" viewportClassName="px-2 pb-2">
        {isLoading ? (
          <div className="grid gap-1 p-2" aria-hidden="true">
            {Array.from({ length: 6 }, (_, index) => (
              <div className="h-7 animate-pulse rounded-cms bg-cms-raised" key={index} />
            ))}
          </div>
        ) : null}

        {groups.map((group) => (
          // Each category after the first is separated by a hairline so the
          // groups read as distinct sections rather than one long list.
          <div className="mt-3 border-t border-cms-line pt-3 first:mt-0 first:border-t-0" key={group.group}>
            <div className={cn(eyebrowClass, "px-2 pb-1.5")}>{group.group}</div>
            {group.collections.map((collection) => {
              const active = collection.id === activeCollectionId;

              return (
                <button
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "grid h-7 w-full grid-cols-fill-auto items-center gap-2 rounded-cms px-2 text-left text-ui transition-colors",
                    // The accent is reserved for actions, so location is carried by
                    // fill and weight instead.
                    active ? "bg-cms-raised font-medium text-cms-text" : "text-cms-muted hover:bg-cms-surface hover:text-cms-text",
                    focusRing
                  )}
                  key={collection.id}
                  onClick={() => onSelectCollection(collection.id)}
                  type="button"
                >
                  <span className="truncate">{collection.label}</span>
                  {/* A singleton is always exactly one record — the count adds nothing. */}
                  {collection.singleton ? null : <span className="tabular-nums text-cms-subtle">{collection.count}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </ScrollArea>
      <div className="shrink-0 border-t border-cms-line p-2">
        <div className={cn(eyebrowClass, "px-2 pb-1.5 pt-1")}>Help</div>
        <button
          aria-current={tutorialsActive ? "page" : undefined}
          className={cn(
            "flex h-7 w-full items-center gap-2 rounded-cms px-2 text-left text-ui transition-colors",
            tutorialsActive ? "bg-cms-raised font-medium text-cms-text" : "text-cms-muted hover:bg-cms-surface hover:text-cms-text",
            focusRing
          )}
          onClick={onOpenTutorials}
          type="button"
        >
          <BookOpen aria-hidden="true" size={13} />
          Tutorials
        </button>
      </div>
    </aside>
  );
}
