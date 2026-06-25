import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { AuthProvider } from "./auth/AuthProvider";
import { mockAuthClient } from "./auth/mockAuthClient";
import "./styles.css";

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <AuthProvider client={mockAuthClient}>
      <App />
    </AuthProvider>
  </StrictMode>
);
