import { ok, withApi } from "../../_lib/http.js";
import { requireAuth } from "../../_lib/auth.js";
import { listCollections } from "../../_lib/cms/service.js";

/** GET /api/cms/collections -> CmsCollectionSummary[] */
export default withApi(["GET"], async (request, response) => {
  await requireAuth(request);
  ok(response, await listCollections());
});
