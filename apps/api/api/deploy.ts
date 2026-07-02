import { ok, withApi } from "./_lib/http";
import { triggerDeploy } from "./_lib/vercel";

/**
 * POST /api/deploy — trigger a Vercel deploy hook to rebuild the static site
 * after content is published. Returns the initial job/state; poll
 * /api/deploy-status for progress.
 */
export default withApi(["POST"], async (_request, response) => {
  ok(response, await triggerDeploy());
});
