import { ApiError, ok, withApi } from "../../../../../_lib/http.js";
import { requireAuth } from "../../../../../_lib/auth.js";
import { queueOrdering } from "../../../../../_lib/cms/service.js";

export default withApi(["POST"], async (request, response) => {
  await requireAuth(request);
  const collectionId = request.query.collectionId;
  if (typeof collectionId !== "string") throw new ApiError(400, "invalid_query", "collectionId is required.");
  await queueOrdering(collectionId);
  ok(response, { queued: true });
});
