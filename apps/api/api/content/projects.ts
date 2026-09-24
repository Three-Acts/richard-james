import { listProjectsContent } from "../_lib/content";
import { ok, withApi } from "../_lib/http";

/** GET /api/content/projects -> ProjectContent[] (sortOrder asc, images embedded). Public, unauthenticated. */
export default withApi(["GET"], async (_request, response) => {
  response.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  ok(response, await listProjectsContent());
});
