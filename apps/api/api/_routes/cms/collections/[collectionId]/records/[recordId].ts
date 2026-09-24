import type { SaveRecordBody } from "@three-acts/cms-schema";
import { ApiError, ok, readJsonBody, withApi } from "../../../../../_lib/http";
import { requireAuth } from "../../../../../_lib/auth";
import { deleteRecord, getRecord, saveRecord } from "../../../../../_lib/cms/service";

const readStringParam = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined);

/**
 * GET    /api/cms/collections/:collectionId/records/:recordId -> CmsRecord
 * PUT    /api/cms/collections/:collectionId/records/:recordId  body SaveRecordBody -> CmsRecord (409 on conflict)
 * DELETE /api/cms/collections/:collectionId/records/:recordId -> { deleted: true }
 */
export default withApi(["GET", "PUT", "DELETE"], async (request, response) => {
  await requireAuth(request);

  const collectionId = readStringParam(request.query.collectionId);
  const recordId = readStringParam(request.query.recordId);
  if (!collectionId || !recordId) {
    throw new ApiError(400, "invalid_query", "collectionId and recordId are required.");
  }

  if (request.method === "GET") {
    ok(response, await getRecord(collectionId, recordId));
    return;
  }

  if (request.method === "DELETE") {
    await deleteRecord(collectionId, recordId);
    ok(response, { deleted: true });
    return;
  }

  const body = readJsonBody<SaveRecordBody>(request);
  if (!body.record) {
    throw new ApiError(400, "validation", "record is required.");
  }

  ok(response, await saveRecord(collectionId, recordId, body.record, body.expectedModifiedAt));
});
