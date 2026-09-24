import { ok, withApi } from "../_lib/http.js";
import { requireAuth } from "../_lib/auth.js";
import { triggerDeploy } from "../_lib/vercel.js";

/**
 * POST /api/deploy — trigger a Vercel deploy hook to rebuild the static site
 * after content is published. Requires publish auth (see `requireAuth`).
 * Returns the initial job/state plus a baseline deployment id and trigger
 * timestamp; poll /api/deploy-status?after=<baselineDeploymentId>&since=<triggeredAt>
 * for progress on the deployment this call started specifically.
 */
export default withApi(["POST"], async (request, response) => {
  await requireAuth(request);
  ok(response, await triggerDeploy());
});
