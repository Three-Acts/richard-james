import type { PublishBody } from "../../_lib/schema.js";
import { ok, readJsonBody, withApi } from "../../_lib/http.js";
import { requireAuth } from "../../_lib/auth.js";
import { publishQueued } from "../../_lib/cms/service.js";

/**
 * POST /api/cms/publish  body PublishBody -> PublishQueuedResult
 *
 * Publish step 1: flips every `queued_to_publish` record (optionally scoped
 * to one collection) to `published`, reporting exactly which records changed
 * (by collection) so a caller whose deploy then fails can revert just those
 * back to `queued_to_publish` (POST .../status) instead of leaving them
 * stuck "published" with nothing live. Triggering the site rebuild is a
 * separate step — see /api/deploy.
 */
export default withApi(["POST"], async (request, response) => {
  await requireAuth(request);
  const body = readJsonBody<PublishBody>(request);
  ok(response, await publishQueued(body.collectionId));
});
