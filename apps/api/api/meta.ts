import { ok, withApi } from "./_lib/http";

export default withApi(["GET"], (_request, response) => {
  ok(response, {
    service: "three-acts-api",
    description: "Server-side bridge for CMS, web, integrations, and automations.",
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development"
  });
});
