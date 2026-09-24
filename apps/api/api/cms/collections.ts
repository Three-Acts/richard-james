import { ok, withApi } from "../_lib/http";
import { requireAuth } from "../_lib/auth";
import { listCollections } from "../_lib/cms/service";

/** GET /api/cms/collections -> CmsCollectionSummary[] */
export default withApi(["GET"], async (request, response) => {
  await requireAuth(request);
  ok(response, await listCollections());
});
