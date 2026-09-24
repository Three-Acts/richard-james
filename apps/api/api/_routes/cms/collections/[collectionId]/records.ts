import type { CreateRecordBody, ListRecordsOptions } from "@three-acts/cms-schema";
import { ApiError, ok, readJsonBody, withApi } from "../../../../_lib/http";
import { requireAuth } from "../../../../_lib/auth";
import { createRecord, listRecords } from "../../../../_lib/cms/service";

const MAX_LIMIT = 500;

const readStringParam = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined);

/** Non-negative, safe-integer query params only: no `-`, no overflow past `Number.MAX_SAFE_INTEGER`. */
const readIntParam = (value: unknown, name: string): number | undefined => {
  const raw = readStringParam(value);
  if (raw === undefined) {
    return undefined;
  }

  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw))) {
    throw new ApiError(400, "invalid_query", `${name} must be a non-negative integer.`);
  }

  return Number(raw);
};

/**
 * GET  /api/cms/collections/:collectionId/records?search&sortKey&sortDirection&limit&offset&fields -> ListRecordsResult
 * POST /api/cms/collections/:collectionId/records  body CreateRecordBody -> CmsRecord
 */
export default withApi(["GET", "POST"], async (request, response) => {
  await requireAuth(request);

  const collectionId = readStringParam(request.query.collectionId);
  if (!collectionId) {
    throw new ApiError(400, "invalid_query", "collectionId is required.");
  }

  if (request.method === "GET") {
    const search = readStringParam(request.query.search);
    const sortKey = readStringParam(request.query.sortKey);
    const sortDirectionRaw = readStringParam(request.query.sortDirection);
    const fieldsRaw = readStringParam(request.query.fields);

    if (sortDirectionRaw !== undefined && sortDirectionRaw !== "asc" && sortDirectionRaw !== "desc") {
      throw new ApiError(400, "invalid_query", "sortDirection must be 'asc' or 'desc'.");
    }
    if (fieldsRaw !== undefined && fieldsRaw !== "list" && fieldsRaw !== "all") {
      throw new ApiError(400, "invalid_query", "fields must be 'list' or 'all'.");
    }

    const rawLimit = readIntParam(request.query.limit, "limit");
    const limit = rawLimit !== undefined ? Math.min(rawLimit, MAX_LIMIT) : undefined;
    const offset = readIntParam(request.query.offset, "offset");

    const options: ListRecordsOptions = {
      search: search || undefined,
      sort: sortKey ? { key: sortKey, direction: sortDirectionRaw === "asc" ? "asc" : "desc" } : undefined,
      limit,
      offset,
      // Absent stays "all" for backwards compatibility with existing callers.
      fields: fieldsRaw === "list" ? "list" : "all"
    };

    ok(response, await listRecords(collectionId, options));
    return;
  }

  const body = readJsonBody<CreateRecordBody>(request);
  ok(response, await createRecord(collectionId, body.values));
});
