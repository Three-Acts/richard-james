import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";
import { AuthProvider } from "./auth/auth-provider";
import { mockAuthClient } from "./auth/mock-auth-client";
import "./styles.css";

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <AuthProvider client={mockAuthClient}>
      <App />
    </AuthProvider>
  </StrictMode>
);
