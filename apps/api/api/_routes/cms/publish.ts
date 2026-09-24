import type { PublishBody } from "../../_lib/schema.js";
import { ok, readJsonBody, withApi } from "../../_lib/http.js";
import { requireAuth } from "../../_lib/auth.js";
import { publishQueued } from "../../_lib/cms/service.js";

/**
 * POST /api/cms/publish  body PublishBody -> { published: number }
 *
 * Publish step 1: flips every `queued_to_publish` record (optionally scoped
 * to one collection) to `published`. Triggering the site rebuild is a
 * separate step — see /api/deploy.
 */
export default withApi(["POST"], async (request, response) => {
  await requireAuth(request);
  const body = readJsonBody<PublishBody>(request);
  ok(response, await publishQueued(body.collectionId));
});
