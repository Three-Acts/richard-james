import { useRef, useState } from "react";
import type { SubmitEvent } from "react";
import { apiUrl, type ApiEnvelope } from "../../lib/api-client";
import { Button } from "../ui/button";

/**
 * Interactive contact form — the demonstration island. It needs client-side
 * state, so it hydrates; the surrounding page stays static HTML. Self-contained
 * (no App context) and props are JSON-serializable, per island constraints.
 *
 * Posts to `POST /api/contact` (see `apps/api`). `action` also lands on the
 * real `<form>` element, so a submission still reaches the API (as a plain
 * form post) if JavaScript never hydrates.
 */
type ContactFormIslandProps = {
  action?: string;
};

type ContactResponse = { received: boolean; stored: boolean };

const GENERIC_ERROR = "Something went wrong. Try again.";

export function ContactFormIsland({ action = apiUrl("/contact") }: ContactFormIslandProps) {
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const honeypotRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    if (submittingRef.current) {
      return;
    }
    submittingRef.current = true;
    setStatus("submitting");
    setErrorMessage(null);

    try {
      const response = await fetch(action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Only an email field exists in this scaffold; the API contract
          // still needs name/message, so send sensible placeholders for them.
          name: "Website visitor",
          email,
          message: "Newsletter / contact request",
          website: honeypotRef.current?.value ?? ""
        })
      });

      let payload: ApiEnvelope<ContactResponse>;
      try {
        payload = (await response.json()) as ApiEnvelope<ContactResponse>;
      } catch {
        throw new Error(
          `The API returned an unreadable response (${response.status}). Check that the API server is running.`
        );
      }

      if (!response.ok || !payload.ok) {
        throw new Error(payload.ok === false ? payload.error.message : "API request failed.");
      }

      setStatus("done");
      setEmail("");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : GENERIC_ERROR);
    } finally {
      submittingRef.current = false;
    }
  }

  if (status === "done") {
    return (
      <p className="text-lg font-semibold" role="status">
        Thanks — we&apos;ll be in touch shortly.
      </p>
    );
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <form className="flex w-full flex-col gap-3 sm:flex-row" onSubmit={handleSubmit} action={action} method="post">
        <label className="sr-only" htmlFor="contact-email">
          Email address
        </label>
        <input
          id="contact-email"
          name="email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="min-h-11 flex-1 border border-white bg-transparent px-4 py-3 text-sm text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white"
        />
        {/* Honeypot: real visitors never see or focus this field. Bots that
            fill every input tip themselves off to the API. */}
        <input
          ref={honeypotRef}
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="sr-only"
        />
        <Button.Root type="submit" variant="light" disabled={status === "submitting"} className="w-fit">
          {status === "submitting" ? "Sending…" : "Get in touch"}
        </Button.Root>
      </form>
      {status === "error" ? (
        <p className="text-sm text-red-300" role="alert">
          {errorMessage ?? GENERIC_ERROR}
        </p>
      ) : null}
    </div>
  );
}

export default ContactFormIsland;
