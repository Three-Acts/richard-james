import { cn } from "@three-acts/template";
import type { PublishStatus } from "../../cms/types";

const statusLabels: Record<PublishStatus, string> = {
  published: "Published",
  not_published: "Not published",
  queued_to_publish: "Queued to publish"
};

export function StatusDot({ status }: { status: PublishStatus }) {
  return (
    <span
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        status === "published" && "bg-cms-success",
        status === "not_published" && "border border-dashed border-cms-muted",
        status === "queued_to_publish" && "border border-cms-info"
      )}
      aria-hidden="true"
    />
  );
}

export function StatusPill({ status }: { status: PublishStatus }) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap text-[11px]",
        status === "published" && "text-cms-success",
        status === "not_published" && "text-cms-text",
        status === "queued_to_publish" && "text-cms-info"
      )}
    >
      <StatusDot status={status} />
      {statusLabels[status]}
    </span>
  );
}
