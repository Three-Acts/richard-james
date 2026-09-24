/**
 * Vercel integration helpers for the CMS "Publish" flow.
 *
 * - `triggerDeploy` fires a Deploy Hook (rebuilds the static web app so it picks
 *   up newly published content), and records a baseline: the production
 *   deployment that was live right before the hook fired, plus the trigger
 *   timestamp. The CMS uses those to poll for "the deployment we just
 *   started" specifically via `getDeploymentStatus({ after, since })`.
 * - `getDeploymentStatus` polls the Vercel REST API for live deployment state so
 *   the CMS can show real progress (queued → building → ready/error).
 *
 * All secrets stay server-side (this app), never in the browser. When the env
 * is not configured, helpers return an `unconfigured` state so local dev and
 * un-provisioned previews degrade gracefully instead of erroring.
 */

import { ApiError } from "./http.js";

export type DeploymentState =
  | "QUEUED"
  | "INITIALIZING"
  | "BUILDING"
  | "READY"
  | "ERROR"
  | "CANCELED"
  | "pending"
  | "unconfigured"
  | "unknown";

export type DeployTriggerResult = {
  triggered: boolean;
  state: DeploymentState;
  jobId?: string;
  baselineDeploymentId?: string;
  triggeredAt: string;
  message?: string;
};

export type DeploymentStatusOptions = {
  id?: string;
  after?: string;
  since?: string;
};

export type DeploymentStatus = {
  state: DeploymentState;
  id?: string;
  url?: string;
  readyAt?: string;
  createdAt?: string;
  message?: string;
};

const DEPLOYMENT_ID_PATTERN = /^dpl_[A-Za-z0-9]+$/;

// Override for self-hosted proxies or local testing; defaults to Vercel.
const apiBase = () => (process.env.VERCEL_API_BASE ?? "https://api.vercel.com").replace(/\/+$/, "");

/** Build a Vercel API URL, encoding every query value and appending the team id when configured. */
function buildUrl(path: string, params: Record<string, string | undefined>) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      query.set(key, value);
    }
  }

  const teamId = process.env.VERCEL_TEAM_ID;
  if (teamId) {
    query.set("teamId", teamId);
  }

  const queryString = query.toString();
  return `${apiBase()}${path}${queryString ? `?${queryString}` : ""}`;
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
    case "PENDING":
      return "pending";
    default:
      return "unknown";
  }
}

type RawDeployment = {
  uid?: string;
  state?: string;
  readyState?: string;
  url?: string;
  ready?: number;
  createdAt?: number;
};

function toDeploymentStatus(deployment: RawDeployment): DeploymentStatus {
  return {
    state: normalizeState(deployment.readyState ?? deployment.state),
    id: deployment.uid,
    url: deployment.url ? `https://${deployment.url}` : undefined,
    readyAt: deployment.ready ? new Date(deployment.ready).toISOString() : undefined,
    createdAt: deployment.createdAt ? new Date(deployment.createdAt).toISOString() : undefined
  };
}

/** Best-effort lookup of the current production deployment, used as a trigger baseline. Never throws. */
async function fetchLatestProductionDeploymentId(projectId: string): Promise<string | undefined> {
  try {
    const url = buildUrl("/v6/deployments", { projectId, target: "production", limit: "1" });
    const response = await fetch(url, { headers: authHeaders() });
    if (!response.ok) {
      return undefined;
    }
    const payload = (await response.json()) as { deployments?: RawDeployment[] };
    return payload.deployments?.[0]?.uid;
  } catch {
    return undefined;
  }
}

export async function triggerDeploy(): Promise<DeployTriggerResult> {
  const hookUrl = process.env.VERCEL_DEPLOY_HOOK_URL;
  const triggeredAt = new Date().toISOString();

  if (!hookUrl) {
    return {
      triggered: false,
      state: "unconfigured",
      triggeredAt,
      message: "Set VERCEL_DEPLOY_HOOK_URL to enable publishing."
    };
  }

  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const baselineDeploymentId =
    token && projectId ? await fetchLatestProductionDeploymentId(projectId) : undefined;

  const response = await fetch(hookUrl, { method: "POST" });
  if (!response.ok) {
    throw new ApiError(502, "deploy_hook_failed", "Deploy hook failed. Try again shortly.");
  }

  const payload = (await response.json().catch(() => ({}))) as { job?: { id?: string } };

  return {
    triggered: true,
    state: "pending",
    jobId: payload.job?.id,
    baselineDeploymentId,
    triggeredAt
  };
}

