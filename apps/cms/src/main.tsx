import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";
import { apiAuthClient } from "./auth/api-auth-client";
import { AuthProvider } from "./auth/auth-provider";
import { CmsBackendProvider } from "./cms/backend-context";
import { createRestCmsBackend } from "./cms/rest-backend";
import { apiFetch } from "./lib/api-client";
import "./styles.css";

// The CMS talks to the real API only: `apps/api`'s `/api/cms/*` routes for
// data and storage, `/api/auth/*` (Neon Auth) for editor sign-in.
const cmsBackend = createRestCmsBackend({ apiFetch });
const authClient = apiAuthClient;

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <AuthProvider client={authClient}>
      <CmsBackendProvider backend={cmsBackend}>
        <App />
      </CmsBackendProvider>
    </AuthProvider>
  </StrictMode>
);
