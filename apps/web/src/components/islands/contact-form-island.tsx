import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "../ui/button";

/**
 * Interactive contact form — the demonstration island. It needs client-side
 * state, so it hydrates; the surrounding page stays static HTML. Self-contained
 * (no App context) and props are JSON-serializable, per island constraints.
 *
 * Template stub: submits client-side. Wire the same-origin `/api/*` convention
 * (e.g. `POST /api/contact` in `apps/api`) to persist real submissions.
 */
type ContactFormIslandProps = {
  action?: string;
};

export function ContactFormIsland({ action }: ContactFormIslandProps) {
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [email, setEmail] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) {
      return;
    }

    setStatus("submitting");
    try {
      if (action) {
        const response = await fetch(action, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email })
        });
        if (!response.ok) {
          throw new Error("Request failed");
        }
      } else {
        // Template stub: no endpoint configured, resolve locally.
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
      setStatus("done");
      setEmail("");
    } catch {
      setStatus("error");
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
    <form className="flex w-full flex-col gap-3 sm:flex-row" onSubmit={handleSubmit} noValidate>
      <label className="sr-only" htmlFor="contact-email">
        Email address
      </label>
      <input
        id="contact-email"
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@example.com"
        className="min-h-11 flex-1 border border-white bg-transparent px-4 py-3 text-sm text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white"
      />
      <Button.Root type="submit" variant="light" disabled={status === "submitting"} className="w-fit">
        {status === "submitting" ? "Sending…" : "Get in touch"}
      </Button.Root>
      {status === "error" ? (
        <p className="text-sm text-red-300" role="alert">
          Something went wrong. Try again.
        </p>
      ) : null}
    </form>
  );
}

export default ContactFormIsland;
