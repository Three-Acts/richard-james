import type { ReorderRecordBody } from "../../../../_lib/schema.js";
import { ApiError, ok, readJsonBody, withApi } from "../../../../_lib/http.js";
import { requireAuth } from "../../../../_lib/auth.js";
import { reorderRecord } from "../../../../_lib/cms/service.js";

export default withApi(["POST"], async (request, response) => {
  await requireAuth(request);
  const collectionId = request.query.collectionId;
  if (typeof collectionId !== "string") throw new ApiError(400, "invalid_query", "collectionId is required.");
  const body = readJsonBody<ReorderRecordBody>(request);
  ok(response, await reorderRecord(collectionId, body.recordId, body.position));
});
