import { ApiError, ok, withApi } from "../../../../_lib/http.js";
import { requireEditorSession } from "../../../../_lib/auth.js";
import { createTutorialMediaUrls } from "../../../../_lib/tutorial-media.js";

const readStringParam = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined);

/** GET /api/cms/tutorials/:tutorialId/media -> short-lived private media URLs */
export default withApi(["GET"], async (request, response) => {
  await requireEditorSession(request);

  const tutorialId = readStringParam(request.query.tutorialId);
  if (!tutorialId) {
    throw new ApiError(400, "invalid_query", "tutorialId is required.");
  }

  const includeSrt = request.query.includeSrt === "true";
  ok(response, await createTutorialMediaUrls(tutorialId, { includeSrt }));
});
