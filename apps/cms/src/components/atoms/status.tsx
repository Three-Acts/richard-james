import type { PublishStatus } from "../../cms/types";
import { statusDotVariants, statusTextVariants } from "./styles";

const statusLabels: Record<PublishStatus, string> = {
  published: "Published",
  not_published: "Not published",
  queued_to_publish: "Queued to publish"
};

export function StatusDot({ status }: { status: PublishStatus }) {
  return <span aria-hidden="true" className={statusDotVariants({ status })} />;
}

export function StatusPill({ status }: { status: PublishStatus }) {
  return (
    <span className={statusTextVariants({ status })}>
      <StatusDot status={status} />
      {statusLabels[status]}
    </span>
  );
}
