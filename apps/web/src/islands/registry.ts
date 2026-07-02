import type { ComponentType } from "react";

/**
 * Island registry: maps an island name to a lazy loader. Each entry is a
 * dynamic import so Vite emits a separate chunk per island — the client only
 * downloads the chunks for islands actually present on the page.
 *
 * To add an island:
 *   1. Build a self-contained component (no App context/providers) whose props
 *      are JSON-serializable.
 *   2. Register it here.
 *   3. Render it with `<Island name="..." props={...} component={...} />`.
 */
export const islandRegistry: Record<string, () => Promise<{ default: ComponentType<Record<string, unknown>> }>> = {
  "contact-form": () => import("../components/islands/contact-form-island")
};

export type IslandName = keyof typeof islandRegistry;
