import { useCallback, useRef, useState } from "react";
import type { CmsBackend, PublishQueuedResult } from "../cms/types";
import { useCmsBackend } from "../cms/backend-context";
import { describeCmsError } from "../cms/errors";
import { apiFetch } from "../lib/api-client";
import { useToast } from "../components/atoms";

type DeployTrigger = {
  triggered: boolean;
  state: string;
  jobId?: string;
  baselineDeploymentId?: string;
  triggeredAt: string;
  message?: string;
};

type DeployStatus = {
  state: string;
  id?: string;
  url?: string;
  readyAt?: string;
  message?: string;
};

// Only these end the poll. "pending" (no matching deployment discovered yet)
// and "unknown" (a transient read failure) are not terminal — keep polling.
const TERMINAL_STATES = new Set(["READY", "ERROR", "CANCELED"]);

const PROGRESS_LABEL: Record<string, string> = {
  QUEUED: "Queued…",
  INITIALIZING: "Initializing…",
  BUILDING: "Building…"
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Puts records back into `queued_to_publish` after the deploy hook failed to
 * fire — `publishQueued` already flipped them to `published` in the DB, and
 * with no deploy triggered that would otherwise leave them stuck "published"
 * with nothing actually live and no way to retry (the Publish button only
 * shows while something is queued). Best-effort: a collection whose revert
 * request itself fails is left published (rare — logged nowhere else in this
 * hook either), but every other collection still gets reverted.
 */
async function revertToQueued(backend: CmsBackend, recordsByCollection: PublishQueuedResult["recordsByCollection"]): Promise<void> {
  await Promise.allSettled(
    recordsByCollection.map(({ collectionId, recordIds }) => backend.data.setPublishStatus(collectionId, recordIds, "queued_to_publish"))
  );
}

/**
 * Drives the global "Publish" action: flips queued records to published,
 * triggers a Vercel deploy via the API, then polls deployment status and
 * reports progress through a single toast that moves from queued → building
 * → deployed (or failed).
 *
 * `onPublished` is an optional hook for callers whose record list goes stale
 * once queued records flip to published (nothing wires it up yet — see the
 * pluggable-backend refactor's follow-ups).
 */
export function usePublish({ onPublished }: { onPublished?: () => void } = {}) {
  const backend = useCmsBackend();
  const toast = useToast();
  const [isPublishing, setIsPublishing] = useState(false);
  // A ref guard closes the double-click race that state alone can't: both
  // clicks can read stale `isPublishing` state before either re-render lands.
  const isPublishingRef = useRef(false);

  const publish = useCallback(async () => {
    if (isPublishingRef.current) {
      return;
    }
    isPublishingRef.current = true;
    setIsPublishing(true);

    const toastId = toast.push({ tone: "loading", title: "Publishing…", description: "Publishing queued records…" });

    try {
      const { published, recordsByCollection } = await backend.data.publishQueued();
      onPublished?.();

      const requestDescription =
        published > 0 ? `Published ${published} queued record${published === 1 ? "" : "s"}. Requesting a deploy.` : "Requesting a deploy.";
      toast.update(toastId, { tone: "loading", title: "Publishing…", description: requestDescription });

      let trigger: DeployTrigger;
      try {
        trigger = await apiFetch<DeployTrigger>("/deploy", { method: "POST" });
      } catch (deployError) {
        // The hook never fired: put the records back in the publish queue
        // (rather than leaving them stuck "published" with nothing live) so
        // the Publish button reappears and a retry picks them up.
        await revertToQueued(backend, recordsByCollection);
        onPublished?.();
        throw deployError;
      }

      if (!trigger.triggered) {
        toast.update(toastId, {
          tone: "info",
          title: "Publishing not configured",
          description: trigger.message ?? "Set the Vercel deploy hook to enable publishing.",
          duration: 8000
        });
        return;
      }

      toast.update(toastId, { tone: "loading", title: "Deployment queued", description: "Waiting for Vercel…" });

      // Give Vercel a moment to register the new deployment before polling latest.
      await sleep(2500);

      const { baselineDeploymentId, triggeredAt } = trigger;
      const maxAttempts = 80;

      let status: DeployStatus = { state: "pending" };
      let deploymentId: string | undefined;

      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        if (deploymentId) {
          status = await apiFetch<DeployStatus>(`/deploy-status?id=${encodeURIComponent(deploymentId)}`);
        } else if (baselineDeploymentId) {
          status = await apiFetch<DeployStatus>(
            `/deploy-status?after=${encodeURIComponent(baselineDeploymentId)}&since=${encodeURIComponent(triggeredAt)}`
          );
        } else {
          status = await apiFetch<DeployStatus>(`/deploy-status?since=${encodeURIComponent(triggeredAt)}`);
        }

        if (status.state === "unconfigured") {
          break;
        }

        if (!deploymentId && status.id) {
          deploymentId = status.id;
        }

        if (deploymentId && TERMINAL_STATES.has(status.state)) {
          break;
        }

        toast.update(toastId, {
          tone: "loading",
          title: PROGRESS_LABEL[status.state] ?? "Deploying…",
          description: "Building your site with the latest content."
        });
        await sleep(2500);
      }

      if (status.state === "READY") {
        toast.update(toastId, { tone: "success", title: "Deployed", description: "Your site is live.", duration: 6000 });
      } else if (status.state === "unconfigured") {
        toast.update(toastId, {
          tone: "info",
          title: "Deploy triggered",
          description: status.message ?? "Live status tracking is not configured.",
          duration: 8000
        });
      } else if (status.state === "ERROR" || status.state === "CANCELED") {
        // The hook fired, but the build itself never went live — same as a
        // hook-trigger failure from the site's point of view, so put the
        // records back in the queue rather than leaving them "published"
        // with nothing actually deployed.
        await revertToQueued(backend, recordsByCollection);
        onPublished?.();
        toast.update(toastId, {
          tone: "error",
          title: "Deploy failed",
          description: `Deployment ${status.state.toLowerCase()}. Records are back in the publish queue — try again shortly.`
        });
      } else {
        // Attempts ran out while still queued/building/pending/unknown — the
        // deploy is very likely still going, it just outlasted our poll budget.
        toast.update(toastId, {
          tone: "info",
          title: "Still deploying",
          description: "Still deploying — check the Vercel dashboard.",
          duration: 8000
        });
      }
    } catch (error) {
      toast.update(toastId, {
        tone: "error",
        title: "Publish failed",
        description: describeCmsError(error)
      });
    } finally {
      isPublishingRef.current = false;
      setIsPublishing(false);
    }
  }, [backend, onPublished, toast]);

  return { publish, isPublishing };
}
