import { ApiError, ok, withApi } from "./_lib/http";
import { getServiceClient } from "./_lib/supabase";

type ContactPayload = {
  name?: unknown;
  email?: unknown;
  message?: unknown;
  website?: unknown;
};

// Reasonable, not exhaustive: rejects obviously-malformed addresses without
// trying to fully validate the email spec.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const parseBody = (body: unknown): ContactPayload => {
  if (typeof body === "string") {
    if (!body) {
      return {};
    }

    try {
      return JSON.parse(body) as ContactPayload;
    } catch {
      throw new ApiError(400, "validation_error", "Request body is not valid JSON.");
    }
  }

  if (body && typeof body === "object") {
    return body as ContactPayload;
  }

  return {};
};

/**
 * POST /api/contact — public contact form submission.
 *
 * `website` is a honeypot: real visitors never fill it in, so any non-empty
 * value short-circuits as a normal-looking success without doing anything.
 * Stores to Supabase (`form_submissions`) when configured; otherwise
 * acknowledges receipt without persisting.
 */
export default withApi(["POST"], async (request, response) => {
  const payload = parseBody(request.body);

  const website = typeof payload.website === "string" ? payload.website.trim() : "";
  if (website) {
    ok(response, { received: true, stored: false });
    return;
  }

  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  if (!name || name.length > 200) {
    throw new ApiError(400, "validation_error", "name must be between 1 and 200 characters.");
  }

  const email = typeof payload.email === "string" ? payload.email.trim() : "";
  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) {
    throw new ApiError(400, "validation_error", "email must be a valid email address.");
  }

  const message = typeof payload.message === "string" ? payload.message.trim() : "";
  if (!message || message.length > 5000) {
    throw new ApiError(400, "validation_error", "message must be between 1 and 5000 characters.");
  }

  const client = getServiceClient();
  if (!client) {
    ok(response, { received: true, stored: false });
    return;
  }

  const { error: insertError } = await client.from("form_submissions").insert({
    submitted_by: name,
    email,
    message,
    source: "website",
    consent: false,
    submitted_at: new Date().toISOString()
  });

  if (insertError) {
    throw insertError;
  }

  ok(response, { received: true, stored: true });
});
