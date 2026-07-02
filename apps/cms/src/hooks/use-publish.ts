import { useCallback, useState } from "react";
import { apiFetch } from "../lib/api-client";
import { useToast } from "../components/atoms";

type DeployTrigger = {
  triggered: boolean;
  state: string;
  jobId?: string;
  message?: string;
};

type DeployStatus = {
  state: string;
  id?: string;
  url?: string;
  message?: string;
};

const TERMINAL_STATES = new Set(["READY", "ERROR", "CANCELED", "unconfigured", "unknown"]);

const PROGRESS_LABEL: Record<string, string> = {
  QUEUED: "Queued…",
  INITIALIZING: "Initializing…",
  BUILDING: "Building…"
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Drives the global "Publish" action: triggers a Vercel deploy via the API,
 * then polls deployment status and reports progress through a single toast that
 * moves from queued → building → deployed (or failed).
 */
export function usePublish() {
  const toast = useToast();
  const [isPublishing, setIsPublishing] = useState(false);

  const publish = useCallback(async () => {
    if (isPublishing) {
      return;
    }
    setIsPublishing(true);

    const toastId = toast.push({ tone: "loading", title: "Publishing…", description: "Requesting a deploy." });

    try {
      const trigger = await apiFetch<DeployTrigger>("/deploy", { method: "POST" });

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
      const maxAttempts = 80;
      let status: DeployStatus = { state: "unknown" };

      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        status = await apiFetch<DeployStatus>("/deploy-status");
        if (TERMINAL_STATES.has(status.state)) {
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
      } else if (status.state === "unknown") {
        toast.update(toastId, {
          tone: "info",
          title: "Deploy triggered",
          description: "Could not read live status; check the Vercel dashboard.",
          duration: 8000
        });
      } else {
        toast.update(toastId, {
          tone: "error",
          title: "Deploy failed",
          description: `Deployment ${status.state.toLowerCase()}.`
        });
      }
    } catch (error) {
      toast.update(toastId, {
        tone: "error",
        title: "Publish failed",
        description: error instanceof Error ? error.message : "Unexpected error."
      });
    } finally {
      setIsPublishing(false);
    }
  }, [isPublishing, toast]);

  return { publish, isPublishing };
}
