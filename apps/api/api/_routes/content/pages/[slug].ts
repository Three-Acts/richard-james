import { getPageContentBySlug } from "../../../_lib/content";
import { ApiError, ok, withApi } from "../../../_lib/http";

const readStringParam = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined);

/** GET /api/content/pages/:slug -> PageContent. Public, unauthenticated. */
export default withApi(["GET"], async (request, response) => {
  const slug = readStringParam(request.query.slug);
  if (!slug) {
    throw new ApiError(400, "invalid_query", "slug is required.");
  }

  response.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  ok(response, await getPageContentBySlug(slug));
});
