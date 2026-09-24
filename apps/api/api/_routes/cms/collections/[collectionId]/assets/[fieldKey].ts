import type { UploadAssetBody } from "../../../../../_lib/schema.js";
import { ApiError, ok, readJsonBody, withApi } from "../../../../../_lib/http.js";
import { requireAuth } from "../../../../../_lib/auth.js";
import { uploadAsset } from "../../../../../_lib/cms/service.js";

const readStringParam = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined);

/** POST /api/cms/collections/:collectionId/assets/:fieldKey  body UploadAssetBody -> AssetUploadResult */
export default withApi(["POST"], async (request, response) => {
  await requireAuth(request);

  const collectionId = readStringParam(request.query.collectionId);
  const fieldKey = readStringParam(request.query.fieldKey);
  if (!collectionId || !fieldKey) {
    throw new ApiError(400, "invalid_query", "collectionId and fieldKey are required.");
  }

  const body = readJsonBody<UploadAssetBody>(request);
  ok(response, await uploadAsset(collectionId, fieldKey, body));
});
