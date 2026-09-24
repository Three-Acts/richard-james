import type { SignInBody } from "../../_lib/schema.js";
import { ApiError, ok, readJsonBody, withApi } from "../../_lib/http.js";
import { signInWithEmail } from "../../_lib/neon-auth.js";

/** POST /api/auth/sign-in  body { email, password } -> AuthSession */
export default withApi(["POST"], async (request, response) => {
  const body = readJsonBody<SignInBody>(request);

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) {
    throw new ApiError(400, "validation", "email and password are required.");
  }

  ok(response, await signInWithEmail(email, password));
});
