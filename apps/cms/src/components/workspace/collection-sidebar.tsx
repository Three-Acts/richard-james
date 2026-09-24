import { cn } from "@three-acts/utils";
import type { CmsCollectionSummary } from "../../cms/types";
import { eyebrowClass, focusRing, PanelHeader, ScrollArea } from "../atoms";

export type CollectionGroup = {
  group: string;
  collections: CmsCollectionSummary[];
};

type CollectionSidebarProps = {
  activeCollectionId: string;
  groups: CollectionGroup[];
  isLoading: boolean;
  onSelectCollection: (collectionId: string) => void;
};

export function CollectionSidebar({ activeCollectionId, groups, isLoading, onSelectCollection }: CollectionSidebarProps) {
  return (
    <aside className="flex w-pane shrink-0 flex-col border-r border-cms-line-strong bg-cms-bg" aria-label="CMS collections">
      <PanelHeader>
        <span className="text-ui-lg font-semibold text-cms-text">Collections</span>
      </PanelHeader>
      <ScrollArea className="min-h-0 flex-1" viewportClassName="px-2 pb-2">
        {isLoading ? <p className="px-2 py-3 text-ui text-cms-subtle">Loading collections…</p> : null}

        {groups.map((group) => (
          <div className="pt-4 first:pt-3" key={group.group}>
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
                  <span className="tabular-nums text-cms-subtle">{collection.count}</span>
                </button>
              );
            })}
          </div>
        ))}
      </ScrollArea>
    </aside>
  );
}