async function fetchDeploymentById(id: string): Promise<DeploymentStatus> {
  const url = buildUrl(`/v13/deployments/${encodeURIComponent(id)}`, {});
  const response = await fetch(url, { headers: authHeaders() });
  if (!response.ok) {
    throw new ApiError(502, "vercel_lookup_failed", "Vercel deployment lookup failed.");
  }

  const deployment = (await response.json()) as {
    readyState?: string;
    status?: string;
    url?: string;
    ready?: number;
    createdAt?: number;
  };

  return {
    state: normalizeState(deployment.readyState ?? deployment.status),
    id,
    url: deployment.url ? `https://${deployment.url}` : undefined,
    readyAt: deployment.ready ? new Date(deployment.ready).toISOString() : undefined,
    createdAt: deployment.createdAt ? new Date(deployment.createdAt).toISOString() : undefined
  };
}

/** Newest deployment that isn't `after`, and (if `since` given) was created at/after it. */
async function fetchDeploymentAfter(
  projectId: string,
  after: string | undefined,
  since: string | undefined
): Promise<DeploymentStatus> {
  const url = buildUrl("/v6/deployments", { projectId, target: "production", limit: "10" });
  const response = await fetch(url, { headers: authHeaders() });
  if (!response.ok) {
    throw new ApiError(502, "vercel_lookup_failed", "Vercel deployments query failed.");
  }

  const payload = (await response.json()) as { deployments?: RawDeployment[] };
  const deployments = payload.deployments ?? [];
  const sinceMs = since !== undefined ? Date.parse(since) : undefined;

  const match = deployments.find((deployment) => {
    if (!deployment.uid || deployment.uid === after) {
      return false;
    }
    if (sinceMs !== undefined && (deployment.createdAt === undefined || deployment.createdAt < sinceMs)) {
      return false;
    }
    return true;
  });

  if (!match) {
    return { state: "pending", message: "Waiting for the new deployment to register." };
  }

  return toDeploymentStatus(match);
}

async function fetchLatestDeployment(projectId: string): Promise<DeploymentStatus> {
  const url = buildUrl("/v6/deployments", { projectId, target: "production", limit: "1" });
  const response = await fetch(url, { headers: authHeaders() });
  if (!response.ok) {
    throw new ApiError(502, "vercel_lookup_failed", "Vercel deployments query failed.");
  }

  const payload = (await response.json()) as { deployments?: RawDeployment[] };
  const latest = payload.deployments?.[0];
  if (!latest) {
    return { state: "unknown", message: "No deployments found for this project." };
  }

  return toDeploymentStatus(latest);
}

export async function getDeploymentStatus(
  options: DeploymentStatusOptions = {}
): Promise<DeploymentStatus> {
  const { id, after, since } = options;

  if (id !== undefined && !DEPLOYMENT_ID_PATTERN.test(id)) {
    throw new ApiError(400, "invalid_deployment_id", "id must look like a Vercel deployment id (dpl_...).");
  }

  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;

  if (!token || (id === undefined && !projectId)) {
    return {
      state: "unconfigured",
      message: "Set VERCEL_TOKEN and VERCEL_PROJECT_ID to track deployment status."
    };
  }

  if (id !== undefined) {
    return fetchDeploymentById(id);
  }

  // Guard rather than assert: keeps `projectId` a plain `string` below
  // without a non-null assertion.
  if (!projectId) {
    return {
      state: "unconfigured",
      message: "Set VERCEL_TOKEN and VERCEL_PROJECT_ID to track deployment status."
    };
  }

  if (after !== undefined || since !== undefined) {
    return fetchDeploymentAfter(projectId, after, since);
  }

  return fetchLatestDeployment(projectId);
}
