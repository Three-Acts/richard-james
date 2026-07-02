import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

/**
 * Full-app SPA entry. Injected only into client-route shells (empty #root), so
 * it mounts fresh with createRoot rather than hydrating.
 */
createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
