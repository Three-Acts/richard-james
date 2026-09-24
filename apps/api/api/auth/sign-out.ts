import { extractBearerToken, forgetSessionToken } from "../_lib/auth";
import { ApiError, ok, withApi } from "../_lib/http";
import { signOut } from "../_lib/neon-auth";

/** POST /api/auth/sign-out  Authorization: Bearer <token> -> { signedOut: true } */
export default withApi(["POST"], async (request, response) => {
  const token = extractBearerToken(request);
  if (!token) {
    throw new ApiError(401, "unauthorized", "Unauthorized.");
  }

  // Evict first so a request racing this sign-out never reuses a cache entry
  // written between the Neon Auth call below and the eviction; also covers
  // the (unlikely) case where signOut throws — the local cache no longer
  // trusts the token either way.
  forgetSessionToken(token);
  await signOut(token);
  ok(response, { signedOut: true });
});
