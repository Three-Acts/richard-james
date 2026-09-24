import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";
import { AuthProvider } from "./auth/auth-provider";
import { mockAuthClient } from "./auth/mock-auth-client";
import { CmsBackendProvider } from "./cms/backend-context";
import { resolveCmsBackend } from "./cms/resolve-backend";
import "./styles.css";

const cmsBackend = resolveCmsBackend();

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <AuthProvider client={mockAuthClient}>
      <CmsBackendProvider backend={cmsBackend}>
        <App />
      </CmsBackendProvider>
    </AuthProvider>
  </StrictMode>
);
