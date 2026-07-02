/**
 * Vercel integration helpers for the CMS "Publish" flow.
 *
 * - `triggerDeploy` fires a Deploy Hook (rebuilds the static web app so it picks
 *   up newly published content).
 * - `getDeploymentStatus` polls the Vercel REST API for live deployment state so
 *   the CMS can show real progress (queued → building → ready/error).
 *
 * All secrets stay server-side (this app), never in the browser. When the env
 * is not configured, helpers return an `unconfigured` state so local dev and
 * un-provisioned previews degrade gracefully instead of erroring.
 */

export type DeploymentState =
  | "QUEUED"
  | "INITIALIZING"
  | "BUILDING"
  | "READY"
  | "ERROR"
  | "CANCELED"
  | "unconfigured"
  | "unknown";

export type DeployTriggerResult = {
  triggered: boolean;
  state: DeploymentState;
  jobId?: string;
  message?: string;
};

export type DeploymentStatus = {
  state: DeploymentState;
  id?: string;
  url?: string;
  readyAt?: string;
  message?: string;
};

// Override for self-hosted proxies or local testing; defaults to Vercel.
const apiBase = () => (process.env.VERCEL_API_BASE ?? "https://api.vercel.com").replace(/\/+$/, "");

function teamQuery() {
  const teamId = process.env.VERCEL_TEAM_ID;
  return teamId ? `&teamId=${encodeURIComponent(teamId)}` : "";
}

function authHeaders() {
  return { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` };
}

/** Normalize the several state field names Vercel uses across endpoints. */
function normalizeState(raw: unknown): DeploymentState {
  const value = typeof raw === "string" ? raw.toUpperCase() : "";
  switch (value) {
    case "QUEUED":
    case "INITIALIZING":
    case "BUILDING":
    case "READY":
    case "ERROR":
    case "CANCELED":
      return value;
    default:
      return "unknown";
  }
}

export async function triggerDeploy(): Promise<DeployTriggerResult> {
  const hookUrl = process.env.VERCEL_DEPLOY_HOOK_URL;

  if (!hookUrl) {
    return {
      triggered: false,
      state: "unconfigured",
      message: "Set VERCEL_DEPLOY_HOOK_URL to enable publishing."
    };
  }

  const response = await fetch(hookUrl, { method: "POST" });
  if (!response.ok) {
    throw new Error(`Deploy hook failed with status ${response.status}.`);
  }

  const payload = (await response.json().catch(() => ({}))) as { job?: { id?: string } };
  return { triggered: true, state: "QUEUED", jobId: payload.job?.id };
}

export async function getDeploymentStatus(deploymentId?: string): Promise<DeploymentStatus> {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;

  if (!token || (!deploymentId && !projectId)) {
    return {
      state: "unconfigured",
      message: "Set VERCEL_TOKEN and VERCEL_PROJECT_ID to track deployment status."
    };
  }

  if (deploymentId) {
    const response = await fetch(`${apiBase()}/v13/deployments/${deploymentId}?${teamQuery().slice(1)}`, {
      headers: authHeaders()
    });
    if (!response.ok) {
      throw new Error(`Vercel deployment lookup failed with status ${response.status}.`);
    }
    const deployment = (await response.json()) as {
      readyState?: string;
      status?: string;
      url?: string;
      ready?: number;
    };
    return {
      state: normalizeState(deployment.readyState ?? deployment.status),
      id: deploymentId,
      url: deployment.url ? `https://${deployment.url}` : undefined,
      readyAt: deployment.ready ? new Date(deployment.ready).toISOString() : undefined
    };
  }

  const response = await fetch(`${apiBase()}/v6/deployments?projectId=${encodeURIComponent(projectId!)}&limit=1${teamQuery()}`, {
    headers: authHeaders()
  });
  if (!response.ok) {
    throw new Error(`Vercel deployments query failed with status ${response.status}.`);
  }
  const payload = (await response.json()) as {
    deployments?: Array<{ uid?: string; state?: string; readyState?: string; url?: string; ready?: number }>;
  };
  const latest = payload.deployments?.[0];
  if (!latest) {
    return { state: "unknown", message: "No deployments found for this project." };
  }

  return {
    state: normalizeState(latest.readyState ?? latest.state),
    id: latest.uid,
    url: latest.url ? `https://${latest.url}` : undefined,
    readyAt: latest.ready ? new Date(latest.ready).toISOString() : undefined
  };
}
