import { ok, withApi } from "./_lib/http";
import { getDeploymentStatus } from "./_lib/vercel";

/**
 * GET /api/deploy-status[?id=<deploymentId>] — return normalized Vercel
 * deployment state. Without an id, reports the project's latest deployment.
 */
export default withApi(["GET"], async (request, response) => {
  const { id } = request.query;
  const deploymentId = typeof id === "string" && id ? id : undefined;
  ok(response, await getDeploymentStatus(deploymentId));
});
