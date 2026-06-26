import { ChevronRight } from "lucide-react";
import { cn } from "@three-acts/template";
import type { CmsCollectionSummary } from "../../cms/types";
import { PanelHeader, ScrollArea } from "../atoms";

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
    <aside className="flex w-[248px] shrink-0 flex-col border-r border-cms-raised bg-cms-bg" aria-label="CMS collections">
      <PanelHeader>
        <span className="text-[12px] font-bold text-cms-text">CMS Collections</span>
      </PanelHeader>
      <ScrollArea className="min-h-0 flex-1" viewportClassName="p-2">
        {isLoading ? <p className="px-2 text-cms-muted">Loading collections...</p> : null}

        {groups.map((group) => (
          <div className="border-t border-cms-raised py-2 first:border-t-0" key={group.group}>
            <div className="px-2 py-1.5 text-[11px] uppercase tracking-wide text-cms-muted">{group.group}</div>
            {group.collections.map((collection) => (
              <button
                className={cn(
                  "grid w-full grid-cols-[minmax(0,auto)_minmax(0,1fr)_auto] items-center gap-1.5 rounded px-2 py-2 text-left text-[11px] text-cms-text transition hover:bg-cms-raised",
                  collection.id === activeCollectionId && "bg-cms-raised"
                )}
                key={collection.id}
                onClick={() => onSelectCollection(collection.id)}
                type="button"
              >
                <span>{collection.label}</span>
                <span className="min-w-0 text-cms-muted">{collection.count} items</span>
                <ChevronRight className="text-cms-muted" size={16} />
              </button>
            ))}
          </div>
        ))}
      </ScrollArea>
    </aside>
  );
}
