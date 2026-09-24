/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { CmsBackend } from "./types";

const CmsBackendContext = createContext<CmsBackend | null>(null);

/** Injects the active `CmsBackend` (mock or REST) for `useCmsBackend` below. */
export function CmsBackendProvider({ backend, children }: { backend: CmsBackend; children: ReactNode }) {
  return <CmsBackendContext.Provider value={backend}>{children}</CmsBackendContext.Provider>;
}

export function useCmsBackend(): CmsBackend {
  const backend = useContext(CmsBackendContext);

  if (!backend) {
    throw new Error("useCmsBackend must be used within CmsBackendProvider");
  }

  return backend;
}
