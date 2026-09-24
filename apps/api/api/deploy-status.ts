import { ApiError, ok, withApi } from "./_lib/http";
import { requireAuth } from "./_lib/auth";
import { getDeploymentStatus } from "./_lib/vercel";

const DEPLOYMENT_ID_PATTERN = /^dpl_[A-Za-z0-9]+$/;

const readStringParam = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

/**
 * GET /api/deploy-status[?id=<deploymentId>] — return that deployment's state.
 * GET /api/deploy-status[?after=<deploymentId>][&since=<isoDate>] — return the
 * newest production deployment after the given baseline (see /api/deploy's
 * `baselineDeploymentId`/`triggeredAt`), or `{ state: "pending" }` if it
 * hasn't registered yet.
 * GET /api/deploy-status — the project's latest production deployment.
 *
 * Requires publish auth (see `requireAuth`).
 */
export default withApi(["GET"], async (request, response) => {
  await requireAuth(request);

  const id = readStringParam(request.query.id);
  const after = readStringParam(request.query.after);
  const since = readStringParam(request.query.since);

  if (after !== undefined && !DEPLOYMENT_ID_PATTERN.test(after)) {
    throw new ApiError(400, "invalid_query", "after must look like a Vercel deployment id (dpl_...).");
  }

  if (since !== undefined && Number.isNaN(Date.parse(since))) {
    throw new ApiError(400, "invalid_query", "since must be a valid date.");
  }

  ok(response, await getDeploymentStatus({ id, after, since }));
});
