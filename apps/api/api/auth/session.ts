import { extractBearerToken } from "../_lib/auth";
import { ApiError, ok, withApi } from "../_lib/http";
import { getSession } from "../_lib/neon-auth";

/** GET /api/auth/session  Authorization: Bearer <token> -> AuthSession (401 when invalid or expired) */
export default withApi(["GET"], async (request, response) => {
  const token = extractBearerToken(request);
  if (!token) {
    throw new ApiError(401, "unauthorized", "Unauthorized.");
  }

  const session = await getSession(token);
  if (!session) {
    throw new ApiError(401, "unauthorized", "Session is invalid or expired.");
  }

  ok(response, session);
});
