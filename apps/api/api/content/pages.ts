import { listPagesContent } from "../_lib/content";
import { ok, withApi } from "../_lib/http";

/** GET /api/content/pages -> PageContent[]. Public, unauthenticated. */
export default withApi(["GET"], async (_request, response) => {
  response.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  ok(response, await listPagesContent());
});
