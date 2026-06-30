import { ok, withApi } from "./_lib/http";

export default withApi(["GET"], (_request, response) => {
  ok(response, {
    service: "three-acts-api",
    status: "healthy",
    timestamp: new Date().toISOString()
  });
});
