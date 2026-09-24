import type { SetPublishStatusBody } from "@three-acts/cms-schema";
import { ApiError, ok, readJsonBody, withApi } from "../../../_lib/http";
import { requireAuth } from "../../../_lib/auth";
import { setPublishStatus } from "../../../_lib/cms/service";

const readStringParam = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined);

/** POST /api/cms/collections/:collectionId/status  body SetPublishStatusBody -> CmsRecord[] */
export default withApi(["POST"], async (request, response) => {
  requireAuth(request);

  const collectionId = readStringParam(request.query.collectionId);
  if (!collectionId) {
    throw new ApiError(400, "invalid_query", "collectionId is required.");
  }

  const body = readJsonBody<SetPublishStatusBody>(request);
  ok(response, await setPublishStatus(collectionId, body.recordIds, body.publishStatus));
});
