import { useEffect, useState } from "react";
import { Section } from "../components/layout/section";
import { Typography } from "../components/ui/typography";
import { apiFetch } from "../lib/api-client";

type Meta = {
  service: string;
  description: string;
  environment: string;
};

/**
 * Example client route (`renderMode: "client"`). It is not prerendered with
 * data — it ships as an SPA shell and fetches live data at runtime. Use this
 * pattern for authenticated / per-user pages (login, account, dashboard,
 * checkout) that must not be baked into static HTML.
 */
export function DashboardPage() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Meta>("/meta")
      .then(setMeta)
      .catch((nextError: Error) => setError(nextError.message));
  }, []);

  return (
    <Section.Root className="py-20">
      <Section.Container className="max-w-3xl">
        <Typography.Eyebrow>Client route</Typography.Eyebrow>
        <h1 className="mt-5 text-5xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-6 text-lg leading-8 text-neutral-700">
          This page runs entirely in the browser and fetches live data from the API.
        </p>

        <div className="mt-10 border border-black p-6">
          {error ? (
            <p className="text-red-700">Failed to load API: {error}</p>
          ) : meta ? (
            <dl className="grid gap-3 text-sm">
              <div className="flex justify-between gap-6">
                <dt className="font-semibold">Service</dt>
                <dd className="text-neutral-700">{meta.service}</dd>
              </div>
              <div className="flex justify-between gap-6">
                <dt className="font-semibold">Environment</dt>
                <dd className="text-neutral-700">{meta.environment}</dd>
              </div>
              <div className="flex justify-between gap-6">
                <dt className="font-semibold">Description</dt>
                <dd className="max-w-md text-right text-neutral-700">{meta.description}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-neutral-500">Loading live data…</p>
          )}
        </div>
      </Section.Container>
    </Section.Root>
  );
}
